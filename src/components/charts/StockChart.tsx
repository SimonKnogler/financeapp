"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

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
        
        console.log(`StockChart: Loaded ${chartData.length} data points for ${symbol} (${range})`);
        if (chartData.length > 0) {
          console.log(`First data point:`, chartData[0]);
          console.log(`Last data point:`, chartData[chartData.length - 1]);
        }
        
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
  ];

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

  const firstPrice = data[0]?.close || 0;
  const lastPrice = data[data.length - 1]?.close || 0;
  const change = lastPrice - firstPrice;
  const changePercent = firstPrice > 0 ? (change / firstPrice) * 100 : 0;
  const isPositive = change >= 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-semibold">
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency,
              minimumFractionDigits: 2,
            }).format(lastPrice)}
          </div>
          <div
            className={`text-sm ${
              isPositive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
            }`}
          >
            {isPositive ? "+" : ""}
            {change.toFixed(2)} ({isPositive ? "+" : ""}
            {changePercent.toFixed(2)}%)
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
            tickFormatter={(value) =>
              new Intl.NumberFormat(undefined, {
                style: "currency",
                currency,
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)
            }
            width={60}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              border: "1px solid #ccc",
              borderRadius: "4px",
            }}
            formatter={(value: any) =>
              new Intl.NumberFormat(undefined, {
                style: "currency",
                currency,
                minimumFractionDigits: 2,
              }).format(value)
            }
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
          />
          <Line
            type="monotone"
            dataKey="close"
            stroke={isPositive ? "#22c55e" : "#ef4444"}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

