"use client";

import { useState } from "react";
import { Edit2, Check, X, RotateCcw } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/privacy";
import type { AssetReturn } from "@/lib/projection-v2";
import type { PortfolioBreakdown } from "@/lib/portfolio-calculator";
import { useFinanceStore } from "@/store/finance-store";

interface AssetReturnEditorProps {
  holdings: PortfolioBreakdown[];
  assetReturns: Map<string, AssetReturn>;
  onUpdateReturn: (symbol: string, newReturn: number) => void;
  privacyMode: boolean;
}

export function AssetReturnEditor({
  holdings,
  assetReturns,
  onUpdateReturn,
  privacyMode,
}: AssetReturnEditorProps) {
  const { customAssetReturns, clearCustomAssetReturn } = useFinanceStore();
  const [editingSymbol, setEditingSymbol] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (symbol: string, currentReturn: number) => {
    setEditingSymbol(symbol);
    setEditValue((currentReturn * 100).toFixed(1));
  };

  const saveEdit = (symbol: string) => {
    const newReturn = parseFloat(editValue) / 100;
    if (!isNaN(newReturn) && newReturn >= -50 && newReturn <= 100) {
      onUpdateReturn(symbol, newReturn);
    }
    setEditingSymbol(null);
  };

  const cancelEdit = () => {
    setEditingSymbol(null);
    setEditValue("");
  };

  const resetToDefault = (symbol: string) => {
    clearCustomAssetReturn(symbol);
    window.location.reload(); // Simple way to reload with defaults
  };

  // Filter out cash holdings
  const investmentHoldings = holdings.filter(h => h.type !== "cash");

  if (investmentHoldings.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <h2 className="text-lg font-semibold mb-4">Asset Returns & Allocation</h2>
      
      <div className="space-y-2">
        {investmentHoldings.map((holding, index) => {
          const assetReturn = assetReturns.get(holding.symbol);
          const expectedReturn = assetReturn?.expectedReturn || 0;
          const isEditing = editingSymbol === holding.symbol;
          const hasCustomReturn = customAssetReturns[holding.symbol] !== undefined;
          // Use unique key combining symbol, type, and index to avoid duplicates
          const uniqueKey = `${holding.symbol}_${holding.type}_${index}`;
          
          return (
            <div
              key={uniqueKey}
              className="flex items-center justify-between p-3 rounded-md bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{holding.symbol}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    holding.type === "etf"
                      ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      : holding.type === "crypto"
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                      : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>
                    {holding.type.toUpperCase()}
                  </span>
                  {hasCustomReturn && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      CUSTOM
                    </span>
                  )}
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  {formatCurrency(holding.value, "EUR", privacyMode)}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {isEditing ? (
                  <>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="-50"
                        max="100"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20 px-2 py-1 text-sm rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit(holding.symbol);
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <span className="text-sm">%</span>
                    </div>
                    <button
                      onClick={() => saveEdit(holding.symbol)}
                      className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        Expected: {formatPercent(expectedReturn * 100, privacyMode)}
                      </div>
                      {assetReturn?.volatility && (
                        <div className="text-xs text-zinc-500">
                          Vol: {(assetReturn.volatility * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(holding.symbol, expectedReturn)}
                      className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                      title="Edit expected return"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                      {hasCustomReturn && (
                        <button
                          onClick={() => resetToDefault(holding.symbol)}
                          className="p-1 rounded hover:bg-orange-100 dark:hover:bg-orange-900/20 text-orange-600 dark:text-orange-400"
                          title="Reset to default"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 text-xs text-zinc-500 space-y-1">
        <p><strong>Tip:</strong> Click the edit icon to customize expected returns. Custom values are saved and persist across sessions.</p>
        <p>Click the reset icon <RotateCcw className="inline h-3 w-3" /> to restore default values.</p>
        <p><strong>Scenarios:</strong> Conservative: 60% of expected | Realistic: As shown | Optimistic: 140% of expected</p>
      </div>
    </div>
  );
}

