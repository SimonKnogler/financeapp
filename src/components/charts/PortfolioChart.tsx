"use client";

import { useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Line,
} from "recharts";
import { useFinanceStore } from "@/store/finance-store";
import type { PortfolioSnapshot } from "@/types/finance";

export type PortfolioRange = "1d" | "1w" | "1m" | "ytd" | "1y" | "max";
export type PortfolioValueMode = "absolute" | "percentage";

interface BenchmarkPoint {
  date: string;
  close: number;
}

interface PortfolioChartProps {
  portfolioHistory: PortfolioSnapshot[];
  currentValue: number;
  height?: number;
  baselineValue?: number;
  range: PortfolioRange;
  benchmarkSeries?: BenchmarkPoint[] | null;
  benchmarkLabel?: string | null;
  valueMode: PortfolioValueMode;
}

interface TooltipPayloadItem {
  value: number | null;
  dataKey?: string;
  color?: string;
}

interface ChartPoint {
  date: string;
  portfolio: number | null;
  benchmark: number | null;
}

export function getPortfolioRangeStart(range: PortfolioRange, today: Date) {
  const start = new Date(today);
  switch (range) {
    case "1d":
      start.setDate(today.getDate() - 1);
      break;
    case "1w":
      start.setDate(today.getDate() - 7);
      break;
    case "1m":
      start.setMonth(today.getMonth() - 1);
      break;
    case "ytd":
      start.setMonth(0, 1); // January 1st of current year
      break;
    case "1y":
      start.setFullYear(today.getFullYear() - 1);
      break;
    case "max":
      start.setFullYear(2000);
      break;
  }
  return start;
}

export function PortfolioChart({
  portfolioHistory,
  currentValue,
  height = 300,
  baselineValue,
  range,
  benchmarkSeries,
  benchmarkLabel,
  valueMode,
}: PortfolioChartProps) {
  const privacyMode = useFinanceStore((s) => s.privacyMode);

  const { data, benchmarkActive, formatter, isPositive } = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const startDate = getPortfolioRangeStart(range, today);
    const startDateStr = startDate.toISOString().split("T")[0];

    const portfolioByDate = new Map<string, number>();
    portfolioHistory.forEach((snapshot) => {
      if (snapshot.dateISO >= startDateStr) {
        portfolioByDate.set(snapshot.dateISO, snapshot.investmentValue);
      }
    });
    portfolioByDate.set(todayStr, currentValue);

    let portfolioPoints = Array.from(portfolioByDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (baselineValue !== undefined && portfolioPoints.length > 0) {
      const firstValue = portfolioPoints[0].value;
      if (Math.abs(firstValue - baselineValue) > 0.5) {
        const baselineDate = new Date(portfolioPoints[0].date);
        baselineDate.setDate(baselineDate.getDate() - 1);
        const baselineDateStr = baselineDate.toISOString().split("T")[0];
        portfolioPoints = [{ date: baselineDateStr, value: baselineValue }, ...portfolioPoints];
      }
    }

    if (portfolioPoints.length === 0) {
      portfolioPoints = [{ date: todayStr, value: currentValue }];
    }

    const benchmarkMap = new Map<string, number>();
    if (benchmarkSeries && benchmarkSeries.length > 0) {
      benchmarkSeries.forEach((point) => {
        const dateKey = point.date.split("T")[0];
        if (dateKey >= startDateStr) {
          benchmarkMap.set(dateKey, point.close);
        }
      });
    }

    const dateSet = new Set<string>();
    portfolioPoints.forEach((p) => dateSet.add(p.date));
    benchmarkMap.forEach((_value, date) => dateSet.add(date));
    const sortedDates = Array.from(dateSet).sort((a, b) => a.localeCompare(b));

    const portfolioMap = new Map(portfolioPoints.map((p) => [p.date, p.value] as const));
    const firstPortfolioValue = portfolioPoints[0]?.value ?? currentValue;

    const firstCommonDate = sortedDates.find(
      (date) => portfolioMap.has(date) && benchmarkMap.has(date)
    );
    const normalizationPortfolioValue: number =
      firstCommonDate && portfolioMap.get(firstCommonDate) !== undefined
        ? portfolioMap.get(firstCommonDate)!
        : firstPortfolioValue;
    const initialBenchmarkClose: number | undefined = firstCommonDate
      ? benchmarkMap.get(firstCommonDate)
      : undefined;

    const chartPoints: ChartPoint[] = sortedDates
      .map((date) => {
        const portfolioValue = portfolioMap.get(date) ?? null;
        const benchmarkClose = benchmarkMap.get(date);
        let benchmarkValue: number | null = null;
        if (
          benchmarkClose !== undefined &&
          firstCommonDate &&
          date >= firstCommonDate &&
          normalizationPortfolioValue > 0 &&
          initialBenchmarkClose !== undefined &&
          initialBenchmarkClose > 0
        ) {
          benchmarkValue =
            normalizationPortfolioValue * (benchmarkClose / initialBenchmarkClose);
        }
        return {
          date,
          portfolio: portfolioValue,
          benchmark: benchmarkValue,
        };
      })
      .filter((point) => point.portfolio !== null || point.benchmark !== null);

    const effectiveBaselineValue =
      baselineValue !== undefined ? baselineValue : portfolioPoints[0]?.value ?? currentValue;
    const lastPortfolioValue = portfolioPoints[portfolioPoints.length - 1]?.value ?? currentValue;

    const absoluteChange = lastPortfolioValue - effectiveBaselineValue;
    const absoluteChangePercent =
      effectiveBaselineValue > 0 ? absoluteChange / effectiveBaselineValue : 0;

    const percentagePoints =
      valueMode === "percentage"
        ? chartPoints.map((point) => ({
            ...point,
            portfolio:
              point.portfolio !== null && effectiveBaselineValue > 0
                ? point.portfolio / effectiveBaselineValue - 1
                : null,
            benchmark:
              point.benchmark !== null && normalizationPortfolioValue > 0
                ? point.benchmark / normalizationPortfolioValue - 1
                : null,
          }))
        : chartPoints;

    const formatter =
      valueMode === "percentage"
        ? new Intl.NumberFormat(undefined, {
            style: "percent",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        : new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          });

    return {
      data: percentagePoints,
      benchmarkActive: benchmarkMap.size > 0,
      formatter,
      isPositive: valueMode === "percentage" ? absoluteChangePercent >= 0 : absoluteChange >= 0,
    };
  }, [baselineValue, currentValue, portfolioHistory, range, benchmarkSeries, valueMode]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="text-sm text-zinc-500">Portfolio tracking will begin from today</div>
      </div>
    );
  }

  const renderTooltip = useCallback(
    ({ active, payload, label }: { active?: boolean; payload?: ReadonlyArray<TooltipPayloadItem>; label?: string | number }) => {
      if (!active || !payload || payload.length === 0) {
        return null;
      }

      const portfolioEntry = payload.find((item) => item.dataKey === "portfolio");
      const benchmarkEntry = payload.find((item) => item.dataKey === "benchmark");

      return (
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.98)",
            border: "none",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            padding: "12px",
          }}
        >
          <div
            style={{
              color: "#52525b",
              fontWeight: 500,
              marginBottom: "4px",
            }}
          >
            {label
              ? new Date(String(label)).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : ""}
          </div>
          {portfolioEntry && portfolioEntry.value != null && (
            <div
              style={{
                color: isPositive ? "#22c55e" : "#ef4444",
                fontWeight: 600,
              }}
            >
              {privacyMode
                ? "•••••"
                : valueMode === "percentage"
                ? `${Number(portfolioEntry.value) >= 0 ? "+" : ""}${formatter.format(
                    Number(portfolioEntry.value)
                  )}`
                : formatter.format(Number(portfolioEntry.value))}
            </div>
          )}
          {benchmarkEntry && benchmarkEntry.value != null && (
            <div
              style={{
                color: "#2563eb",
                fontWeight: 600,
                marginTop: "4px",
              }}
            >
              {benchmarkLabel ?? "Benchmark"}:{" "}
              {privacyMode
                ? "•••••"
                : valueMode === "percentage"
                ? `${Number(benchmarkEntry.value) >= 0 ? "+" : ""}${formatter.format(
                    Number(benchmarkEntry.value)
                  )}`
                : formatter.format(Number(benchmarkEntry.value))}
            </div>
          )}
        </div>
      );
    },
    [formatter, isPositive, privacyMode, benchmarkLabel, valueMode]
  );

  const yTickFormatter = (value: number) => {
    if (privacyMode) {
      return "•••";
    }
    if (valueMode === "percentage") {
      const percentValue = value * 100;
      return `${percentValue >= 0 ? "+" : ""}${percentValue.toFixed(0)}%`;
    }
    return formatter.format(value);
  };

  const cursorColor = isPositive ? "#22c55e" : "#ef4444";

  return (
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
          minTickGap={30}
          tickFormatter={(value) => {
            const date = new Date(value);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          }}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          axisLine={false}
          tickLine={false}
          domain={["auto", "auto"]}
          tickFormatter={(value) => yTickFormatter(Number(value))}
          width={80}
        />
        <Tooltip
          cursor={{ stroke: cursorColor, strokeWidth: 1, strokeDasharray: "4 4" }}
          content={renderTooltip}
        />
        <Area
          type="monotone"
          dataKey="portfolio"
          stroke={cursorColor}
          strokeWidth={3}
          fill={isPositive ? "url(#portfolioGradientGreen)" : "url(#portfolioGradientRed)"}
          fillOpacity={1}
          animationDuration={800}
          animationEasing="ease-out"
          connectNulls
        />
        {benchmarkActive && (
          <Line
            type="monotone"
            dataKey="benchmark"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            connectNulls
            strokeDasharray="6 3"
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}

