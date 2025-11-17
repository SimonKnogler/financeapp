"use client";

import { useState } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { uploadToCloud, downloadFromCloud, getLastSyncTime } from "@/lib/cloud-sync";
import { Cloud, CloudUpload, CloudDownload, RefreshCw } from "lucide-react";

export function CloudSync() {
  const [uploading, setUploading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Get all store data
  const accounts = useFinanceStore((s) => s.accounts);
  const stocks = useFinanceStore((s) => s.stocks);
  const expenses = useFinanceStore((s) => s.expenses);
  const incomes = useFinanceStore((s) => s.incomes);
  const goals = useFinanceStore((s) => s.goals);
  const portfolioHistory = useFinanceStore((s) => s.portfolioHistory);
  const portfolioAccounts = useFinanceStore((s) => s.portfolioAccounts);
  const assumptions = useFinanceStore((s) => s.assumptions);
  const customAssetReturns = useFinanceStore((s) => s.customAssetReturns);
  const documents = useFinanceStore((s) => s.documents);
  const mortgageScenarios = useFinanceStore((s) => s.mortgageScenarios);
  
  // Get store actions
  const replaceWithCloudData = useFinanceStore((s) => s.replaceWithCloudData);

  async function checkLastSync() {
    try {
      const syncTime = await getLastSyncTime();
      setLastSync(syncTime);
    } catch (error) {
      console.error("Failed to check last sync:", error);
    }
  }

  async function handleUpload() {
    if (!confirm("This will upload your current data to the cloud and overwrite any existing cloud data. Continue?")) {
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const result = await uploadToCloud({
        accounts,
        portfolioAccounts,
        stocks,
        expenses,
        incomes,
        goals,
        portfolioHistory,
        assumptions,
        customAssetReturns,
        documents,
        mortgageScenarios,
      });
      if (result.skipped) {
        setMessage({ type: "success", text: "ℹ️ No changes detected — cloud data already up to date." });
      } else {
        setMessage({ type: "success", text: "✅ Data uploaded to cloud successfully!" });
        checkLastSync();
      }
    } catch (error: any) {
      setMessage({ type: "error", text: `❌ Upload failed: ${error.message}` });
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload() {
    if (!confirm("This will download data from the cloud and replace your current local data. Continue?")) {
      return;
    }

    setDownloading(true);
    setMessage(null);

    try {
      const cloudData = await downloadFromCloud();
 
      if (!cloudData) {
        setMessage({ type: "error", text: "⚠️ No cloud data found yet. Upload from one device to create it." });
      } else {
        replaceWithCloudData(cloudData);
        setMessage({ type: "success", text: "✅ Data downloaded from cloud successfully!" });
        checkLastSync();
      }
    } catch (error: any) {
      setMessage({ type: "error", text: `❌ Download failed: ${error.message}` });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
        <Cloud size={16} />
        <span className="text-sm">Cloud Sync</span>
      </div>

      <div className="text-xs text-zinc-500 dark:text-zinc-400">
        <p className="mb-2">
          🔄 Changes now sync in real time for everyone using the same account. Keep both browsers open and edits will appear automatically.
        </p>
        <p>
          <strong>Manual actions:</strong> Upload immediately pushes your current data to the cloud. Download is still available as a force-refresh if you were offline.
        </p>
      </div>

      {lastSync && (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Last synced: {lastSync.toLocaleString()}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleUpload}
          disabled={uploading || downloading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <CloudUpload size={16} />
              Upload to Cloud
            </>
          )}
        </button>

        <button
          onClick={handleDownload}
          disabled={uploading || downloading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <CloudDownload size={16} />
              Download from Cloud
            </>
          )}
        </button>
      </div>

      <button
        onClick={checkLastSync}
        className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
      >
        Check last sync time
      </button>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

