"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { PerformanceBars, type PerformancePoint } from "@/components/portfolio/PerformanceBars";
import { formatCurrency } from "@/lib/privacy";

type PerformanceView = "yearly" | "monthly";

export default function PortfolioPerformancePage() {
  const history = useFinanceStore((state) => state.portfolioHistory);
  const currency = useFinanceStore((state) => state.assumptions.currency);
  const [view, setView] = useState<PerformanceView>("yearly");

  const aggregated = useMemo(() => {
    const groups = new Map<
      string,
      { start: number; end: number; count: number; contributions: number }
    >();

    const sorted = [...history].sort((a, b) => a.dateISO.localeCompare(b.dateISO));

    sorted.forEach((snapshot, index) => {
      const date = new Date(snapshot.dateISO);
      const key =
        view === "yearly"
          ? `${date.getFullYear()}`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!groups.has(key)) {
        groups.set(key, {
          start: snapshot.investmentValue,
          end: snapshot.investmentValue,
          count: 1,
          contributions: 0,
        });
      } else {
        const entry = groups.get(key)!;
        entry.end = snapshot.investmentValue;
        entry.count += 1;
      }

      if (index > 0) {
        const prev = sorted[index - 1];
        const contributionDelta =
          snapshot.totalValue -
          prev.totalValue -
          (snapshot.investmentValue - prev.investmentValue);
        const entry = groups.get(key)!;
        entry.contributions += contributionDelta;
      }
    });

    const rows = Array.from(groups.entries())
      .map(([period, { start, end, contributions }]) => {
        const change = end - start;
        const percent = start > 0 ? (change / start) * 100 : 0;
        return {
          period,
          change,
          percent,
          start,
          end,
          contributions,
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));

    const points: PerformancePoint[] = rows.map((row) => ({
      period: row.period,
      change: row.change,
      percent: row.percent,
    }));

    const totals = rows.reduce(
      (acc, row) => {
        acc.change += row.change;
        acc.contributions += row.contributions;
        return acc;
      },
      { change: 0, contributions: 0 }
    );

    return {
      rows,
      points: view === "yearly" ? rows.slice(-6).map((row) => ({
        period: row.period,
        change: row.change,
        percent: row.percent,
      })) : points.slice(-12),
      totals,
    };
  }, [history, view]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Performance Detail</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Review portfolio swings and estimated contributions over time.
          </p>
        </div>
        <Link
          href="/portfolio"
          className="rounded-full border border-zinc-200 dark:border-zinc-700 px-4 py-1.5 text-sm text-zinc-600 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          ← Back to Portfolio
        </Link>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-100">Performance</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {view === "yearly"
                ? "Year-over-year change"
                : "Month-over-month change"}
            </div>
          </div>
          <div className="inline-flex overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setView("yearly")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "yearly"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              Yearly
            </button>
            <button
              type="button"
              onClick={() => setView("monthly")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                view === "monthly"
                  ? "bg-blue-600 text-white"
                  : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
        {aggregated.points.length === 0 ? (
          <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/60 p-4 text-sm text-zinc-600 dark:text-zinc-300">
            Not enough historical data yet. Keep investing to build a history.
          </div>
        ) : (
          <PerformanceBars data={aggregated.points} currency={currency} />
        )}
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-100">Breakdown</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Change vs. estimated contributions (experimental)
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm text-zinc-700 dark:text-zinc-200">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-right">Starting</th>
                <th className="px-3 py-2 text-right">Ending</th>
                <th className="px-3 py-2 text-right">Change</th>
                <th className="px-3 py-2 text-right">Return %</th>
                <th className="px-3 py-2 text-right">Estimated Contributions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {aggregated.rows.map((row) => (
                <tr key={row.period}>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{row.period}</td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(row.start, currency, false)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(row.end, currency, false)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${
                      row.change >= 0 ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-rose-400"
                    }`}
                  >
                    {formatCurrency(row.change, currency, false)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right ${
                      row.percent >= 0 ? "text-green-600 dark:text-emerald-400" : "text-red-600 dark:text-rose-400"
                    }`}
                  >
                    {row.percent.toFixed(2)}%
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-600 dark:text-zinc-300">
                    {formatCurrency(row.contributions, currency, false)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 text-xs text-zinc-500 dark:text-zinc-400">
        <p>
          Contributions are approximated by comparing changes in total value vs. investment value.
          For precise contribution tracking, consider importing detailed transaction history.
        </p>
      </div>
    </div>
  );
}

