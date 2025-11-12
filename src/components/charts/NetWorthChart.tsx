"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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

export function NetWorthChart({
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
    netWorth: Math.round(p.netWorth),
  }));
  const ticks = [0, Math.round((chartData[chartData.length - 1]?.netWorth ?? 0) / 2), chartData[chartData.length - 1]?.netWorth ?? 0];
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 12, bottom: 8 }}>
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
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
              color: "#3b82f6",
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
              }).format(value as number), "Net Worth"]
            }
            labelFormatter={(label) => label}
            cursor={{ stroke: "#3b82f6", strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Area 
            type="monotone" 
            dataKey="netWorth" 
            stroke="#3b82f6" 
            strokeWidth={3}
            fill="url(#netWorthGradient)"
            fillOpacity={1}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}


