/**
 * ScamShield Desktop — Navbar
 */
import { Search, Clock, Home, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../store/auth";
import { useApp } from "../store/app";
import { useNavigate } from "../hooks/useNavigate";
import { useState } from "react";
import Logo from "./Logo";

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { view } = useApp();
  const { navigate } = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate({ kind: "home" });
    setMobileOpen(false);
  };

  const navItems = [
    { kind: "home" as const, label: "Home", icon: Home },
    { kind: "scan" as const, label: "Scan", icon: Search },
    { kind: "history" as const, label: "History", icon: Clock },
    { kind: "settings" as const, label: "Settings", icon: Settings },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 dark:bg-gray-900 dark:border-gray-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <button
            onClick={() => navigate({ kind: "home" })}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700"
          >
            <Logo />
          </button>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = view.kind === item.kind;
              return (
                <button
                  key={item.kind}
                  onClick={() => navigate({ kind: item.kind })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Auth area */}
          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate({ kind: "login" })}
                className="hidden md:inline-flex px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Sign In
              </button>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="px-4 py-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = view.kind === item.kind;
              return (
                <button
                  key={item.kind}
                  onClick={() => {
                    navigate({ kind: item.kind });
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
            {isAuthenticated && user && (
              <>
                <div className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                  Signed in as {user.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </>
            )}
            {!isAuthenticated && (
              <button
                onClick={() => {
                  navigate({ kind: "login" });
                  setMobileOpen(false);
                }}
                className="w-full px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
