"use client";

import { Pie, PieChart, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { useFinanceStore } from "@/store/finance-store";

const COLORS = [
  "#2563eb",
  "#f97316",
  "#16a34a",
  "#a855f7",
  "#facc15",
  "#ec4899",
  "#0ea5e9",
  "#94a3b8",
  "#22d3ee",
  "#fb7185",
];

export interface AllocationDatum {
  name: string;
  value: number;
  percent: number;
  [key: string]: string | number;
}

interface AllocationRadialChartProps {
  title: string;
  subtitle?: string;
  data: AllocationDatum[];
  totalValue: number;
  totalCount: number;
  currency: string;
}

export function AllocationRadialChart({
  title,
  subtitle,
  data,
  totalValue,
  totalCount,
  currency,
}: AllocationRadialChartProps) {
  const privacyMode = useFinanceStore((state) => state.privacyMode);

  const formatter =
    typeof Intl !== "undefined"
      ? new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        })
      : null;

  return (
    <div className="space-y-3">
      <div>
        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{title}</div>
        {subtitle && <div className="text-xs text-zinc-500 dark:text-zinc-400">{subtitle}</div>}
      </div>

      {data.length === 0 ? (
        <div className="flex h-52 items-center justify-center rounded-md border border-dashed border-zinc-200 dark:border-zinc-700">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">No holdings to display</div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[1fr_minmax(220px,260px)]">
          <div className="relative h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={75}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={COLORS[index % COLORS.length]}
                      className="transition-opacity hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip
                  cursor={{ fill: "rgba(148, 163, 184, 0.12)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload || payload.length === 0) return null;
                    const item = payload[0].payload as AllocationDatum;
                    return (
                      <div className="rounded-md border border-zinc-200 bg-white p-3 text-sm shadow dark:border-zinc-800 dark:bg-zinc-900">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">{item.name}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {privacyMode
                            ? "•••••"
                            : formatter
                            ? formatter.format(item.value)
                            : `${item.value.toFixed(0)} ${currency}`}
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          {(item.percent * 100).toFixed(1)}%
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {privacyMode
                    ? "•••••"
                    : formatter
                    ? formatter.format(totalValue)
                    : `${totalValue.toFixed(0)} ${currency}`}
                </div>
                <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {totalCount} positions
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {data.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-800"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-zinc-700 dark:text-zinc-200">{item.name}</span>
                </div>
                <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
                  <div>
                    {(item.percent * 100).toFixed(1)}
                    {"%"}
                  </div>
                  {privacyMode
                    ? "•••••"
                    : formatter
                    ? formatter.format(item.value)
                    : `${item.value.toFixed(0)} ${currency}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

