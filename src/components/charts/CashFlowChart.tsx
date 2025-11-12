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
        <BarChart data={chartData} margin={{ left: 8, right: 8, top: 12, bottom: 8 }} barGap={2}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.7} />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.15} vertical={false} />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 11, fill: "#71717a" }} 
            axisLine={false}
            tickLine={false}
            minTickGap={36} 
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => formatCurrencyShort(v, currency)}
            width={72}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.98)",
              border: "none",
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              padding: "14px 16px",
            }}
            itemStyle={{
              fontWeight: "600",
              fontSize: "14px",
            }}
            labelStyle={{
              color: "#52525b",
              fontWeight: "600",
              marginBottom: "6px",
              fontSize: "13px",
            }}
            formatter={(value) =>
              [new Intl.NumberFormat(undefined, {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
              }).format(value as number)]
            }
            labelFormatter={(label) => label}
            cursor={{ fill: "rgba(59, 130, 246, 0.08)" }}
          />
          <Legend 
            wrapperStyle={{
              paddingTop: "12px",
              fontSize: "13px",
              fontWeight: "500",
            }}
          />
          <Bar 
            dataKey="income" 
            fill="url(#incomeGradient)" 
            name="Income" 
            radius={[6, 6, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
          />
          <Bar 
            dataKey="expenses" 
            fill="url(#expenseGradient)" 
            name="Expenses+Taxes" 
            radius={[6, 6, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}


