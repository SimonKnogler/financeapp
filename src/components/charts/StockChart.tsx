"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface StockTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ value: number }>;
  label?: string | number;
}

interface ChartDataPoint {
  date: string;
  timestamp: number;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

interface StockChartProps {
  symbol: string;
  type: "stock" | "crypto" | "etf" | "cash";
  height?: number;
}

export function StockChart({ symbol, type, height = 300 }: StockChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("1mo");
  const [currency, setCurrency] = useState("EUR");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Cash doesn't have charts, ETFs use stock endpoint
        if (type === "cash") {
          setData([]);
          setLoading(false);
          return;
        }
        
        const endpoint = type === "crypto" ? "/api/crypto-history" : "/api/stock-history";
        const response = await fetch(`${endpoint}?symbol=${encodeURIComponent(symbol)}&range=${range}`);
        if (!response.ok) {
          console.error(`Failed to fetch chart data for ${symbol}`);
          setData([]);
          setLoading(false);
          return;
        }
        const result = await response.json();
        const chartData = result.data || [];
        
        setData(chartData);
        setCurrency(result.currency || "EUR");
      } catch (error) {
        console.error(`Error fetching chart for ${symbol}:`, error);
        setData([]);
      }
      setLoading(false);
    }
    fetchData();
  }, [symbol, range, type]);

  const ranges = [
    { label: "1D", value: "1d" },
    { label: "5D", value: "5d" },
    { label: "1M", value: "1mo" },
    { label: "6M", value: "6mo" },
    { label: "1Y", value: "1y" },
    { label: "5Y", value: "5y" },
    { label: "All", value: "max" },
  ];

  const firstPrice = data[0]?.close || 0;
  const lastPrice = data[data.length - 1]?.close || 0;
  const change = lastPrice - firstPrice;
  const changePercent = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
  const isPositive = change >= 0;

  const renderTooltip = useCallback(
    (props: StockTooltipProps) => {
      const { active, payload, label } = props;
      if (!active || !payload || payload.length === 0) {
        return null;
      }

      const value = payload[0]?.value ?? 0;

      return (
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            border: "none",
            borderRadius: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              color: "#52525b",
              fontWeight: 600,
              marginBottom: "6px",
              fontSize: "13px",
            }}
          >
            {(() => {
              const date = new Date((label ?? "") as string);
              if (range === "1d" || range === "5d") {
                return date.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });
              }
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
            })()}
          </div>
          <div
            style={{
              color: isPositive ? "#10b981" : "#f43f5e",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency,
              minimumFractionDigits: 2,
            }).format(value as number)}
          </div>
        </div>
      );
    },
    [currency, isPositive, range]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-sm text-zinc-500">Loading chart...</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-sm text-zinc-500">No chart data available</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className={`text-sm font-medium ${
            isPositive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
          }`}
        >
          {`${isPositive ? "+" : ""}${new Intl.NumberFormat(undefined, {
            style: "currency",
            currency,
            minimumFractionDigits: 2,
          }).format(change)} (${isPositive ? "+" : ""}${changePercent.toFixed(2)}%)`}
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
            <linearGradient id={`stockGradientGreen-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.5} />
              <stop offset="50%" stopColor="#10b981" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`stockGradientRed-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.5} />
              <stop offset="50%" stopColor="#f43f5e" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
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
              if (range === "1d" || range === "5d") {
                return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
              }
              return `${date.getMonth() + 1}/${date.getDate()}`;
            }}
            minTickGap={30}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            axisLine={false}
            tickLine={false}
            domain={["auto", "auto"]}
            tickFormatter={(value) =>
              new Intl.NumberFormat(undefined, {
                style: "currency",
                currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)
            }
            width={70}
          />
          <Tooltip
            cursor={{ stroke: isPositive ? "#10b981" : "#f43f5e", strokeWidth: 1, strokeDasharray: "4 4" }}
            content={renderTooltip}
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke={isPositive ? "#10b981" : "#f43f5e"}
            strokeWidth={3}
            fill={isPositive ? `url(#stockGradientGreen-${symbol})` : `url(#stockGradientRed-${symbol})`}
            fillOpacity={1}
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

