"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { useFinanceStore } from "@/store/finance-store";
import { formatCurrency } from "@/lib/privacy";
import type { PortfolioSnapshot } from "@/types/finance";

interface PortfolioChartProps {
  portfolioHistory: PortfolioSnapshot[];
  currentValue: number;
  height?: number;
}

interface DataPoint {
  date: string;
  value: number;
}

export function PortfolioChart({ portfolioHistory, currentValue, height = 300 }: PortfolioChartProps) {
  const privacyMode = useFinanceStore((s) => s.privacyMode);
  const [range, setRange] = useState("1mo");

  const data = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    
    // Calculate date range based on selection
    const startDate = new Date(today);
    switch (range) {
      case "1d":
        startDate.setDate(today.getDate() - 1);
        break;
      case "5d":
        startDate.setDate(today.getDate() - 5);
        break;
      case "1mo":
        startDate.setMonth(today.getMonth() - 1);
        break;
      case "6mo":
        startDate.setMonth(today.getMonth() - 6);
        break;
      case "1y":
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      case "all":
        // Show all data
        startDate.setFullYear(2000);
        break;
    }
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Filter snapshots based on range using total portfolio value
    const filteredSnapshots = portfolioHistory
      .filter((snapshot) => snapshot.dateISO >= startDateStr)
      .map((snapshot) => ({
        date: snapshot.dateISO,
        value: snapshot.totalValue, // Use total portfolio value (investments + cash)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Always include today's current total value
    const todayIndex = filteredSnapshots.findIndex(s => s.date === todayStr);
    if (todayIndex >= 0) {
      filteredSnapshots[todayIndex].value = currentValue;
    } else {
      filteredSnapshots.push({ date: todayStr, value: currentValue });
      filteredSnapshots.sort((a, b) => a.date.localeCompare(b.date));
    }

    return filteredSnapshots;
  }, [portfolioHistory, currentValue, range]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-sm text-zinc-500">Portfolio tracking will begin from today</div>
      </div>
    );
  }

  // Calculate change based on range
  const baselineValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const change = lastValue - baselineValue;
  const changePercent = baselineValue > 0 ? (change / baselineValue) * 100 : 0;
  const isPositive = change >= 0;

  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const ranges = [
    { label: "1D", value: "1d" },
    { label: "5D", value: "5d" },
    { label: "1M", value: "1mo" },
    { label: "6M", value: "6mo" },
    { label: "1Y", value: "1y" },
    { label: "All", value: "all" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold">
            {formatCurrency(lastValue, "EUR", privacyMode)}
          </div>
          <div
            className={`text-sm ${
              isPositive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
            }`}
          >
            {privacyMode ? (
              "••••• (•••%)"
            ) : (
              <>
                {isPositive ? "+" : ""}
                {formatter.format(change)} ({isPositive ? "+" : ""}
                {changePercent.toFixed(2)}%)
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          {ranges.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-2 py-1 text-xs rounded ${
                range === r.value
                  ? "bg-blue-500 text-white"
                  : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ left: 0, right: 0, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
            minTickGap={30}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            domain={["auto", "auto"]}
            tickFormatter={(value) => privacyMode ? "•••" : formatter.format(value)}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
            formatter={(value: any) => [privacyMode ? "•••••" : formatter.format(value), "Portfolio Value"]}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={isPositive ? "#22c55e" : "#ef4444"}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

