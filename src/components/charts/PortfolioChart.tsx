"use client";

import { useMemo } from "react";
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

  const data = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Only include snapshots from today onwards
    const futureSnapshots = portfolioHistory
      .filter((snapshot) => snapshot.dateISO >= todayStr && snapshot.dateISO !== todayStr)
      .map((snapshot) => ({
        date: snapshot.dateISO,
        value: snapshot.totalValue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Start with today's value as baseline
    const result = [{ date: todayStr, value: currentValue }];
    
    // Add any future snapshots
    result.push(...futureSnapshots);

    return result;
  }, [portfolioHistory, currentValue]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-sm text-zinc-500">Portfolio tracking will begin from today</div>
      </div>
    );
  }

  // Always use today's value (first data point) as the baseline
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
          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Performance from today
          </div>
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

