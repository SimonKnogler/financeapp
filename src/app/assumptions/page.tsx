"use client";

import { useFinanceStore } from "@/store/finance-store";
import { useState } from "react";

export default function AssumptionsPage() {
  const assumptions = useFinanceStore((s) => s.assumptions);
  const setAssumptions = useFinanceStore((s) => s.setAssumptions);

  const [form, setForm] = useState({
    startDateISO: assumptions.startDateISO,
    projectionYears: String(assumptions.projectionYears),
    inflationAnnual: String(assumptions.inflationAnnual),
    taxRateEffective: String(assumptions.taxRateEffective),
    currency: assumptions.currency,
    expectedPortfolioReturn: String(assumptions.expectedPortfolioReturn ?? 0.07),
    portfolioVolatility: String(assumptions.portfolioVolatility ?? 0.15),
    monthlySavingsGoal: String(assumptions.monthlySavingsGoal ?? 0),
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAssumptions({
      startDateISO: form.startDateISO,
      projectionYears: parseInt(form.projectionYears) || 30,
      inflationAnnual: parseFloat(form.inflationAnnual) || 0,
      taxRateEffective: parseFloat(form.taxRateEffective) || 0,
      currency: form.currency || "USD",
      expectedPortfolioReturn: parseFloat(form.expectedPortfolioReturn) || 0.07,
      portfolioVolatility: parseFloat(form.portfolioVolatility) || 0.15,
      monthlySavingsGoal: parseFloat(form.monthlySavingsGoal) || 0,
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Assumptions</h1>
      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Start Date</span>
          <input
            type="date"
            value={form.startDateISO}
            onChange={(e) => setForm((f) => ({ ...f, startDateISO: e.target.value }))}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Projection Years</span>
          <input
            value={form.projectionYears}
            onChange={(e) => setForm((f) => ({ ...f, projectionYears: e.target.value }))}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Inflation (e.g., 0.02)</span>
          <input
            value={form.inflationAnnual}
            onChange={(e) => setForm((f) => ({ ...f, inflationAnnual: e.target.value }))}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Effective Tax Rate (e.g., 0.25)</span>
          <input
            value={form.taxRateEffective}
            onChange={(e) => setForm((f) => ({ ...f, taxRateEffective: e.target.value }))}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Currency (ISO)</span>
          <input
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Expected Portfolio Return (e.g., 0.07 for 7%)</span>
          <input
            value={form.expectedPortfolioReturn}
            onChange={(e) => setForm((f) => ({ ...f, expectedPortfolioReturn: e.target.value }))}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
            placeholder="0.07"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Portfolio Volatility (e.g., 0.15 for 15%)</span>
          <input
            value={form.portfolioVolatility}
            onChange={(e) => setForm((f) => ({ ...f, portfolioVolatility: e.target.value }))}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
            placeholder="0.15"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-zinc-500">Monthly Savings Goal (EUR)</span>
          <input
            value={form.monthlySavingsGoal}
            onChange={(e) => setForm((f) => ({ ...f, monthlySavingsGoal: e.target.value }))}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
            placeholder="0"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            Save
          </button>
        </div>
      </form>
      
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-blue-50 dark:bg-blue-900/20">
        <h2 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-300">About These Settings</h2>
        <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1">
          <li><strong>Expected Portfolio Return:</strong> Used for projections and Monte Carlo simulations. Default is 7% (0.07).</li>
          <li><strong>Portfolio Volatility:</strong> Standard deviation of returns for Monte Carlo uncertainty. Default is 15% (0.15).</li>
          <li><strong>Monthly Savings Goal:</strong> Your target monthly savings amount for goal tracking.</li>
        </ul>
      </div>
    </div>
  );
}


