"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine } from "recharts";
import { useFinanceStore } from "@/store/finance-store";

export interface PerformancePoint {
  period: string;
  change: number;
  percent: number;
}

interface PerformanceBarsProps {
  data: PerformancePoint[];
  currency: string;
}

export function PerformanceBars({ data, currency }: PerformanceBarsProps) {
  const privacyMode = useFinanceStore((state) => state.privacyMode);

  const currencyFormatter =
    typeof Intl !== "undefined"
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        })
      : null;

  const tooltipFormatter = (value: number) =>
    privacyMode
      ? "•••••"
      : currencyFormatter
      ? currencyFormatter.format(value)
      : `${value.toFixed(0)} ${currency}`;

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.2)" />
          <XAxis
            dataKey="period"
            tick={{ fill: "rgba(226, 232, 240, 0.8)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "rgba(226, 232, 240, 0.8)", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) =>
              privacyMode
                ? "•••"
                : currencyFormatter
                ? currencyFormatter.format(Number(value))
                : `${Number(value).toFixed(0)}`
            }
          />
          <ReferenceLine y={0} stroke="rgba(148, 163, 184, 0.4)" />
          <Tooltip
            cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const entry = payload[0].payload as PerformancePoint;
              return (
                <div className="rounded-md border border-slate-700 bg-slate-900/95 p-3 text-xs text-slate-100 shadow-lg">
                  <div className="text-sm font-semibold text-white">{label}</div>
                  <div className="mt-1 text-slate-300">
                    Change: {tooltipFormatter(entry.change)}
                  </div>
                  <div className="text-slate-400">{entry.percent.toFixed(2)}%</div>
                </div>
              );
            }}
          />
          <Bar dataKey="change" radius={4}>
            {data.map((entry) => (
              <Cell
                key={entry.period}
                fill={entry.change >= 0 ? "#22c55e" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

