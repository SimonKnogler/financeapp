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
  const assumptions = useFinanceStore((s) => s.assumptions);
  const customAssetReturns = useFinanceStore((s) => s.customAssetReturns);
  
  // Get store actions
  const addStock = useFinanceStore((s) => s.addStock);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const addIncome = useFinanceStore((s) => s.addIncome);
  const addGoal = useFinanceStore((s) => s.addGoal);
  const addPortfolioSnapshot = useFinanceStore((s) => s.addPortfolioSnapshot);
  const setAssumptions = useFinanceStore((s) => s.setAssumptions);
  const setCustomAssetReturn = useFinanceStore((s) => s.setCustomAssetReturn);
  const resetAll = useFinanceStore((s) => s.resetAll);

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
      await uploadToCloud({
        accounts,
        stocks,
        expenses,
        incomes,
        goals,
        portfolioHistory,
        assumptions,
        customAssetReturns,
      });
      setMessage({ type: "success", text: "✅ Data uploaded to cloud successfully!" });
      checkLastSync();
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
      
      // Reset store with cloud data
      resetAll();
      
      // Populate with cloud data
      cloudData.stocks.forEach(stock => addStock(stock as any));
      cloudData.expenses.forEach(expense => addExpense(expense as any));
      cloudData.incomes.forEach(income => addIncome(income as any));
      cloudData.goals.forEach(goal => addGoal(goal as any));
      cloudData.portfolioHistory.forEach(snap => addPortfolioSnapshot(snap as any));
      setAssumptions(cloudData.assumptions);
      
      // Set custom returns
      Object.entries(cloudData.customAssetReturns).forEach(([symbol, expectedReturn]) => {
        setCustomAssetReturn(symbol, expectedReturn);
      });

      setMessage({ type: "success", text: "✅ Data downloaded from cloud successfully!" });
      
      // Reload page to ensure everything is fresh
      setTimeout(() => window.location.reload(), 1500);
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
          💡 Sync your data to share it with your partner. Both of you should use the same login account.
        </p>
        <p>
          <strong>How it works:</strong> Upload saves your current data to the cloud. Download loads the cloud data to your device.
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

