"use client";

import { useState, useMemo } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { formatCurrency } from "@/lib/privacy";
import { differenceInMonths } from "date-fns";
import type { FinancialGoal, PortfolioOwner } from "@/types/finance";
import { Home, GraduationCap, Heart, Landmark, Target } from "lucide-react";

export default function GoalsPage() {
  const { goals, addGoal, updateGoal, removeGoal, incomes, stocks, privacyMode } = useFinanceStore();
  
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  
  // Form state
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [category, setCategory] = useState<FinancialGoal["category"]>("other");
  const [priority, setPriority] = useState<FinancialGoal["priority"]>("medium");
  const [owner, setOwner] = useState<PortfolioOwner | "joint">("simon");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const goalData = {
      name,
      targetAmount: parseFloat(targetAmount) || 0,
      currentAmount: parseFloat(currentAmount) || 0,
      targetDateISO: targetDate,
      category,
      priority,
      owner,
    };

    if (editingGoal) {
      updateGoal(editingGoal.id, goalData);
      setEditingGoal(null);
    } else {
      addGoal(goalData);
    }
    
    // Reset form
    setName("");
    setTargetAmount("");
    setCurrentAmount("");
    setTargetDate("");
    setCategory("other");
    setPriority("medium");
    setOwner("simon");
    setShowForm(false);
  };

  const handleEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setTargetDate(goal.targetDateISO);
    setCategory(goal.category);
    setPriority(goal.priority);
    setOwner(goal.owner);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingGoal(null);
    setName("");
    setTargetAmount("");
    setCurrentAmount("");
    setTargetDate("");
    setCategory("other");
    setPriority("medium");
    setOwner("simon");
    setShowForm(false);
  };

  // Calculate goal metrics
  const goalMetrics = useMemo(() => {
    return goals.map(goal => {
      const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
      const remaining = goal.targetAmount - goal.currentAmount;
      const monthsRemaining = differenceInMonths(new Date(goal.targetDateISO), new Date());
      const requiredMonthlySavings = monthsRemaining > 0 ? remaining / monthsRemaining : 0;
      
      // Calculate monthly income allocated to this goal
      const monthlyIncomeAllocated = incomes.reduce((sum, income) => {
        const monthlyAmount = income.frequency === "monthly" 
          ? income.amount 
          : income.frequency === "yearly"
          ? income.amount / 12
          : 0;
        
        const allocation = income.goalAllocations?.find(a => a.goalId === goal.id);
        if (!allocation) return sum;
        
        return sum + (monthlyAmount * allocation.percentage / 100);
      }, 0);
      
      // Find Sparpläne linked to this goal
      const linkedSparpläne = stocks.filter(
        s => s.type === "etf" && s.sparplan?.active && s.goalId === goal.id
      );
      
      const monthlySparplanAmount = linkedSparpläne.reduce(
        (sum, s) => sum + (s.sparplan?.monthlyAmount || 0), 
        0
      );
      
      // Total monthly contribution (income + sparpläne)
      const totalMonthlyContribution = monthlyIncomeAllocated + monthlySparplanAmount;
      
      // Projection with allocated income and sparpläne
      const projectedAmount = goal.currentAmount + (totalMonthlyContribution * monthsRemaining);
      const onTrack = projectedAmount >= goal.targetAmount * 0.95; // Within 5% is "on track"
      
      return {
        ...goal,
        progress,
        remaining,
        monthsRemaining,
        requiredMonthlySavings,
        monthlyIncomeAllocated,
        monthlySparplanAmount,
        linkedSparpläne,
        totalMonthlyContribution,
        onTrack,
      };
    });
  }, [goals, incomes, stocks]);

  const getCategoryIcon = (category: FinancialGoal["category"]) => {
    switch (category) {
      case "house":
        return <Home className="h-5 w-5" />;
      case "education":
        return <GraduationCap className="h-5 w-5" />;
      case "emergency":
        return <Heart className="h-5 w-5" />;
      case "retirement":
        return <Landmark className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: FinancialGoal["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "low":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  const getOwnerColor = (owner: PortfolioOwner | "joint") => {
    switch (owner) {
      case "simon":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "carolina":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "household":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "joint":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Financial Goals</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-blue-500 text-white px-4 py-2 text-sm hover:bg-blue-600"
        >
          Add Goal
        </button>
      </div>

      {/* How-To Guide */}
      {goals.length > 0 && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
            <Target className="h-4 w-4" />
            How to Automate Your Goal Funding
          </h3>
          <div className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
            <p><strong>1. Allocate Income:</strong> Go to Income page → Click "Allocate" → Assign % to goals</p>
            <p><strong>2. Link Portfolio Holdings:</strong> Go to Portfolio page → Set "Goal" dropdown for each holding</p>
            <p><strong>3. Set up Sparpläne:</strong> Portfolio page → Click "Sparplan" on ETFs → Link to goal</p>
            <p className="pt-1 text-blue-700 dark:text-blue-300">💡 <strong>Tip:</strong> Income allocations + Sparpläne = Automatic goal tracking!</p>
          </div>
        </div>
      )}

      {/* Add/Edit Goal Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900/50"
        >
          <h2 className="text-lg font-semibold mb-4">
            {editingGoal ? "Edit Goal" : "Add New Goal"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Goal Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Emergency Fund"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FinancialGoal["category"])}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
              >
                <option value="retirement">Retirement</option>
                <option value="house">House/Property</option>
                <option value="emergency">Emergency Fund</option>
                <option value="education">Education</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Amount (EUR)</label>
              <input
                required
                type="number"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="100000"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Current Amount (EUR)</label>
              <input
                required
                type="number"
                step="0.01"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="25000"
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Date</label>
              <input
                required
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Owner</label>
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value as PortfolioOwner | "joint")}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
              >
                <option value="simon">Simon</option>
                <option value="carolina">Carolina</option>
                <option value="household">Household</option>
                <option value="joint">Joint</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as FinancialGoal["priority"])}
                className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              className="rounded-md bg-blue-500 text-white px-4 py-2 text-sm hover:bg-blue-600"
            >
              {editingGoal ? "Update Goal" : "Add Goal"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Goals Grid */}
      {goalMetrics.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
          <Target className="h-12 w-12 mx-auto text-zinc-400 mb-3" />
          <h3 className="text-lg font-semibold mb-2">No Goals Yet</h3>
          <p className="text-sm text-zinc-500 mb-4">
            Start tracking your financial goals to see your progress
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-blue-500 text-white px-4 py-2 text-sm hover:bg-blue-600"
          >
            Add Your First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goalMetrics.map((goal) => (
            <div
              key={goal.id}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                    {getCategoryIcon(goal.category)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{goal.name}</h3>
                    <div className="flex gap-1 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(goal.priority)}`}>
                        {goal.priority}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${getOwnerColor(goal.owner)}`}>
                        {goal.owner}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-zinc-500">Progress</span>
                  <span className="font-medium">
                    {privacyMode ? "•••%" : `${Math.min(100, goal.progress).toFixed(0)}%`}
                  </span>
                </div>
                <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      goal.onTrack ? "bg-green-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(100, goal.progress)}%` }}
                  />
                </div>
              </div>

              {/* Amounts */}
              <div className="space-y-2 text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Current:</span>
                  <span className="font-medium">
                    {formatCurrency(goal.currentAmount, "EUR", privacyMode)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Target:</span>
                  <span className="font-medium">
                    {formatCurrency(goal.targetAmount, "EUR", privacyMode)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Remaining:</span>
                  <span className="font-medium">
                    {formatCurrency(goal.remaining, "EUR", privacyMode)}
                  </span>
                </div>
              </div>

              {/* Timeline */}
              <div className="text-sm mb-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Target Date:</span>
                  <span className="font-medium">
                    {new Date(goal.targetDateISO).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-zinc-500">Months Left:</span>
                  <span className="font-medium">{goal.monthsRemaining}</span>
                </div>
              </div>

              {/* Income Allocation */}
              {goal.monthlyIncomeAllocated > 0 && (
                <div className="text-sm p-2 rounded-md mb-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-700 dark:text-blue-300 font-medium">
                      💰 Income Allocated
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">
                      {formatCurrency(goal.monthlyIncomeAllocated, "EUR", privacyMode)}/mo
                    </span>
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                    {formatCurrency(goal.monthlyIncomeAllocated * 12, "EUR", privacyMode)}/year
                  </div>
                </div>
              )}

              {/* Sparplan Allocation */}
              {goal.monthlySparplanAmount > 0 && (
                <div className="text-sm p-2 rounded-md mb-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                  <div className="flex justify-between items-center">
                    <span className="text-green-700 dark:text-green-300 font-medium">
                      📊 Sparplan Active
                    </span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">
                      {formatCurrency(goal.monthlySparplanAmount, "EUR", privacyMode)}/mo
                    </span>
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    {goal.linkedSparpläne.length} {goal.linkedSparpläne.length === 1 ? "ETF" : "ETFs"}: {goal.linkedSparpläne.map(s => s.symbol).join(", ")}
                  </div>
                </div>
              )}

              {/* Total Monthly Contribution */}
              {goal.totalMonthlyContribution > 0 && (
                <div className="text-sm p-2 rounded-md mb-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-700 dark:text-purple-300 font-semibold">
                      🎯 Total Monthly
                    </span>
                    <span className="text-purple-600 dark:text-purple-400 font-bold">
                      {formatCurrency(goal.totalMonthlyContribution, "EUR", privacyMode)}/mo
                    </span>
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                    Combined income + sparplan contributions
                  </div>
                </div>
              )}

              {/* Required Savings */}
              {goal.monthsRemaining > 0 && (
                <div className={`text-sm p-2 rounded-md mb-3 ${
                  goal.onTrack 
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                }`}>
                  <div className="font-medium">
                    {goal.onTrack ? "On Track!" : "Save monthly:"}
                  </div>
                  {!goal.onTrack && (
                    <div className="text-xs">
                      {formatCurrency(goal.requiredMonthlySavings, "EUR", privacyMode)}/month
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(goal)}
                  className="flex-1 rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Edit
                </button>
                <button
                  onClick={() => removeGoal(goal.id)}
                  className="rounded-md border border-red-200 dark:border-red-800 px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

