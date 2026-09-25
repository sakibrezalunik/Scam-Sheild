/**
 * ScamShield Desktop — History Page
 */
import { useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";
import { useNavigate } from "../hooks/useNavigate";
import { getScan } from "../api/client";
import { getScanHistory, removeScanFromHistory, clearScanHistory, addScanToHistory } from "../store/storage";
import type { ScanHistoryItem } from "../types";

export default function HistoryPage() {
  const { navigate } = useNavigate();
  const [history, setHistory] = useState<ScanHistoryItem[]>(() => getScanHistory());
  const [refreshing, setRefreshing] = useState<string | null>(null);

  const handleClick = async (item: ScanHistoryItem) => {
    try {
      const res = await getScan(item.id);
      if (res.success && res.data) {
        navigate({ kind: "results", id: item.id });
      } else {
        // Fall back to local cached data
        navigate({ kind: "results", id: item.id });
      }
    } catch {
      navigate({ kind: "results", id: item.id });
    }
  };

  const handleDelete = (id: string) => {
    removeScanFromHistory(id);
    setHistory(getScanHistory());
  };

  const handleClearAll = () => {
    clearScanHistory();
    setHistory([]);
  };

  const handleRefresh = async (item: ScanHistoryItem) => {
    setRefreshing(item.id);
    try {
      const res = await getScan(item.id);
      if (res.success && res.data) {
        // Update in local storage
        const updated: ScanHistoryItem = {
          id: res.data.id,
          scanType: res.data.scanType,
          inputPreview: res.data.inputPreview,
          riskScore: res.data.riskScore,
          riskLevel: res.data.riskLevel,
          category: res.data.category,
          summary: res.data.summary,
          createdAt: res.data.createdAt,
        };
        // Re-add to update
        addScanToHistory(updated);
        setHistory(getScanHistory());
      }
    } catch {
      // ignore
    } finally {
      setRefreshing(null);
    }
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto">
          <RefreshCw className="w-6 h-6 text-gray-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">No scan history yet</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Your scans will appear here after you analyze something.</p>
        </div>
        <button
          onClick={() => navigate({ kind: "scan" })}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
        >
          Start Scanning
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Scan History</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{history.length} scans saved locally</p>
        </div>
        <button
          onClick={handleClearAll}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" /> Clear All
        </button>
      </div>

      <div className="space-y-2">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
          >
            {/* Risk indicator */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getRiskBg(item.riskLevel)}`}>
              <span className="text-sm font-bold">{item.riskScore ?? "?"}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleClick(item)}>
              <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                {item.inputPreview ?? "No input preview"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {item.scanType} · {formatDate(item.createdAt)}
                {item.category && ` · ${item.category}`}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleRefresh(item); }}
                disabled={refreshing === item.id}
                className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                title="Refresh from server"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing === item.id ? "animate-spin" : ""}`} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getRiskBg(level: string | null): string {
  switch (level) {
    case "critical":
      return "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400";
    case "high":
      return "bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-400";
    case "moderate":
      return "bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400";
    case "low":
      return "bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-400";
    default:
      return "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300";
  }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}
