"use client";

import { useState } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { parseRevolutCSV, transactionsToPositions, validateRevolutCSV } from "@/lib/integrations/revolut";
import type { PortfolioOwner } from "@/types/finance";
import { Upload, AlertCircle, CheckCircle2, FileText } from "lucide-react";

interface RevolutImportProps {
  owner: PortfolioOwner;
  onClose: () => void;
}

export function RevolutImport({ owner, onClose }: RevolutImportProps) {
  const addStock = useFinanceStore((s) => s.addStock);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) {
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selectedFile);
    setError(null);
    setSuccess(null);

    try {
      const content = await selectedFile.text();
      const validation = validateRevolutCSV(content);
      
      if (!validation.valid) {
        setError(validation.error || "Invalid CSV format");
        setPreview(null);
        return;
      }

      const transactions = parseRevolutCSV(content);
      setPreview(`Found ${transactions.length} transactions (${transactions.filter(t => t.type === "BUY").length} buys, ${transactions.filter(t => t.type === "SELL").length} sells)`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
      setPreview(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      const content = await file.text();
      const transactions = parseRevolutCSV(content);
      const positions = transactionsToPositions(transactions, owner);

      if (positions.length === 0) {
        setError("No active positions found in CSV (all positions may have been sold)");
        setImporting(false);
        return;
      }

      // Add each position to the store
      positions.forEach((position) => {
        addStock({
          symbol: position.symbol,
          shares: position.shares,
          costBasis: position.costBasis,
          purchaseDateISO: position.purchaseDateISO,
          type: position.type,
          owner,
        });
      });

      setSuccess(`Successfully imported ${positions.length} position(s) from Revolut`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to import positions");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Import from Revolut
          </h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Upload your Revolut account statement (CSV format)
          </p>
        </div>

        <div className="p-6 space-y-4">
          {/* Instructions */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 text-sm space-y-2">
            <p className="font-medium text-blue-900 dark:text-blue-300">How to export from Revolut:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-400 text-xs">
              <li>Open Revolut app → Investments tab</li>
              <li>Tap Settings (gear icon) → Statements</li>
              <li>Select date range → Export as CSV</li>
              <li>Upload the CSV file here</li>
            </ol>
          </div>

          {/* File Input */}
          <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg p-8 cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
              disabled={importing}
            />
            <Upload className="h-10 w-10 text-zinc-400 mb-3" />
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {file ? file.name : "Choose CSV file"}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Revolut account statement (CSV format)
            </p>
          </label>

          {/* Preview */}
          {preview && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800 dark:text-green-300">
                {preview}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800 dark:text-red-300">
                {error}
              </div>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-800 dark:text-green-300">
                {success}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
              disabled={importing}
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || importing || !!error}
              className="flex-1 px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? "Importing..." : "Import Positions"}
            </button>
          </div>

          {/* Info Note */}
          <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <p className="font-medium">ℹ️ Notes:</p>
            <p>• This will add positions to your {owner === "simon" ? "Simon" : owner === "carolina" ? "Carolina" : "household"} portfolio</p>
            <p>• Average cost basis is calculated from BUY transactions</p>
            <p>• Duplicate positions will be created (you can merge manually if needed)</p>
            <p>• Cash balance is not imported (add manually as a Cash position)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

