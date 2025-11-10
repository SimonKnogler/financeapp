"use client";

import { useState, useEffect, useMemo } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { calculatePortfolioValue, getActiveSparplans } from "@/lib/portfolio-calculator";
import { getCachedHistoricalAnalysis, getDefaultReturn } from "@/lib/historical-analysis";
import { generateProjectionV2, type AssetReturn, type ScenarioType } from "@/lib/projection-v2";
import { AssetReturnEditor } from "@/components/projections/AssetReturnEditor";
import { MilestoneCards } from "@/components/projections/MilestoneCards";
import { formatCurrency } from "@/lib/privacy";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, Clock, Target, DollarSign, Loader2 } from "lucide-react";
import type { PortfolioOwner } from "@/types/finance";

type TabView = "total" | "carolina" | "simon";

export default function ProjectionsPageV2() {
  const { 
    stocks, 
    incomes, 
    expenses, 
    privacyMode,
    customAssetReturns,
    setCustomAssetReturn 
  } = useFinanceStore();
  
  const [activeTab, setActiveTab] = useState<TabView>("total");
  const [timeframe, setTimeframe] = useState<5 | 10 | 20 | 30>(10);
  const [scenario, setScenario] = useState<ScenarioType>("realistic");
  const [loading, setLoading] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState<any>(null);
  const [assetReturns, setAssetReturns] = useState<Map<string, AssetReturn>>(new Map());
  const [assetReturnsVersion, setAssetReturnsVersion] = useState(0); // Track changes to force re-projection
  const [projection, setProjection] = useState<any>(null);
  
  // Filter stocks based on active tab
  const filteredStocks = activeTab === "total" 
    ? stocks 
    : stocks.filter(s => s.owner === activeTab);

  // Load portfolio value and historical returns
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      
      try {
        // Calculate current portfolio value for filtered stocks
        const portfolio = await calculatePortfolioValue(filteredStocks);
        setPortfolioValue(portfolio);
        
        // Fetch historical returns for each investment
        const returnsMap = new Map<string, AssetReturn>();
        
        await Promise.all(
          portfolio.breakdown
            .filter(h => h.type !== "cash")
            .map(async (holding) => {
              try {
                // Check if user has a custom return saved in the store
                const customReturn = customAssetReturns[holding.symbol];
                
                if (customReturn !== undefined) {
                  returnsMap.set(holding.symbol, {
                    symbol: holding.symbol,
                    expectedReturn: customReturn,
                    volatility: 0.15, // Default volatility
                  });
                  console.log(`💾 Using saved custom return for ${holding.symbol}: ${(customReturn * 100).toFixed(1)}%`);
                  return;
                }
                
                // For crypto, skip historical analysis and use default
                if (holding.type === "crypto") {
                  const defaultReturn = getDefaultReturn(holding.type as any, holding.symbol);
                  returnsMap.set(holding.symbol, {
                    symbol: holding.symbol,
                    expectedReturn: defaultReturn,
                    volatility: 0.40, // 40% volatility for crypto
                  });
                  console.log(`Using default return for crypto ${holding.symbol}: ${(defaultReturn * 100).toFixed(1)}%`);
                  return;
                }
                
                const analysis = await getCachedHistoricalAnalysis(holding.symbol);
                
                if (analysis) {
                  returnsMap.set(holding.symbol, {
                    symbol: holding.symbol,
                    expectedReturn: analysis.averageAnnualReturn,
                    volatility: analysis.volatility,
                  });
                  console.log(`Historical return for ${holding.symbol}: ${(analysis.averageAnnualReturn * 100).toFixed(1)}%`);
                } else {
                  // Use default return
                  const defaultReturn = getDefaultReturn(holding.type as any, holding.symbol);
                  returnsMap.set(holding.symbol, {
                    symbol: holding.symbol,
                    expectedReturn: defaultReturn,
                  });
                  console.log(`Using default return for ${holding.symbol}: ${(defaultReturn * 100).toFixed(1)}%`);
                }
              } catch (error) {
                console.error(`Failed to get returns for ${holding.symbol}:`, error);
                const defaultReturn = getDefaultReturn(holding.type as any, holding.symbol);
                returnsMap.set(holding.symbol, {
                  symbol: holding.symbol,
                  expectedReturn: defaultReturn,
                });
              }
            })
        );
        
        setAssetReturns(returnsMap);
      } catch (error) {
        console.error("Failed to load portfolio data:", error);
      }
      
      setLoading(false);
    }
    
    loadData();
  }, [stocks, customAssetReturns, activeTab]); // Reload when stocks, custom returns, or active tab change
  
  // Generate projection when dependencies change
  useEffect(() => {
    async function generateProj() {
      if (!portfolioValue || assetReturns.size === 0) return;
      
      console.log("Regenerating projection with asset returns:", Array.from(assetReturns.entries()).map(([sym, ret]) => `${sym}: ${(ret.expectedReturn * 100).toFixed(1)}%`));
      
      try {
        const proj = await generateProjectionV2(
          portfolioValue,
          filteredStocks,
          incomes,
          expenses,
          assetReturns,
          timeframe,
          scenario
        );
        
        setProjection(proj);
        console.log("✅ Projection updated - End value:", proj.summary.endingValue);
      } catch (error) {
        console.error("Failed to generate projection:", error);
      }
    }
    
    generateProj();
  }, [portfolioValue, assetReturns, assetReturnsVersion, activeTab, incomes, expenses, timeframe, scenario]);
  
  const activeSparplans = getActiveSparplans(filteredStocks);
  
  // Format chart data
  const chartData = useMemo(() => {
    if (!projection) return [];
    
    const data = projection.points
      .filter((_: any, i: number) => i % 3 === 0) // Sample every 3 months for performance
      .map((point: any) => ({
        date: new Date(point.date).toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        netWorth: point.netWorth,
        cash: point.cashValue,
        investments: point.investmentValue,
      }));
    
    console.log("📊 Chart data updated with", data.length, "points");
    return data;
  }, [projection]);
  
  const handleUpdateReturn = (symbol: string, newReturn: number) => {
    console.log(`🔄 handleUpdateReturn called for ${symbol}: ${(newReturn * 100).toFixed(1)}%`);
    const updated = new Map(assetReturns);
    const existing = updated.get(symbol);
    if (existing) {
      console.log(`  Old value: ${(existing.expectedReturn * 100).toFixed(1)}% -> New value: ${(newReturn * 100).toFixed(1)}%`);
      updated.set(symbol, { ...existing, expectedReturn: newReturn });
      setAssetReturns(updated);
      setAssetReturnsVersion(v => v + 1); // Increment version to trigger re-projection
      
      // Save to store for persistence
      setCustomAssetReturn(symbol, newReturn);
      console.log(`💾 Saved custom return to store for ${symbol}`);
    } else {
      console.error(`  Symbol ${symbol} not found in assetReturns!`);
    }
  };
  
  if (loading || !portfolioValue || !projection) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-zinc-600 dark:text-zinc-400">
            Analyzing your portfolio and fetching historical data...
          </p>
        </div>
      </div>
    );
  }
  
  const formatter = (value: number) => formatCurrency(value, "EUR", privacyMode);
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Financial Projections</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Portfolio growth projections based on current holdings, Sparpläne, and expected returns
        </p>
      </div>

      {/* Owner Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("total")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "total"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Total
        </button>
        <button
          onClick={() => setActiveTab("simon")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "simon"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Simon
        </button>
        <button
          onClick={() => setActiveTab("carolina")}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
            activeTab === "carolina"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          Carolina
        </button>
      </div>
      
      {/* Current Portfolio Summary */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Current Portfolio Snapshot
          {activeTab !== "total" && (
            <span className="text-sm font-normal text-zinc-600 dark:text-zinc-400">
              ({activeTab === "simon" ? "Simon's Portfolio" : "Carolina's Portfolio"})
            </span>
          )}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Starting Portfolio Value</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {formatter(portfolioValue.total)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Your current total holdings
            </div>
          </div>
          
          <div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Investment Holdings</div>
            <div className="text-2xl font-semibold">
              {formatter(portfolioValue.investments)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {portfolioValue.breakdown.filter((h: any) => h.type !== 'cash').length} assets growing with returns
            </div>
          </div>
          
          <div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Monthly Contributions</div>
            <div className="text-2xl font-semibold text-green-600 dark:text-green-400">
              {formatter(activeSparplans.totalMonthly)}/mo
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {activeSparplans.count} active {activeSparplans.count === 1 ? "Sparplan" : "Sparpläne"}
            </div>
          </div>
        </div>
      </div>
      
      {/* Projection Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-medium">Time Range:</span>
          <div className="flex gap-1">
            {([5, 10, 20, 30] as const).map((years) => (
              <button
                key={years}
                onClick={() => setTimeframe(years)}
                className={`px-3 py-1 text-sm rounded ${
                  timeframe === years
                    ? "bg-blue-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {years}Y
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-medium">Scenario:</span>
          <div className="flex gap-1">
            {(["conservative", "realistic", "optimistic"] as const).map((scen) => (
              <button
                key={scen}
                onClick={() => setScenario(scen)}
                className={`px-3 py-1 text-sm rounded capitalize ${
                  scenario === scen
                    ? "bg-purple-500 text-white"
                    : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {scen}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Projection Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4" key={`summary-${assetReturnsVersion}`}>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-sm text-zinc-500">Projected Value ({timeframe}Y)</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatter(projection.summary.endingValue)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {((projection.summary.endingValue / projection.summary.startingValue - 1) * 100).toFixed(1)}% total return
          </div>
        </div>
        
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-sm text-zinc-500">Total Gain</div>
          <div className="text-2xl font-bold">
            {formatter(projection.summary.totalGain)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Investment growth
          </div>
        </div>
        
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-sm text-zinc-500">Avg. Annual Return</div>
          <div className="text-2xl font-bold">
            {(projection.summary.averageAnnualReturn * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Compound annual growth
          </div>
        </div>
        
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-sm text-zinc-500">Total Contributions</div>
          <div className="text-2xl font-bold">
            {formatter(projection.summary.totalContributions)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Sparpläne contributions
          </div>
        </div>
      </div>
      
      {/* Main Projection Chart */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
        <h2 className="text-lg font-semibold mb-4">Portfolio Value Projection</h2>
        <ResponsiveContainer width="100%" height={400} key={`chart-${assetReturnsVersion}-${projection?.summary.endingValue}`}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(value) => privacyMode ? "•••" : `€${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip
              formatter={(value: number) => [formatter(value), ""]}
              contentStyle={{
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="netWorth"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.6}
              name="Total Portfolio Value"
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="mt-2 text-xs text-zinc-500">
          Shows total portfolio value including all investments and growing with compound returns + Sparplan contributions
        </div>
      </div>
      
      {/* Milestones */}
      <MilestoneCards
        projection={projection}
        currentValue={portfolioValue.total}
        privacyMode={privacyMode}
      />
      
      {/* Asset Return Editor */}
      {portfolioValue.breakdown.length > 0 && (
        <AssetReturnEditor
          holdings={portfolioValue.breakdown}
          assetReturns={assetReturns}
          onUpdateReturn={handleUpdateReturn}
          privacyMode={privacyMode}
        />
      )}
      
      {/* Methodology Note */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50 dark:bg-zinc-900/50">
        <h3 className="text-sm font-semibold mb-2">Projection Methodology</h3>
        <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
          <p>• <strong>Starting Point:</strong> Your actual current portfolio value (€{(portfolioValue.total / 1000).toFixed(1)}K)</p>
          <p>• <strong>Returns:</strong> Based on 5-year historical data or conservative estimates</p>
          <p>• <strong>Sparpläne:</strong> Automatic monthly contributions with compound growth</p>
          <p>• <strong>Growth:</strong> Investments grow monthly based on expected returns (compounding)</p>
          <p>• <strong>Scenarios:</strong> Conservative (60%), Realistic (100%), Optimistic (140%) of expected returns</p>
          <p className="text-orange-600 dark:text-orange-400">⚠️ Note: Income and expenses are NOT included in projections</p>
        </div>
      </div>
    </div>
  );
}
