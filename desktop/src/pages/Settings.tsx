/**
 * ScamShield Desktop — Settings Page
 */
import { useState } from "react";
import { Monitor, Moon, Sun, HelpCircle } from "lucide-react";
import { useAuth } from "../store/auth";
import { getTheme, setTheme, getApiBase, setApiBase } from "../store/storage";
import { resetApiBaseCache } from "../api/client";

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const [theme, setThemeState] = useState<"light" | "dark" | "system">(() => getTheme());
  const [apiBase, setApiBaseInput] = useState(() => getApiBase());
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const handleThemeChange = (t: "light" | "dark" | "system") => {
    setThemeState(t);
    setTheme(t);
  };

  const handleApiBaseSave = () => {
    const trimmed = apiBase.trim().replace(/\/+$/, "");
    if (!trimmed) return;
    try {
      new URL(trimmed); // validate as URL
      setApiBase(trimmed);
      resetApiBaseCache();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Customize your ScamShield desktop experience</p>
      </div>

      {/* Account */}
      <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Account</h2>
        {isAuthenticated && user ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Email</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{user.email}</span>
            </div>
            {user.name && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Name</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{user.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Member since</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">Not signed in</p>
        )}
      </div>

      {/* Appearance */}
      <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
        <div className="flex gap-2">
          {[
            { key: "light" as const, label: "Light", icon: Sun },
            { key: "dark" as const, label: "Dark", icon: Moon },
            { key: "system" as const, label: "System", icon: Monitor },
          ].map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => handleThemeChange(opt.key)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  isActive
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* API Configuration */}
      <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">API Configuration</h2>
          <span className="group relative">
            <HelpCircle className="w-4 h-4 text-gray-400" />
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-gray-900 text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap">
              Override the default API endpoint
            </span>
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Current: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{apiBase || "https://scamshield.app"}</code>
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="https://scamshield.app"
            value={apiBase}
            onChange={(e) => setApiBaseInput(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleApiBaseSave}
            disabled={!apiBase.trim()}
            className="px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saveStatus === "saved" ? "Saved" : "Save"}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {saveStatus === "saved"
            ? "API base updated. Changes apply on next request."
            : saveStatus === "error"
            ? "Please enter a valid URL."
            : "Override the default API endpoint. Changes apply immediately."}
        </p>
      </div>

      {/* About */}
      <div className="p-4 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-2">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">About</h2>
        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
          <p><span className="font-medium">ScamShield Desktop</span> — Windows desktop client</p>
          <p>Version: 1.0.0</p>
          <p>Built with Tauri v2 · React 19 · TypeScript</p>
        </div>
      </div>
    </div>
  );
}
