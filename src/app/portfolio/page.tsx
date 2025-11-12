"use client";

import { useState, useEffect } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { fetchStockPrices } from "@/lib/stock-prices";
import { fetchStockNewsMultiple } from "@/lib/stock-news";
import { StockChart } from "@/components/charts/StockChart";
import { PortfolioChart } from "@/components/charts/PortfolioChart";
import { SparplanModal } from "@/components/portfolio/SparplanModal";
import { SellModal } from "@/components/portfolio/SellModal";
import { RevolutImport } from "@/components/portfolio/RevolutImport";
import { formatCurrency, formatCurrencyDetailed, formatNumber, formatPercent } from "@/lib/privacy";
import type { StockPrice, StockNews, StockHolding, AssetType, PortfolioOwner } from "@/types/finance";

type TabView = "total" | "carolina" | "simon";

export default function PortfolioPage() {
  const stocks: StockHolding[] = useFinanceStore((s) => s.stocks);
  const addStock = useFinanceStore((s) => s.addStock);
  const removeStock = useFinanceStore((s) => s.removeStock);
  const updateStock = useFinanceStore((s) => s.updateStock);
  const portfolioHistory = useFinanceStore((s) => s.portfolioHistory);
  const addPortfolioSnapshot = useFinanceStore((s) => s.addPortfolioSnapshot);
  const updatePortfolioSnapshot = useFinanceStore((s) => s.updatePortfolioSnapshot);
  const goals = useFinanceStore((s) => s.goals);
  const currency = useFinanceStore((s) => s.assumptions.currency);
  const privacyMode = useFinanceStore((s) => s.privacyMode);

  const [activeTab, setActiveTab] = useState<TabView>("total");
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState<string>("0");
  const [costBasis, setCostBasis] = useState<string>("");
  const [purchaseDateISO, setPurchaseDateISO] = useState<string>("");
  const [assetType, setAssetType] = useState<"stock" | "crypto" | "etf" | "cash">("stock");

  const [prices, setPrices] = useState<Map<string, StockPrice>>(new Map());
  const [news, setNews] = useState<Map<string, StockNews[]>>(new Map());
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [expandedNews, setExpandedNews] = useState<string | null>(null);
  const [expandedChart, setExpandedChart] = useState<string | null>(null);
  const [sparplanModalStock, setSparplanModalStock] = useState<StockHolding | null>(null);
  const [sellModalStock, setSellModalStock] = useState<{ stock: StockHolding; price: number } | null>(null);
  const [editingStock, setEditingStock] = useState<StockHolding | null>(null);
  const [showRevolutImport, setShowRevolutImport] = useState(false);

  function resetCostBasisToCurrentPrices() {
    if (!confirm("This will set the cost basis of all positions to their current market price. This action cannot be undone. Continue?")) {
      return;
    }

    let updatedCount = 0;
    stocks.forEach((stock) => {
      // Skip cash accounts
      if (stock.type === "cash") return;

      const price = prices.get(stock.symbol.toUpperCase());
      if (price?.price) {
        updateStock(stock.id, {
          costBasis: price.price,
        });
        updatedCount++;
      }
    });

    alert(`Updated cost basis for ${updatedCount} position(s) to current market prices.`);
  }

  async function refreshPrices(forceRefresh: boolean = false) {
    if (stocks.length === 0) {
      setPrices(new Map());
      setNews(new Map());
      return;
    }
    setLoading(true);
    
    const priceMap = new Map<string, StockPrice>();
    const newsMap = new Map<string, StockNews[]>();
    
    // Add cache buster for manual refresh
    const cacheBuster = forceRefresh ? `&_t=${Date.now()}` : '';
    
    // Helper function to fetch with timeout
    const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
    };
    
    // Fetch prices and news for each asset based on type
    await Promise.all(
      stocks.map(async (stock) => {
        try {
          // Cash doesn't need price fetching (always 1:1)
          if (stock.type === "cash") {
            priceMap.set(stock.symbol.toUpperCase(), {
              symbol: stock.symbol.toUpperCase(),
              price: 1,
              currency: "EUR",
              timestamp: Date.now(),
            });
            return;
          }

          // Fetch price (ETFs use same endpoint as stocks)
          const priceEndpoint = stock.type === "crypto" ? "/api/crypto-price" : "/api/stock-price";
          const priceRes = await fetchWithTimeout(
            `${priceEndpoint}?symbol=${encodeURIComponent(stock.symbol)}${cacheBuster}`,
            { cache: forceRefresh ? 'no-store' : 'default' },
            10000 // 10 second timeout
          );
          if (priceRes.ok) {
            const priceData = await priceRes.json();
            // Convert to EUR if needed (stocks and ETFs)
            if ((stock.type === "stock" || stock.type === "etf") && priceData.currency !== "EUR") {
              // Stock/ETF prices converted via our existing service
              const stockPrice = await fetchStockPrices([stock.symbol], "EUR");
              const price = stockPrice.get(stock.symbol.toUpperCase());
              if (price) {
                console.log(`${stock.symbol}: ${price.price} ${price.currency} (converted from ${priceData.currency})`);
                priceMap.set(stock.symbol.toUpperCase(), price);
              }
            } else {
              console.log(`${stock.symbol}: ${priceData.price} ${priceData.currency}`);
              priceMap.set(stock.symbol.toUpperCase(), priceData);
            }
          } else {
            // Price fetch failed - log but don't add to map (will show "Error" in UI)
            console.error(`Failed to fetch price for ${stock.symbol}: ${priceRes.status}`);
          }
          
          // Fetch news (ETFs use same endpoint as stocks, no news for cash)
          if (stock.type === "crypto" || stock.type === "stock" || stock.type === "etf") {
            const newsEndpoint = stock.type === "crypto" ? "/api/crypto-news" : "/api/stock-news";
            const newsRes = await fetchWithTimeout(
              `${newsEndpoint}?symbol=${encodeURIComponent(stock.symbol)}${cacheBuster}`,
              { cache: forceRefresh ? 'no-store' : 'default' },
              10000 // 10 second timeout
            );
            if (newsRes.ok) {
              const newsData = await newsRes.json();
              newsMap.set(stock.symbol.toUpperCase(), newsData.news || []);
            }
          }
        } catch (error) {
          console.error(`Error fetching data for ${stock.symbol}:`, error);
        }
      })
    );
    
    setPrices(priceMap);
    setNews(newsMap);
    setLastUpdate(new Date());
    setLoading(false);

    // Save daily snapshots for each owner (total, simon, carolina) if we haven't already today
    const today = new Date().toISOString().split('T')[0];
    
    // Function to calculate and save snapshot for a specific owner
    const saveSnapshotForOwner = (owner: "total" | "simon" | "carolina") => {
      const lastSnapshot = portfolioHistory.find(
        (s) => s.dateISO === today && s.owner === owner
      );
      
      if (!lastSnapshot) {
        // Filter stocks by owner
        const ownerStocks = owner === "total" ? stocks : stocks.filter(s => s.owner === owner);
        
        // Calculate values
        const cashVal = ownerStocks
          .filter((s) => s.type === "cash")
          .reduce((sum, stock) => sum + stock.shares, 0);

        const invVal = ownerStocks
          .filter((s) => s.type !== "cash")
          .reduce((sum, stock) => {
            const price = priceMap.get(stock.symbol.toUpperCase());
            if (!price) return sum;
            return sum + stock.shares * price.price;
          }, 0);

        addPortfolioSnapshot({
          dateISO: today,
          totalValue: cashVal + invVal,
          cashValue: cashVal,
          investmentValue: invVal,
          owner,
        });
        
        console.log(`Saved ${owner} portfolio snapshot for ${today}: €${(cashVal + invVal).toFixed(2)}`);
      }
    };
    
    // Save snapshots for all three views
    saveSnapshotForOwner("total");
    saveSnapshotForOwner("simon");
    saveSnapshotForOwner("carolina");
  }

  useEffect(() => {
    refreshPrices();
    // Auto-refresh every 2 minutes
    const interval = setInterval(refreshPrices, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [stocks.length]);
  
  // Update snapshots whenever stocks change (to keep today's snapshot current)
  useEffect(() => {
    if (prices.size > 0) {
      // Recalculate and update today's snapshot for all owners
      const today = new Date().toISOString().split('T')[0];
      
      ["total", "simon", "carolina"].forEach((owner) => {
        const ownerStocks = owner === "total" ? stocks : stocks.filter(s => s.owner === owner);
        
        const cashVal = ownerStocks
          .filter((s) => s.type === "cash")
          .reduce((sum, stock) => sum + stock.shares, 0);

        const invVal = ownerStocks
          .filter((s) => s.type !== "cash")
          .reduce((sum, stock) => {
            const price = prices.get(stock.symbol.toUpperCase());
            if (!price) return sum;
            return sum + stock.shares * price.price;
          }, 0);

        console.log(`Updating ${owner} snapshot: €${(cashVal + invVal).toFixed(2)}`);
        
        // This will update if exists, or create new if not
        updatePortfolioSnapshot({
          dateISO: today,
          totalValue: cashVal + invVal,
          cashValue: cashVal,
          investmentValue: invVal,
          owner: owner as "total" | "simon" | "carolina",
        });
      });
    }
  }, [stocks, prices]);

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    
    // Determine owner based on active tab
    const owner: PortfolioOwner = activeTab === "carolina" ? "carolina" : "simon";
    
    console.log(`Adding asset: type=${assetType}, symbol=${symbol}, shares=${shares}, owner=${owner}`);
    
    addStock({
      symbol: symbol.toUpperCase(),
      shares: parseFloat(shares) || 0,
      costBasis: costBasis ? parseFloat(costBasis) : undefined,
      purchaseDateISO: purchaseDateISO || undefined,
      type: assetType,
      owner,
    });
    setSymbol("");
    setShares("0");
    setCostBasis("");
    setPurchaseDateISO("");
    setAssetType("cash"); // Keep last selection
  }

  // Filter stocks based on active tab
  const filteredStocks = activeTab === "total" 
    ? stocks 
    : stocks.filter(s => s.owner === activeTab);

  // Separate cash from investments for filtered stocks
  const cashValue = filteredStocks
    .filter((s) => s.type === "cash")
    .reduce((sum, stock) => sum + stock.shares, 0); // For cash, shares = amount

  const investmentValue = filteredStocks
    .filter((s) => s.type !== "cash")
    .reduce((sum, stock) => {
      const price = prices.get(stock.symbol.toUpperCase());
      if (!price) return sum;
      return sum + stock.shares * price.price;
    }, 0);

  const totalValue = cashValue + investmentValue;

  // Only calculate cost/gain for investments (not cash) in filtered stocks
  const totalCost = filteredStocks
    .filter((s) => s.type !== "cash")
    .reduce((sum, stock) => {
      if (!stock.costBasis) return sum;
      return sum + stock.shares * stock.costBasis;
    }, 0);

  const totalGain = totalCost > 0 ? investmentValue - totalCost : 0;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const activeSparplans = filteredStocks.filter((s) => s.sparplan?.active);
  const totalMonthlyInvestment = activeSparplans.reduce(
    (sum, s) => sum + (s.sparplan?.monthlyAmount || 0),
    0
  );

  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Portfolio</h1>
        <div className="flex gap-2">
          {activeTab !== "total" && (
            <button
              onClick={() => setShowRevolutImport(true)}
              className="rounded-md border border-purple-200 dark:border-purple-800 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              title="Import positions from Revolut CSV"
            >
              Import Revolut
            </button>
          )}
          <button
            onClick={resetCostBasisToCurrentPrices}
            disabled={loading || stocks.filter(s => s.type !== "cash").length === 0}
            className="rounded-md border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50"
            title="Reset all cost bases to current market prices (starts gain/loss tracking from today)"
          >
            Reset Cost Basis
          </button>
        <button
          onClick={() => refreshPrices(true)}
          disabled={loading}
          className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh Prices"}
        </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab("total")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "total"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          Total
        </button>
        <button
          onClick={() => setActiveTab("carolina")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "carolina"
              ? "border-purple-500 text-purple-600 dark:text-purple-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          Carolina
        </button>
        <button
          onClick={() => setActiveTab("simon")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === "simon"
              ? "border-green-500 text-green-600 dark:text-green-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          Simon
        </button>
      </div>

      {lastUpdate && (
        <div className="text-xs text-zinc-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {/* Portfolio Performance Chart */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="mb-3 font-semibold">Investment Performance</div>
        <PortfolioChart 
          portfolioHistory={portfolioHistory.filter(s => s.owner === activeTab)} 
          currentValue={investmentValue} 
          baselineValue={totalCost > 0 ? totalCost : undefined}
          height={280} 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-sm text-zinc-500">Total Portfolio</div>
          <div className="text-2xl font-semibold">{formatCurrency(totalValue, "EUR", privacyMode)}</div>
          <div className="text-xs text-zinc-500 mt-1">
            Investments + Cash
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-sm text-zinc-500">Cash</div>
          <div className="text-2xl font-semibold">{formatCurrency(cashValue, "EUR", privacyMode)}</div>
          <div className="text-xs text-zinc-500 mt-1">
            Liquid assets
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-sm text-zinc-500">Investments</div>
          <div className="text-2xl font-semibold">{formatCurrency(investmentValue, "EUR", privacyMode)}</div>
          <div className="text-xs text-zinc-500 mt-1">
            Stocks, ETFs, Crypto
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-sm text-zinc-500">Investment Gain/Loss</div>
          <div
            className={`text-2xl font-semibold ${
              totalGain >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
            }`}
          >
            {formatCurrency(totalGain, "EUR", privacyMode)}
          </div>
          <div className={`text-xs ${totalGain >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
            {formatPercent(totalGainPercent, privacyMode)} return
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-sm text-zinc-500">Active Sparpläne</div>
          <div className="text-2xl font-semibold">
            {formatCurrency(totalMonthlyInvestment, "EUR", privacyMode)}/mo
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {activeSparplans.length} {activeSparplans.length === 1 ? "plan" : "plans"}
          </div>
        </div>
      </div>

      {/* Goal Allocation Summary */}
      {goals.length > 0 && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="text-lg font-semibold mb-3">Goal Allocation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {goals.map((goal) => {
              const allocatedHoldings = filteredStocks.filter(s => s.goalId === goal.id);
              const allocatedValue = allocatedHoldings.reduce((sum, stock) => {
                const assetType = stock.type || "stock";
                if (assetType === "cash") {
                  return sum + stock.shares;
                }
                const price = prices.get(stock.symbol.toUpperCase());
                const currentPrice = price?.price ?? 0;
                return sum + (stock.shares * currentPrice);
              }, 0);
              
              return (
                <div key={goal.id} className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-900/50">
                  <div className="text-sm font-medium mb-1">{goal.name}</div>
                  <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(allocatedValue, "EUR", privacyMode)}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {allocatedHoldings.length} {allocatedHoldings.length === 1 ? "holding" : "holdings"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Only show add form for individual portfolios */}
      {activeTab !== "total" && (
        <form
          onSubmit={onAdd}
          className="grid grid-cols-1 md:grid-cols-6 gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
        >
        <select
          value={assetType}
          onChange={(e) => setAssetType(e.target.value as "stock" | "crypto" | "etf" | "cash")}
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
        >
          <option value="cash">Cash</option>
          <option value="stock">Stock</option>
          <option value="etf">ETF/Index</option>
          <option value="crypto">Crypto</option>
        </select>
        <input
          required
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder={
            assetType === "cash"
              ? "Name (e.g., Checking, Savings)"
              : assetType === "crypto" 
              ? "Symbol (e.g., BTC, ETH)" 
              : assetType === "etf"
              ? "Symbol (e.g., IWDA.AS, VWCE.DE)"
              : "Symbol (e.g., AAPL, ASML.AS)"
          }
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
          title={
            assetType === "cash"
              ? "Enter account name (e.g., Checking Account, Savings)"
              : assetType === "etf"
              ? "iShares Core MSCI World: IWDA.AS (Amsterdam), EUNL.DE (Frankfurt), SWDA.L (London)"
              : "For European stocks, add exchange suffix (e.g., ASML.AS for Amsterdam, SAP.DE for Frankfurt)"
          }
        />
        <input
          required
          value={shares}
          onChange={(e) => setShares(e.target.value)}
          placeholder={assetType === "cash" ? "Amount (EUR)" : "Shares"}
          type="number"
          step="any"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
        />
        <input
          value={costBasis}
          onChange={(e) => setCostBasis(e.target.value)}
          placeholder="Cost Basis (optional)"
          type="number"
          step="any"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
        />
        <input
          type="date"
          value={purchaseDateISO}
          onChange={(e) => setPurchaseDateISO(e.target.value)}
          placeholder="Purchase Date"
          className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
        />
        <button
          type="submit"
          className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          Add
        </button>
      </form>
      )}

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-900/50">
            <tr>
              <th className="text-left p-2">Type</th>
              <th className="text-left p-2">Symbol</th>
              <th className="text-right p-2">Shares</th>
              <th className="text-right p-2">Cost Basis</th>
              <th className="text-right p-2">Current Price</th>
              <th className="text-right p-2">Market Value</th>
              <th className="text-right p-2">Gain/Loss</th>
              <th className="text-left p-2">Goal</th>
              <th className="text-left p-2">Purchase Date</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {filteredStocks.map((stock) => {
              // Default type to "stock" if missing (for old data)
              const assetType = stock.type || "stock";
              
              const price = prices.get(stock.symbol.toUpperCase());
              const currentPrice = price?.price ?? 0;
              
              // For cash, market value = amount entered (shares field)
              // For investments, market value = shares * price
              const marketValue = assetType === "cash" ? stock.shares : stock.shares * currentPrice;
              
              // Only calculate gain/loss for investments
              const costValue = assetType !== "cash" && stock.costBasis ? stock.shares * stock.costBasis : 0;
              const gain = costValue > 0 ? marketValue - costValue : 0;
              const gainPercent = costValue > 0 ? (gain / costValue) * 100 : 0;

              return (
                <tr key={stock.id} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="p-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      assetType === "crypto" 
                        ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" 
                        : assetType === "etf"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        : assetType === "cash"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    }`}>
                      {assetType === "crypto" ? "₿" : assetType === "etf" ? "📊" : assetType === "cash" ? "💵" : "📈"}
                    </span>
                  </td>
                  <td className="p-2 font-mono font-semibold">{stock.symbol}</td>
                  <td className="p-2 text-right">
                    {assetType === "cash" ? "-" : formatNumber(stock.shares, privacyMode)}
                  </td>
                  <td className="p-2 text-right">
                    {assetType === "cash" ? "-" : stock.costBasis ? formatCurrencyDetailed(stock.costBasis, "EUR", privacyMode) : "-"}
                  </td>
                  <td className="p-2 text-right">
                    {assetType === "cash" ? (
                      <span className="text-zinc-500">Cash</span>
                    ) : loading ? (
                      <span className="text-zinc-400">Loading...</span>
                    ) : price && currentPrice > 0 ? (
                      formatCurrencyDetailed(currentPrice, "EUR", privacyMode)
                    ) : (
                      <span className="text-red-500 dark:text-red-400 text-xs" title="Failed to fetch price. Click 'Refresh Prices' to retry.">
                        Error
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-right font-semibold">{formatCurrency(marketValue, "EUR", privacyMode)}</td>
                  <td
                    className={`p-2 text-right ${
                      assetType === "cash" 
                        ? "text-zinc-500"
                        : gain >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
                    }`}
                  >
                    {assetType === "cash" ? (
                      "-"
                    ) : stock.costBasis ? (
                      <>
                        {formatCurrency(gain, "EUR", privacyMode)} ({formatPercent(gainPercent, privacyMode)})
                      </>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="p-2">
                    <select
                      value={stock.goalId || ""}
                      onChange={(e) => updateStock(stock.id, { goalId: e.target.value || undefined })}
                      className="text-xs rounded border border-zinc-300 dark:border-zinc-700 bg-transparent px-1 py-0.5"
                    >
                      <option value="">None</option>
                      {goals.map((goal) => (
                        <option key={goal.id} value={goal.id}>
                          {goal.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">{stock.purchaseDateISO ?? "-"}</td>
                  <td className="p-2 text-right space-x-2">
                    <button
                      onClick={() => setEditingStock(stock)}
                      className="rounded-md border border-blue-200 dark:border-blue-800 px-2 py-1 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      title="Edit holding details"
                    >
                      Edit
                    </button>
                    {assetType === "etf" && (
                      <button
                        onClick={() => setSparplanModalStock(stock)}
                        className={`rounded-md border px-2 py-1 text-xs ${
                          stock.sparplan?.active
                            ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400"
                            : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                        title={
                          stock.sparplan?.active
                            ? `Active: €${stock.sparplan.monthlyAmount}/month on day ${stock.sparplan.executionDay}`
                            : "Set up Sparplan"
                        }
                      >
                        {stock.sparplan?.active ? `€${stock.sparplan.monthlyAmount}/mo` : "Sparplan"}
                      </button>
                    )}
                    {assetType !== "cash" && (
                      <button
                        onClick={() => setSellModalStock({ stock, price: currentPrice })}
                        className="rounded-md border border-red-200 dark:border-red-800 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Sell
                      </button>
                    )}
                    <button
                      onClick={() => removeStock(stock.id)}
                      className="rounded-md border border-zinc-200 dark:border-zinc-800 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredStocks.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Stock Charts & News</h2>
          {filteredStocks.map((stock) => {
            const stockNews = news.get(stock.symbol.toUpperCase()) || [];
            const isNewsExpanded = expandedNews === stock.symbol;
            const isChartExpanded = expandedChart === stock.symbol;

            return (
              <div key={stock.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                {/* Header */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                  <h3 className="font-semibold font-mono text-lg">{stock.symbol}</h3>
                </div>

                {/* Chart Section */}
                <div className="border-b border-zinc-200 dark:border-zinc-800">
                  <button
                    onClick={() => setExpandedChart(isChartExpanded ? null : stock.symbol)}
                    className="w-full p-4 text-left flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                  >
                    <span className="text-sm font-medium">Price Chart</span>
                    <span className="text-sm text-zinc-500">{isChartExpanded ? "Hide" : "Show"}</span>
                  </button>
                  {isChartExpanded && (
                    <div className="p-4 bg-white dark:bg-zinc-950">
                      <StockChart symbol={stock.symbol} type={stock.type} height={280} />
                    </div>
                  )}
                </div>

                {/* News Section */}
                {stockNews.length > 0 && (
                  <div>
                    <button
                      onClick={() => setExpandedNews(isNewsExpanded ? null : stock.symbol)}
                      className="w-full p-4 text-left flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition-colors"
                    >
                      <span className="text-sm font-medium">Latest News</span>
                      <span className="text-sm text-zinc-500">
                        {isNewsExpanded ? "Hide" : "Show"} {stockNews.length} articles
                      </span>
                    </button>
                    {isNewsExpanded && (
                      <div className="p-4 space-y-3 bg-white dark:bg-zinc-950">
                        {stockNews.map((article, idx) => (
                          <a
                            key={idx}
                            href={article.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex gap-3 p-3 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                          >
                            {article.thumbnail && (
                              <img
                                src={article.thumbnail}
                                alt=""
                                className="w-20 h-20 object-cover rounded flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm line-clamp-2 mb-1">
                                {article.title}
                              </div>
                              <div className="text-xs text-zinc-500">
                                {article.publisher}
                                {article.publishedAt && (
                                  <> · {new Date(article.publishedAt).toLocaleDateString()}</>
                                )}
                              </div>
                            </div>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sparplanModalStock && (
        <SparplanModal
          stock={sparplanModalStock}
          onClose={() => setSparplanModalStock(null)}
        />
      )}

      {sellModalStock && (
        <SellModal
          stock={sellModalStock.stock}
          currentPrice={sellModalStock.price}
          onClose={() => setSellModalStock(null)}
        />
      )}

      {showRevolutImport && (
        <RevolutImport
          owner={activeTab === "carolina" ? "carolina" : "simon"}
          onClose={() => setShowRevolutImport(false)}
        />
      )}

      {/* Edit Stock Modal */}
      {editingStock && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingStock(null)}>
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-lg w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Edit {editingStock.symbol}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              updateStock(editingStock.id, {
                shares: parseFloat(formData.get('shares') as string) || editingStock.shares,
                costBasis: formData.get('costBasis') ? parseFloat(formData.get('costBasis') as string) : editingStock.costBasis,
                purchaseDateISO: (formData.get('purchaseDate') as string) || editingStock.purchaseDateISO,
              });
              setEditingStock(null);
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {editingStock.type === "cash" ? "Amount (EUR)" : "Shares"}
                </label>
                <input
                  name="shares"
                  type="number"
                  step="any"
                  defaultValue={editingStock.shares}
                  required
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                />
              </div>
              {editingStock.type !== "cash" && (
                <div>
                  <label className="block text-sm font-medium mb-1">Cost Basis (per share)</label>
                  <input
                    name="costBasis"
                    type="number"
                    step="any"
                    defaultValue={editingStock.costBasis}
                    placeholder="Optional"
                    className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Purchase Date</label>
                <input
                  name="purchaseDate"
                  type="date"
                  defaultValue={editingStock.purchaseDateISO}
                  className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingStock(null)}
                  className="px-4 py-2 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

