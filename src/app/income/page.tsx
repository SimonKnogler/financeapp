"use client";

import { useState, useMemo } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { formatCurrency } from "@/lib/privacy";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { AllocationModal } from "@/components/income/AllocationModal";
import type { Frequency, IncomeItem, PortfolioOwner } from "@/types/finance";
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";

type TabView = "total" | "carolina" | "simon" | "household";

export default function IncomePage() {
  const incomes = useFinanceStore((s) => s.incomes);
  const expenses = useFinanceStore((s) => s.expenses);
  const addIncome = useFinanceStore((s) => s.addIncome);
  const updateIncome = useFinanceStore((s) => s.updateIncome);
  const removeIncome = useFinanceStore((s) => s.removeIncome);
  const goals = useFinanceStore((s) => s.goals);
  const privacyMode = useFinanceStore((s) => s.privacyMode);
  
  const [activeTab, setActiveTab] = useState<TabView>("total");
  const [allocationModalIncome, setAllocationModalIncome] = useState<IncomeItem | null>(null);
  const [editingIncome, setEditingIncome] = useState<IncomeItem | null>(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState<string>("0");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [growthAnnual, setGrowthAnnual] = useState<string>("0.03");
  const [startDateISO, setStartDateISO] = useState<string>("");
  const [endDateISO, setEndDateISO] = useState<string>("");

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    
    // Determine owner based on active tab
    let owner: PortfolioOwner = "simon";
    if (activeTab === "carolina") owner = "carolina";
    else if (activeTab === "household") owner = "household";
    else if (activeTab === "simon") owner = "simon";
    
    addIncome({
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

  // Filter incomes based on active tab
  const filteredIncomes = useMemo(() => {
    return activeTab === "total" 
      ? incomes 
      : incomes.filter(i => i.owner === activeTab);
  }, [activeTab, incomes]);

  // Filter expenses based on active tab
  const filteredExpenses = useMemo(() => {
    return activeTab === "total" 
      ? expenses 
      : expenses.filter(e => e.owner === activeTab);
  }, [activeTab, expenses]);

  // Calculate monthly equivalent for each income
  const monthlyIncomes = useMemo(() => {
    return filteredIncomes.map((income) => {
      let monthlyAmount = income.amount;
      if (income.frequency === "yearly") {
        monthlyAmount = income.amount / 12;
      } else if (income.frequency === "once") {
        monthlyAmount = 0; // Don't include one-time income in monthly
      }
      return {
        name: income.name,
        value: monthlyAmount,
        original: income.amount,
        frequency: income.frequency,
      };
    }).filter(i => i.value > 0); // Only show recurring income
  }, [filteredIncomes]);

  // Calculate monthly equivalent for expenses
  const monthlyExpenses = useMemo(() => {
    return filteredExpenses.map((expense) => {
      let monthlyAmount = expense.amount;
      if (expense.frequency === "yearly") {
        monthlyAmount = expense.amount / 12;
      } else if (expense.frequency === "once") {
        monthlyAmount = 0;
      }
      return {
        name: expense.name,
        value: monthlyAmount,
      };
    }).filter(e => e.value > 0);
  }, [filteredExpenses]);

  const totalMonthlyIncome = monthlyIncomes.reduce((sum, item) => sum + item.value, 0);
  const totalMonthlyExpenses = monthlyExpenses.reduce((sum, item) => sum + item.value, 0);
  const netMonthlyCashFlow = totalMonthlyIncome - totalMonthlyExpenses;
  const savingsRate = totalMonthlyIncome > 0 ? (netMonthlyCashFlow / totalMonthlyIncome) * 100 : 0;

  // Colors for the pie chart
  const COLORS = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Income</h1>

      {/* Owner Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("total")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "total"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Total
        </button>
        <button
          onClick={() => setActiveTab("simon")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "simon"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Simon
        </button>
        <button
          onClick={() => setActiveTab("carolina")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "carolina"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Carolina
        </button>
        <button
          onClick={() => setActiveTab("household")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "household"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Household
        </button>
      </div>

      {/* Income vs Expenses Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Income</div>
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatCurrency(totalMonthlyIncome, "EUR", privacyMode)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {formatCurrency(totalMonthlyIncome * 12, "EUR", privacyMode)}/year
          </div>
        </div>

        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Expenses</div>
          </div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(totalMonthlyExpenses, "EUR", privacyMode)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {formatCurrency(totalMonthlyExpenses * 12, "EUR", privacyMode)}/year
          </div>
        </div>

        <div className={`rounded-lg border p-4 ${
          netMonthlyCashFlow > 0 
            ? "border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
            : netMonthlyCashFlow < 0
            ? "border-orange-200 dark:border-orange-800 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20"
            : "border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/20"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Minus className={`h-4 w-4 ${
              netMonthlyCashFlow > 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"
            }`} />
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Net Cash Flow</div>
          </div>
          <div className={`text-2xl font-bold ${
            netMonthlyCashFlow > 0 
              ? "text-blue-600 dark:text-blue-400" 
              : netMonthlyCashFlow < 0
              ? "text-orange-600 dark:text-orange-400"
              : "text-zinc-600"
          }`}>
            {netMonthlyCashFlow >= 0 ? "+" : ""}{formatCurrency(netMonthlyCashFlow, "EUR", privacyMode)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {netMonthlyCashFlow >= 0 ? "+" : ""}{formatCurrency(netMonthlyCashFlow * 12, "EUR", privacyMode)}/year
          </div>
        </div>

        <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Savings Rate</div>
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {privacyMode ? "••%" : `${savingsRate.toFixed(1)}%`}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            of income saved
          </div>
        </div>
      </div>

      {/* Income Summary Chart */}
      {filteredIncomes.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-lg font-semibold mb-4">Monthly Income Breakdown</h2>
            {monthlyIncomes.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={monthlyIncomes}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {monthlyIncomes.map((entry, index) => (
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
                No recurring income to display
              </div>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
            <h2 className="text-lg font-semibold mb-4">Income Summary</h2>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-zinc-500">Total Monthly Income</div>
                <div className="text-3xl font-bold text-green-600 dark:text-green-500">
                  {formatCurrency(totalMonthlyIncome, "EUR", privacyMode)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">per month</div>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Annual Equivalent</div>
                <div className="text-2xl font-semibold">
                  {formatCurrency(totalMonthlyIncome * 12, "EUR", privacyMode)}
                </div>
                <div className="text-xs text-zinc-500 mt-1">per year</div>
              </div>
              <div>
                <div className="text-sm text-zinc-500">Income Sources</div>
                <div className="text-2xl font-semibold">{filteredIncomes.length}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {monthlyIncomes.length} recurring
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Goal Allocation Summary */}
      {goals.length > 0 && filteredIncomes.length > 0 && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold">Income → Goal Allocations</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {goals.map((goal) => {
              // Calculate total monthly income allocated to this goal (filtered by owner)
              const allocatedToGoal = filteredIncomes.reduce((sum, income) => {
                const monthlyAmount = income.frequency === "monthly" 
                  ? income.amount 
                  : income.frequency === "yearly"
                  ? income.amount / 12
                  : 0;
                
                const allocation = income.goalAllocations?.find(a => a.goalId === goal.id);
                if (!allocation) return sum;
                
                return sum + (monthlyAmount * allocation.percentage / 100);
              }, 0);
              
              return (
                <div key={goal.id} className="p-3 rounded-md bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                    {goal.name}
                  </div>
                  <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(allocatedToGoal, "EUR", privacyMode)}<span className="text-sm">/mo</span>
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    {formatCurrency(allocatedToGoal * 12, "EUR", privacyMode)}/year
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 p-3 rounded-md bg-zinc-50 dark:bg-zinc-900/50">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Unallocated Income</span>
              <span className="text-sm font-medium">
                {(() => {
                  const totalAllocated = filteredIncomes.reduce((sum, income) => {
                    const monthlyAmount = income.frequency === "monthly" 
                      ? income.amount 
                      : income.frequency === "yearly"
                      ? income.amount / 12
                      : 0;
                    
                    const totalPercentage = (income.goalAllocations || []).reduce(
                      (sum, a) => sum + a.percentage, 0
                    );
                    
                    return sum + (monthlyAmount * totalPercentage / 100);
                  }, 0);
                  
                  const unallocated = totalMonthlyIncome - totalAllocated;
                  return formatCurrency(unallocated, "EUR", privacyMode);
                })()}
              </span>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-7 gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
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
          placeholder="Growth (e.g., 0.03)"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
        />
        <input
          type="date"
          value={startDateISO}
          onChange={(e) => setStartDateISO(e.target.value)}
          placeholder="Start date"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
        />
        <button
          type="submit"
          className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Add
        </button>
      </form>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-right p-2">Amount</th>
              <th className="text-left p-2">Frequency</th>
              <th className="text-left p-2">Owner</th>
              <th className="text-left p-2">Goal Allocation</th>
              <th className="text-left p-2">Start</th>
              <th className="text-right p-2">Growth</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredIncomes.map((x) => {
              const totalAllocated = (x.goalAllocations || []).reduce((sum, a) => sum + a.percentage, 0);
              const hasAllocations = totalAllocated > 0;
              
              return (
                <tr key={x.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="p-2">{x.name}</td>
                  <td className="p-2 text-right">{formatCurrency(x.amount, "EUR", privacyMode)}</td>
                  <td className="p-2 capitalize">{x.frequency}</td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      x.owner === "simon" 
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : x.owner === "carolina"
                        ? "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"
                        : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                    }`}>
                      {x.owner}
                    </span>
                  </td>
                  <td className="p-2">
                    {hasAllocations ? (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          totalAllocated === 100 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>
                          {totalAllocated.toFixed(0)}% allocated
                        </span>
                        <span className="text-xs text-zinc-500">
                          to {x.goalAllocations?.length} {x.goalAllocations?.length === 1 ? "goal" : "goals"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">Not allocated</span>
                    )}
                  </td>
                  <td className="p-2">{x.startDateISO ?? "-"}</td>
                  <td className="p-2 text-right">
                    {privacyMode ? "•••%" : (x.growthAnnual ?? 0).toLocaleString(undefined, { style: "percent", maximumFractionDigits: 1 })}
                  </td>
                  <td className="p-2 text-right space-x-2">
                    <button
                      onClick={() => setEditingIncome(x)}
                      className="rounded-md border border-blue-200 dark:border-blue-800 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      title="Edit income details"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setAllocationModalIncome(x)}
                      className="rounded-md border border-purple-200 dark:border-purple-800 px-2 py-1 text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      title="Allocate to goals"
                    >
                      {hasAllocations ? "Goals" : "Goals"}
                    </button>
                    <button
                      onClick={() => removeIncome(x.id)}
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

      {/* Allocation Modal */}
      {allocationModalIncome && (
        <AllocationModal
          income={allocationModalIncome}
          onClose={() => setAllocationModalIncome(null)}
        />
      )}

      {/* Edit Income Modal */}
      {editingIncome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingIncome(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Edit Income: {editingIncome.name}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateIncome(editingIncome.id, {
                name: formData.get('name') as string,
                amount: parseFloat(formData.get('amount') as string),
                frequency: formData.get('frequency') as Frequency,
                growthAnnual: parseFloat(formData.get('growthAnnual') as string),
                startDateISO: (formData.get('startDate') as string) || undefined,
              });
              setEditingIncome(null);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingIncome.name}
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
                    defaultValue={editingIncome.amount}
                    required
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Frequency</label>
                  <select
                    name="frequency"
                    defaultValue={editingIncome.frequency}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="once">Once</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Growth</label>
                  <input
                    name="growthAnnual"
                    type="number"
                    step="0.01"
                    defaultValue={editingIncome.growthAnnual}
                    placeholder="e.g. 0.03"
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    name="startDate"
                    type="date"
                    defaultValue={editingIncome.startDateISO}
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingIncome(null)}
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

