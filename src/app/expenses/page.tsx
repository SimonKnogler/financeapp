"use client";

import { useState, useMemo } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { formatCurrency } from "@/lib/privacy";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { GasTracker } from "@/components/expenses/GasTracker";
import type { Frequency, PortfolioOwner } from "@/types/finance";

type TabView = "total" | "carolina" | "simon" | "household";

export default function ExpensesPage() {
  const expenses = useFinanceStore((s) => s.expenses);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const updateExpense = useFinanceStore((s) => s.updateExpense);
  const removeExpense = useFinanceStore((s) => s.removeExpense);
  const privacyMode = useFinanceStore((s) => s.privacyMode);

  const [activeTab, setActiveTab] = useState<TabView>("total");
  const [editingExpense, setEditingExpense] = useState<import("@/types/finance").ExpenseItem | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<string>("0");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [growthAnnual, setGrowthAnnual] = useState<string>("0.02");
  const [startDateISO, setStartDateISO] = useState<string>("");
  const [endDateISO, setEndDateISO] = useState<string>("");

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    
    // Determine owner based on active tab
    let owner: PortfolioOwner = "simon";
    if (activeTab === "carolina") owner = "carolina";
    else if (activeTab === "household") owner = "household";
    else if (activeTab === "simon") owner = "simon";
    
    addExpense({
      name,
      amount: parseFloat(amount) || 0,
      frequency,
      growthAnnual: parseFloat(growthAnnual) || 0,
      startDateISO: startDateISO || undefined,
      endDateISO: endDateISO || undefined,
      owner,
    });
    setName("");
    setAmount("0");
  }

  // Filter expenses based on active tab
  const filteredExpenses = useMemo(() => {
    const filtered = activeTab === "total" 
      ? expenses 
      : expenses.filter(e => e.owner === activeTab);
    
    // Sort by monthly amount (largest to smallest)
    return filtered.sort((a, b) => {
      let monthlyA = a.amount;
      if (a.frequency === "yearly") monthlyA = a.amount / 12;
      else if (a.frequency === "once") monthlyA = 0;
      
      let monthlyB = b.amount;
      if (b.frequency === "yearly") monthlyB = b.amount / 12;
      else if (b.frequency === "once") monthlyB = 0;
      
      return monthlyB - monthlyA; // Descending order
    });
  }, [activeTab, expenses]);

  // Calculate monthly equivalent for each expense
  const monthlyExpenses = useMemo(() => {
    return filteredExpenses.map((expense) => {
      let monthlyAmount = expense.amount;
      if (expense.frequency === "yearly") {
        monthlyAmount = expense.amount / 12;
      } else if (expense.frequency === "once") {
        monthlyAmount = 0; // Don't include one-time expense in monthly
      }
      return {
        name: expense.name,
        value: monthlyAmount,
        original: expense.amount,
        frequency: expense.frequency,
      };
    }).filter(e => e.value > 0); // Only show recurring expenses
  }, [filteredExpenses]);

  const totalMonthlyExpenses = monthlyExpenses.reduce((sum, item) => sum + item.value, 0);

  // Colors for the pie chart
  const COLORS = [
    "#ef4444", // red
    "#f59e0b", // amber
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#3b82f6", // blue
    "#10b981", // green
    "#06b6d4", // cyan
    "#84cc16", // lime
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Expenses</h1>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("total")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "total"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          Total
        </button>
        <button
          onClick={() => setActiveTab("household")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "household"
              ? "border-amber-500 text-amber-600 dark:text-amber-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          Household
        </button>
        <button
          onClick={() => setActiveTab("carolina")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "carolina"
              ? "border-purple-500 text-purple-600 dark:text-purple-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          Carolina
        </button>
        <button
          onClick={() => setActiveTab("simon")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "simon"
              ? "border-green-500 text-green-600 dark:text-green-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          Simon
        </button>
      </div>

      {/* Gas Tracker (Household only) */}
      {activeTab === "household" && <GasTracker />}

      {/* Expense Summary Chart */}
      {filteredExpenses.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-lg font-semibold mb-4">Monthly Expense Breakdown</h2>
            {monthlyExpenses.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={monthlyExpenses}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {monthlyExpenses.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => 
                      privacyMode ? "•••••" : formatCurrency(value, "EUR", false)
                    }
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-zinc-500 text-sm">
                No recurring expenses to display
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-lg font-semibold mb-4">Expense Summary</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-zinc-500">Total Monthly Expenses</div>
                <div className="text-3xl font-bold text-red-600 dark:text-red-500">
                  {formatCurrency(totalMonthlyExpenses, "EUR", privacyMode)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">per month</div>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Annual Equivalent</div>
                <div className="text-2xl font-semibold">
                  {formatCurrency(totalMonthlyExpenses * 12, "EUR", privacyMode)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">per year</div>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Expense Categories</div>
                <div className="text-2xl font-semibold">{filteredExpenses.length}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {monthlyExpenses.length} recurring
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Only show add form for individual expenses */}
      {activeTab !== "total" && (
        <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-6 gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="col-span-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
        />
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
        />
        <select
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as Frequency)}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
        >
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
          <option value="once">Once</option>
        </select>
        <input
          value={growthAnnual}
          onChange={(e) => setGrowthAnnual(e.target.value)}
          placeholder="Growth (e.g., 0.02)"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
        />
        <input
          type="date"
          value={startDateISO}
          onChange={(e) => setStartDateISO(e.target.value)}
          placeholder="Start date"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
        />
        <input
          type="date"
          value={endDateISO}
          onChange={(e) => setEndDateISO(e.target.value)}
          placeholder="End date"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
        />
        <button
          type="submit"
          className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Add
        </button>
      </form>
      )}

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-right p-2">Amount</th>
              <th className="text-left p-2">Frequency</th>
              <th className="text-left p-2">Start</th>
              <th className="text-left p-2">End</th>
              <th className="text-right p-2">% of Total</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredExpenses.map((x) => {
              // Calculate monthly amount for this expense
              let monthlyAmount = x.amount;
              if (x.frequency === "yearly") {
                monthlyAmount = x.amount / 12;
              } else if (x.frequency === "once") {
                monthlyAmount = 0;
              }
              
              // Calculate percentage of total monthly expenses
              const percentOfTotal = totalMonthlyExpenses > 0 
                ? (monthlyAmount / totalMonthlyExpenses) * 100 
                : 0;
              
              return (
                <tr key={x.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="p-2">{x.name}</td>
                  <td className="p-2 text-right">{formatCurrency(x.amount, "EUR", privacyMode)}</td>
                  <td className="p-2 capitalize">{x.frequency}</td>
                  <td className="p-2">{x.startDateISO ?? "-"}</td>
                  <td className="p-2">{x.endDateISO ?? "-"}</td>
                  <td className="p-2 text-right">
                    {privacyMode ? "•••%" : monthlyAmount > 0 ? `${percentOfTotal.toFixed(1)}%` : "-"}
                  </td>
                  <td className="p-2 text-right space-x-2">
                    <button
                      onClick={() => setEditingExpense(x)}
                      className="rounded-md border border-blue-200 dark:border-blue-800 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeExpense(x.id)}
                      className="rounded-md border border-zinc-200 dark:border-zinc-800 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingExpense(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Edit Expense: {editingExpense.name}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateExpense(editingExpense.id, {
                name: formData.get('name') as string,
                amount: parseFloat(formData.get('amount') as string),
                frequency: formData.get('frequency') as Frequency,
                growthAnnual: parseFloat(formData.get('growthAnnual') as string),
                startDateISO: (formData.get('startDate') as string) || undefined,
                endDateISO: (formData.get('endDate') as string) || undefined,
              });
              setEditingExpense(null);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingExpense.name}
                  required
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount</label>
                  <input
                    name="amount"
                    type="number"
                    step="any"
                    defaultValue={editingExpense.amount}
                    required
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <select
                    name="frequency"
                    defaultValue={editingExpense.frequency}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="once">Once</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Growth</label>
                  <input
                    name="growthAnnual"
                    type="number"
                    step="0.01"
                    defaultValue={editingExpense.growthAnnual}
                    placeholder="e.g. 0.02"
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    name="startDate"
                    type="date"
                    defaultValue={editingExpense.startDateISO}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    name="endDate"
                    type="date"
                    defaultValue={editingExpense.endDateISO}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


