"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
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
  baselineValue?: number;
}

interface DataPoint {
  date: string;
  value: number;
}

export function PortfolioChart({ portfolioHistory, currentValue, height = 300, baselineValue }: PortfolioChartProps) {
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
    let filteredSnapshots = portfolioHistory
      .filter((snapshot) => snapshot.dateISO >= startDateStr)
      .map((snapshot) => ({
        date: snapshot.dateISO,
        value: snapshot.investmentValue, // Only track invested assets (exclude cash)
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

    // Inject a synthetic baseline point if we have a baseline value and not enough history
    if (baselineValue !== undefined) {
      const firstDate = filteredSnapshots[0]?.date ?? todayStr;
      const firstValue = filteredSnapshots[0]?.value ?? currentValue;
      if (Math.abs(firstValue - baselineValue) > 0.5) {
        const baseDate = new Date(firstDate);
        baseDate.setDate(baseDate.getDate() - 1);
        const baselineDateISO = baseDate.toISOString().split('T')[0];
        filteredSnapshots = [
          { date: baselineDateISO, value: baselineValue },
          ...filteredSnapshots,
        ];
      }
    }

    return filteredSnapshots;
  }, [portfolioHistory, currentValue, range, baselineValue]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-sm text-zinc-500">Portfolio tracking will begin from today</div>
      </div>
    );
  }

  // Calculate change based on range
  const effectiveBaseline = baselineValue !== undefined ? baselineValue : data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const change = lastValue - effectiveBaseline;
  const changePercent = effectiveBaseline > 0 ? (change / effectiveBaseline) * 100 : 0;
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
        <AreaChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="portfolioGradientGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#22c55e" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="portfolioGradientRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="50%" stopColor="#ef4444" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
            minTickGap={30}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(value) => privacyMode ? "•••" : formatter.format(value)}
            width={80}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              border: "none",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              padding: "12px",
            }}
            itemStyle={{
              color: isPositive ? "#22c55e" : "#ef4444",
              fontWeight: "600",
            }}
            labelStyle={{
              color: "#52525b",
              fontWeight: "500",
              marginBottom: "4px",
            }}
            formatter={(value: any) => [privacyMode ? "•••••" : formatter.format(value), "Investment Value"]}
            labelFormatter={(label) => new Date(label).toLocaleDateString("en-US", { 
              month: "short", 
              day: "numeric", 
              year: "numeric" 
            })}
            cursor={{ stroke: isPositive ? "#22c55e" : "#ef4444", strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={isPositive ? "#22c55e" : "#ef4444"}
            strokeWidth={3}
            fill={isPositive ? "url(#portfolioGradientGreen)" : "url(#portfolioGradientRed)"}
            fillOpacity={1}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

