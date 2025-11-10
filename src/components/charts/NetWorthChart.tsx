"use client";

import {
  LineChart,
  Line,
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
        <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            minTickGap={36}
          />
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
          <Line type="monotone" dataKey="netWorth" stroke="#3b82f6" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


