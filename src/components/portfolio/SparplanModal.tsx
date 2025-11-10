"use client";

import { useState } from "react";
import { useFinanceStore } from "@/store/finance-store";
import type { StockHolding, SparplanConfig } from "@/types/finance";
import { X } from "lucide-react";

interface SparplanModalProps {
  stock: StockHolding;
  onClose: () => void;
}

export function SparplanModal({ stock, onClose }: SparplanModalProps) {
  const toggleSparplan = useFinanceStore((s) => s.toggleSparplan);
  
  const [monthlyAmount, setMonthlyAmount] = useState(
    stock.sparplan?.monthlyAmount?.toString() || "100"
  );
  const [executionDay, setExecutionDay] = useState(
    stock.sparplan?.executionDay?.toString() || "1"
  );
  const [startDateISO, setStartDateISO] = useState(
    stock.sparplan?.startDateISO || new Date().toISOString().split("T")[0]
  );
  const [endDateISO, setEndDateISO] = useState(stock.sparplan?.endDateISO || "");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const config: SparplanConfig = {
      active: true,
      monthlyAmount: parseFloat(monthlyAmount) || 100,
      executionDay: parseInt(executionDay) || 1,
      startDateISO,
      endDateISO: endDateISO || undefined,
    };
    toggleSparplan(stock.id, config);
    onClose();
  }

  function handleDisable() {
    toggleSparplan(stock.id, { active: false });
    onClose();
  }

  const isActive = stock.sparplan?.active;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">
            Sparplan: {stock.symbol}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Monthly Investment Amount (EUR)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
              placeholder="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Execution Day of Month (1-28)
            </label>
            <input
              type="number"
              min="1"
              max="28"
              required
              value={executionDay}
              onChange={(e) => setExecutionDay(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
              placeholder="1"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Day of the month when investment is executed
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              required
              value={startDateISO}
              onChange={(e) => setStartDateISO(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              End Date (Optional)
            </label>
            <input
              type="date"
              value={endDateISO}
              onChange={(e) => setEndDateISO(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
            />
            <p className="text-xs text-zinc-500 mt-1">
              Leave empty for indefinite sparplan
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 font-medium"
            >
              {isActive ? "Update Sparplan" : "Activate Sparplan"}
            </button>
            {isActive && (
              <button
                type="button"
                onClick={handleDisable}
                className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 py-2 font-medium"
              >
                Deactivate
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

