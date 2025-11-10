"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { ProjectionPoint } from "@/types/finance";

function formatCurrencyShort(n: number, currency: string) {
  const abs = Math.abs(n);
  let value = n;
  let suffix = "";
  if (abs >= 1_000_000_000) {
    value = n / 1_000_000_000;
    suffix = "B";
  } else if (abs >= 1_000_000) {
    value = n / 1_000_000;
    suffix = "M";
  } else if (abs >= 1_000) {
    value = n / 1_000;
    suffix = "k";
  }
  return `${new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 1,
  }).format(value)}${suffix}`;
}

export function CashFlowChart({
  data,
  currency,
  height = 280,
}: {
  data: ProjectionPoint[];
  currency: string;
  height?: number;
}) {
  const chartData = data.map((p) => ({
    label: p.dateISO.slice(0, 7),
    income: Math.round(p.income),
    expenses: Math.round(p.expenses + p.taxes), // stack expenses + taxes as outflows
    taxes: Math.round(p.taxes),
    net: Math.round(p.cashFlow),
  }));
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} minTickGap={36} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(v) => formatCurrencyShort(v, currency)}
            width={72}
          />
          <Tooltip
            formatter={(value) =>
              new Intl.NumberFormat(undefined, {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
              }).format(value as number)
            }
            labelFormatter={(label) => label}
          />
          <Legend />
          <Bar dataKey="income" fill="#22c55e" name="Income" />
          <Bar dataKey="expenses" fill="#ef4444" name="Expenses+Taxes" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


