"use client";

import { useState, useEffect } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { formatCurrency } from "@/lib/privacy";
import type { IncomeItem, GoalAllocation } from "@/types/finance";
import { X, Plus, Trash2 } from "lucide-react";

interface AllocationModalProps {
  income: IncomeItem;
  onClose: () => void;
}

export function AllocationModal({ income, onClose }: AllocationModalProps) {
  const updateIncome = useFinanceStore((s) => s.updateIncome);
  const goals = useFinanceStore((s) => s.goals);
  const privacyMode = useFinanceStore((s) => s.privacyMode);
  
  const [allocations, setAllocations] = useState<GoalAllocation[]>(
    income.goalAllocations || []
  );
  
  // Calculate monthly amount
  const monthlyAmount = income.frequency === "monthly" 
    ? income.amount 
    : income.frequency === "yearly"
    ? income.amount / 12
    : 0;

  const totalAllocated = allocations.reduce((sum, a) => sum + a.percentage, 0);
  const unallocated = 100 - totalAllocated;

  const addAllocation = () => {
    if (goals.length === 0) return;
    
    // Find first goal not already allocated
    const allocatedGoalIds = new Set(allocations.map(a => a.goalId));
    const unallocatedGoal = goals.find(g => !allocatedGoalIds.has(g.id));
    
    if (unallocatedGoal) {
      setAllocations([...allocations, { goalId: unallocatedGoal.id, percentage: 0 }]);
    }
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, updates: Partial<GoalAllocation>) => {
    const newAllocations = [...allocations];
    newAllocations[index] = { ...newAllocations[index], ...updates };
    setAllocations(newAllocations);
  };

  const handleSave = () => {
    // Filter out allocations with 0 percentage
    const validAllocations = allocations.filter(a => a.percentage > 0);
    updateIncome(income.id, { goalAllocations: validAllocations });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold">Allocate Income to Goals</h2>
            <p className="text-sm text-zinc-500">{income.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Income Summary */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4">
            <div className="text-sm text-blue-900 dark:text-blue-300 mb-2">
              Monthly Income Amount
            </div>
            <div className="text-2xl font-semibold text-blue-600 dark:text-blue-400">
              {formatCurrency(monthlyAmount, "EUR", privacyMode)}/month
            </div>
            {income.frequency === "yearly" && (
              <div className="text-xs text-blue-700 dark:text-blue-500 mt-1">
                ({formatCurrency(income.amount, "EUR", privacyMode)}/year)
              </div>
            )}
          </div>

          {goals.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <p>No goals created yet.</p>
              <p className="text-sm mt-1">Create goals first to allocate income to them.</p>
            </div>
          ) : (
            <>
              {/* Allocations List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Goal Allocations</h3>
                  <button
                    onClick={addAllocation}
                    disabled={allocations.length >= goals.length}
                    className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    Add Goal
                  </button>
                </div>

                {allocations.map((allocation, index) => {
                  const goal = goals.find(g => g.id === allocation.goalId);
                  const allocatedAmount = (monthlyAmount * allocation.percentage) / 100;
                  
                  return (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800"
                    >
                      <select
                        value={allocation.goalId}
                        onChange={(e) => updateAllocation(index, { goalId: e.target.value })}
                        className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm"
                      >
                        {goals.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                      
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={allocation.percentage}
                          onChange={(e) => updateAllocation(index, { 
                            percentage: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                          })}
                          className="w-20 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5 text-sm text-right"
                        />
                        <span className="text-sm text-zinc-500">%</span>
                      </div>
                      
                      <div className="w-32 text-right text-sm font-medium">
                        {formatCurrency(allocatedAmount, "EUR", privacyMode)}
                      </div>
                      
                      <button
                        onClick={() => removeAllocation(index)}
                        className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Total Allocated:</span>
                  <span className={`font-medium ${totalAllocated > 100 ? "text-red-600 dark:text-red-400" : ""}`}>
                    {totalAllocated.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Unallocated:</span>
                  <span className={`font-medium ${unallocated < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                    {unallocated.toFixed(0)}%
                  </span>
                </div>
                {totalAllocated > 100 && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Warning: Total allocation exceeds 100%
                  </p>
                )}
              </div>

              {/* Visual Progress Bar */}
              <div>
                <div className="flex justify-between text-xs text-zinc-500 mb-1">
                  <span>Allocation Progress</span>
                  <span>{totalAllocated.toFixed(0)}% of 100%</span>
                </div>
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      totalAllocated > 100 
                        ? "bg-red-500" 
                        : totalAllocated === 100
                        ? "bg-green-500"
                        : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.min(100, totalAllocated)}%` }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={totalAllocated > 100}
            className="px-4 py-2 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Allocations
          </button>
        </div>
      </div>
    </div>
  );
}

