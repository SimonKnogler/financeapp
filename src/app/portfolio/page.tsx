"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { fetchStockPrices, fetchStockPrice } from "@/lib/stock-prices";
import { fetchStockNewsMultiple } from "@/lib/stock-news";
import { StockChart } from "@/components/charts/StockChart";
import { PortfolioChart, type PortfolioRange, type PortfolioValueMode, getPortfolioRangeStart } from "@/components/charts/PortfolioChart";
import { SparplanModal } from "@/components/portfolio/SparplanModal";
import { SellModal } from "@/components/portfolio/SellModal";
import { RevolutImport } from "@/components/portfolio/RevolutImport";
import { GlobalSearch, type GlobalSearchItem } from "@/components/portfolio/GlobalSearch";
import { AllocationRadialChart } from "@/components/portfolio/AllocationRadialChart";
import { PerformanceBars } from "@/components/portfolio/PerformanceBars";
import { formatCurrency, formatCurrencyDetailed, formatNumber, formatPercent } from "@/lib/privacy";
import type { StockPrice, StockNews, StockHolding, AssetType, PortfolioOwner, PortfolioSnapshot } from "@/types/finance";

type TabView = "total" | "carolina" | "simon";

type BenchmarkOptionType = "none" | "stock" | "crypto";

interface BenchmarkOption {
  value: string;
  label: string;
  type: BenchmarkOptionType;
}

interface BenchmarkSeriesPoint {
  date: string;
  close: number;
}

interface StockMetadata {
  sector: string | null;
  industry: string | null;
  country: string | null;
  category: string | null;
  fetchedAt: number;
}

type AllocationDimension = "positions" | "type" | "sectors" | "assets" | "countries" | "currencies";

const ALLOCATION_DIMENSIONS: { value: AllocationDimension; label: string }[] = [
  { value: "positions", label: "Positions" },
  { value: "type", label: "Type" },
  { value: "sectors", label: "Sectors" },
  { value: "assets", label: "Assets" },
  { value: "countries", label: "Countries" },
  { value: "currencies", label: "Currencies" },
];

const SECTOR_BY_SYMBOL: Record<string, string> = {
  VWCE: "Index Funds",
  IWDA: "Index Funds",
  EUNL: "Index Funds",
  AAPL: "Technology",
  MSFT: "Technology",
  GOOGL: "Technology",
  AMZN: "Consumer Discretionary",
  TSLA: "Consumer Discretionary",
  META: "Communication Services",
  NVDA: "Technology",
  BTC: "Digital Assets",
  ETH: "Digital Assets",
  SOL: "Digital Assets",
  ADA: "Digital Assets",
};

const COUNTRY_SUFFIX_MAP: Record<string, string> = {
  ".DE": "Germany",
  ".AS": "Netherlands",
  ".L": "United Kingdom",
  ".MI": "Italy",
  ".PA": "France",
  ".SW": "Switzerland",
  ".TO": "Canada",
  ".T": "Japan",
  ".HK": "Hong Kong",
  ".SS": "China",
  ".AX": "Australia",
  ".SA": "Brazil",
};

const COUNTRY_SYMBOL_MAP: Record<string, string> = {
  AAPL: "United States",
  MSFT: "United States",
  GOOGL: "United States",
  AMZN: "United States",
  TSLA: "United States",
  META: "United States",
  NVDA: "United States",
  VWCE: "Luxembourg",
  IWDA: "Ireland",
  EUNL: "Germany",
  BTC: "Global",
  ETH: "Global",
  SOL: "Global",
  ADA: "Global",
};

function fallbackSector(symbol: string): string {
  const upper = symbol.toUpperCase();
  return SECTOR_BY_SYMBOL[upper] ?? "Unclassified";
}

function fallbackCountry(symbol: string): string {
  const upper = symbol.toUpperCase();
  if (COUNTRY_SYMBOL_MAP[upper]) {
    return COUNTRY_SYMBOL_MAP[upper];
  }
  const suffixEntry = Object.entries(COUNTRY_SUFFIX_MAP).find(([suffix]) =>
    upper.endsWith(suffix)
  );
  if (suffixEntry) {
    return suffixEntry[1];
  }
  return "Unspecified";
}

const PORTFOLIO_RANGE_OPTIONS: { label: string; value: PortfolioRange }[] = [
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
  { label: "1M", value: "1m" },
  { label: "YTD", value: "ytd" },
  { label: "1Y", value: "1y" },
  { label: "Max", value: "max" },
];

const BENCHMARK_OPTIONS: BenchmarkOption[] = [
  { value: "none", label: "No benchmark", type: "none" },
  { value: "VWCE.DE", label: "MSCI World (VWCE)", type: "stock" },
  { value: "SPY", label: "S&P 500 (SPY)", type: "stock" },
  { value: "BTC", label: "Bitcoin (BTC)", type: "crypto" },
];

function mapRangeToStockApi(range: PortfolioRange): string {
  switch (range) {
    case "1d":
      return "1d";
    case "1w":
      return "5d";
    case "1m":
      return "1mo";
    case "ytd":
      return "ytd";
    case "1y":
      return "1y";
    case "max":
    default:
      return "max";
  }
}

function mapRangeToCryptoApi(range: PortfolioRange): string {
  switch (range) {
    case "1d":
      return "1d";
    case "1w":
      return "5d";
    case "1m":
      return "1mo";
    case "ytd":
      return "1y";
    case "1y":
      return "1y";
    case "max":
    default:
      return "max";
  }
}

export default function PortfolioPage() {
  const stocks: StockHolding[] = useFinanceStore((s) => s.stocks);
  const addStock = useFinanceStore((s) => s.addStock);
  const removeStock = useFinanceStore((s) => s.removeStock);
  const updateStock = useFinanceStore((s) => s.updateStock);
  const portfolioHistory = useFinanceStore((s) => s.portfolioHistory);
  const addPortfolioSnapshot = useFinanceStore((s) => s.addPortfolioSnapshot);
  const updatePortfolioSnapshot = useFinanceStore((s) => s.updatePortfolioSnapshot);
  const goals = useFinanceStore((s) => s.goals);
  const portfolioAccounts = useFinanceStore((s) => s.portfolioAccounts);
  const currency = useFinanceStore((s) => s.assumptions.currency);
  const privacyMode = useFinanceStore((s) => s.privacyMode);
  const togglePrivacyMode = useFinanceStore((s) => s.togglePrivacyMode);

  const [activeTab, setActiveTab] = useState<TabView>("total");
  const [activeAccountId, setActiveAccountId] = useState<string>("all");
  const [range, setRange] = useState<PortfolioRange>("1m");
  const [benchmark, setBenchmark] = useState<string>("none");
  const [benchmarkSeries, setBenchmarkSeries] = useState<BenchmarkSeriesPoint[] | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState<string>("0");
  const [costBasis, setCostBasis] = useState<string>("");
  const [purchaseDateISO, setPurchaseDateISO] = useState<string>("");
  const [assetType, setAssetType] = useState<"stock" | "crypto" | "etf" | "cash">("stock");
  const [valueMode, setValueMode] = useState<PortfolioValueMode>("absolute");
  const [selectedAccountId, setSelectedAccountId] = useState<string>(() => portfolioAccounts[0]?.id ?? "");
  const [allocationDimension, setAllocationDimension] = useState<AllocationDimension>("positions");
  const [stockMetadata, setStockMetadata] = useState<Map<string, StockMetadata>>(new Map());
  const [performancePeriod, setPerformancePeriod] = useState<"yearly" | "monthly">("yearly");

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

  const addFormRef = useRef<HTMLFormElement | null>(null);
  const scrollToAddForm = useCallback(() => {
    addFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (activeAccountId !== "all") {
      if (selectedAccountId !== activeAccountId) {
        setSelectedAccountId(activeAccountId);
      }
      return;
    }
    const firstAccountId = portfolioAccounts[0]?.id ?? "";
    if (!selectedAccountId && firstAccountId) {
      setSelectedAccountId(firstAccountId);
      return;
    }
    const hasSelected = portfolioAccounts.some((account) => account.id === selectedAccountId);
    if (!hasSelected) {
      setSelectedAccountId(firstAccountId);
    }
  }, [activeAccountId, portfolioAccounts, selectedAccountId]);

  const searchItems = useMemo<GlobalSearchItem[]>(() => {
    const items: GlobalSearchItem[] = [];
    const uniqueSymbols = new Map<string, StockHolding>();

    stocks.forEach((stock) => {
      uniqueSymbols.set(stock.symbol.toUpperCase(), stock);
    });

    uniqueSymbols.forEach((stock, symbol) => {
      items.push({
        id: `holding-${symbol}`,
        type: "holding",
        label: symbol,
        hint: `${stock.type.toUpperCase()} • ${stock.owner === "household" ? "Total" : stock.owner}`,
        action: () => {
          setActiveTab(stock.owner === "carolina" || stock.owner === "simon" ? stock.owner : "total");
          setActiveAccountId(stock.accountId ?? "all");
          setSymbol(symbol);
          setAssetType(stock.type);
          scrollToAddForm();
        },
      });
    });

    portfolioAccounts.forEach((account) => {
      items.push({
        id: `account-${account.id}`,
        type: "account",
        label: account.name,
        hint: account.description ?? "Portfolio account",
        action: () => {
          setActiveAccountId(account.id);
        },
      });
    });

    const userItems: Array<{ owner: TabView; label: string }> = [
      { owner: "total", label: "Total portfolio" },
      { owner: "carolina", label: "Carolina" },
      { owner: "simon", label: "Simon" },
    ];

    userItems.forEach(({ owner, label }) => {
      items.push({
        id: `user-${owner}`,
        type: "user",
        label,
        hint: "Switch owner view",
        action: () => {
          setActiveTab(owner);
          setActiveAccountId("all");
        },
      });
    });

    const popularCrypto = ["BTC", "ETH", "SOL", "ADA", "DOGE"];
    popularCrypto.forEach((symbol) => {
      items.push({
        id: `crypto-${symbol}`,
        type: "crypto",
        label: `${symbol} (crypto)`,
        hint: "Quick add crypto position",
        action: () => {
          setActiveTab("total");
          setActiveAccountId("all");
          setAssetType("crypto");
          setSymbol(symbol);
          scrollToAddForm();
        },
      });
    });

    return items;
  }, [stocks, portfolioAccounts, scrollToAddForm, setActiveAccountId, setActiveTab, setAssetType, setSymbol]);

  const selectedBenchmark = useMemo(() => {
    return BENCHMARK_OPTIONS.find((option) => option.value === benchmark) ?? BENCHMARK_OPTIONS[0];
  }, [benchmark]);

  const ownerHistory = useMemo(() => {
    return portfolioHistory
      .filter((snapshot) => snapshot.owner === activeTab)
      .sort((a, b) => a.dateISO.localeCompare(b.dateISO));
  }, [portfolioHistory, activeTab]);

  const todayIso = useMemo(() => new Date().toISOString().split("T")[0], []);

  const previousTotalValue = useMemo(() => {
    if (ownerHistory.length === 0) {
      return null;
    }
    for (let i = ownerHistory.length - 1; i >= 0; i--) {
      const entry = ownerHistory[i];
      if (entry.dateISO < todayIso) {
        return entry.totalValue;
      }
    }
    if (ownerHistory.length >= 2) {
      return ownerHistory[ownerHistory.length - 2]?.totalValue ?? null;
    }
    return null;
  }, [ownerHistory, todayIso]);

  const rangePerformance = useMemo(() => {
    const today = new Date();
    const startDate = getPortfolioRangeStart(range, today).toISOString().split("T")[0];
    const rangePoints = ownerHistory.filter((snapshot) => snapshot.dateISO >= startDate);
    const baseline = rangePoints.length > 0 ? rangePoints[0].investmentValue : undefined;
    return {
      baseline: baseline ?? null,
    };
  }, [ownerHistory, range]);

  useEffect(() => {
    if (selectedBenchmark.type === "none") {
      setBenchmarkSeries(null);
      setBenchmarkError(null);
      setBenchmarkLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadBenchmark = async () => {
      setBenchmarkLoading(true);
      setBenchmarkError(null);
      try {
        const endpoint = selectedBenchmark.type === "stock" ? "/api/stock-history" : "/api/crypto-history";
        const rangeParam = selectedBenchmark.type === "stock"
          ? mapRangeToStockApi(range)
          : mapRangeToCryptoApi(range);

        const response = await fetch(
          `${endpoint}?symbol=${encodeURIComponent(selectedBenchmark.value)}&range=${rangeParam}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch benchmark (${response.status})`);
        }

        const payload = await response.json();
        const rawData: any[] = Array.isArray(payload?.data) ? payload.data : [];
        const aggregated = new Map<string, number>();

        for (const point of rawData) {
          let rawDate: string | null = null;
          if (typeof point.date === "string") {
            rawDate = point.date;
          } else if (typeof point.timestamp === "number") {
            rawDate = new Date(point.timestamp * 1000).toISOString();
          }

          if (!rawDate) continue;
          const dateKey = rawDate.split(" ")[0].split("T")[0];
          const closeValue =
            typeof point.close === "number"
              ? point.close
              : typeof point.price === "number"
              ? point.price
              : null;

          if (closeValue === null) continue;
          aggregated.set(dateKey, closeValue);
        }

        const todayKey = new Date().toISOString().split("T")[0];

        try {
          if (selectedBenchmark.type === "stock") {
            const latest = await fetchStockPrice(selectedBenchmark.value, currency);
            if (latest?.price) {
              aggregated.set(todayKey, latest.price);
            }
          } else if (selectedBenchmark.type === "crypto") {
            const currentResponse = await fetch(
              `/api/crypto-price?symbol=${encodeURIComponent(selectedBenchmark.value)}`,
              { signal: controller.signal }
            );
            if (currentResponse.ok) {
              const currentData = await currentResponse.json();
              if (typeof currentData?.price === "number") {
                aggregated.set(todayKey, currentData.price);
              }
            }
          }
        } catch (currentError) {
          console.warn("Failed to fetch current benchmark price:", currentError);
        }

        const normalizedSeries = Array.from(aggregated.entries())
          .map(([date, close]) => ({ date, close }))
          .sort((a, b) => a.date.localeCompare(b.date));

        if (!cancelled) {
          setBenchmarkSeries(normalizedSeries);
        }
      } catch (error: any) {
        if (cancelled || error?.name === "AbortError") {
          return;
        }
        setBenchmarkSeries(null);
        setBenchmarkError(error?.message ?? "Failed to load benchmark data");
      } finally {
        if (!cancelled) {
          setBenchmarkLoading(false);
        }
      }
    };

    loadBenchmark();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedBenchmark.type, selectedBenchmark.value, range, currency]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function loadMetadata() {
      const symbols = Array.from(
        new Set(
          stocks
            .filter((stock) => stock.type !== "cash" && stock.type !== "crypto")
            .map((stock) => stock.symbol.toUpperCase())
        )
      );

      const missing = symbols.filter((symbol) => !stockMetadata.has(symbol));
      if (missing.length === 0) {
        return;
      }

      await Promise.all(
        missing.map(async (symbol) => {
          try {
            const response = await fetch(`/api/stock-metadata?symbol=${encodeURIComponent(symbol)}`, {
              signal: controller.signal,
            });
            if (!response.ok) {
              throw new Error(`Failed to fetch metadata (${response.status})`);
            }
            const payload = await response.json();
            if (cancelled) return;
            setStockMetadata((prev) => {
              const next = new Map(prev);
              next.set(symbol, {
                sector: payload.sector ?? null,
                industry: payload.industry ?? null,
                country: payload.country ?? null,
                category: payload.category ?? null,
                fetchedAt: Date.now(),
              });
              return next;
            });
          } catch (error) {
            if (cancelled || controller.signal.aborted) {
              return;
            }
            console.warn(`Metadata lookup failed for ${symbol}`, error);
            setStockMetadata((prev) => {
              const next = new Map(prev);
              next.set(symbol, {
                sector: null,
                industry: null,
                country: null,
                category: null,
                fetchedAt: Date.now(),
              });
              return next;
            });
          }
        })
      );
    }

    loadMetadata();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [stocks, stockMetadata]);

  function resetCostBasisToCurrentPrices() {
    if (!confirm("This will set the cost basis of all positions to their current market price. This action cannot be undone. Continue?")) {
      return;
    }

    let updatedCount = 0;
    stocks.forEach((stock) => {
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

    const cacheBuster = forceRefresh ? `&_t=${Date.now()}` : "";

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
        if (error.name === "AbortError") {
          throw new Error("Request timeout");
        }
        throw error;
      }
    };

    await Promise.all(
      stocks.map(async (stock) => {
        try {
          if (stock.type === "cash") {
            priceMap.set(stock.symbol.toUpperCase(), {
              symbol: stock.symbol.toUpperCase(),
              price: 1,
              currency: "EUR",
              timestamp: Date.now(),
            });
            return;
          }

          const priceEndpoint = stock.type === "crypto" ? "/api/crypto-price" : "/api/stock-price";
          const priceRes = await fetchWithTimeout(
            `${priceEndpoint}?symbol=${encodeURIComponent(stock.symbol)}${cacheBuster}`,
            { cache: forceRefresh ? "no-store" : "default" },
            10000
          );
          if (priceRes.ok) {
            const priceData = await priceRes.json();
            if ((stock.type === "stock" || stock.type === "etf") && priceData.currency !== "EUR") {
              const stockPrice = await fetchStockPrices([stock.symbol], "EUR");
              const price = stockPrice.get(stock.symbol.toUpperCase());
              if (price) {
                priceMap.set(stock.symbol.toUpperCase(), price);
              }
            } else {
              priceMap.set(stock.symbol.toUpperCase(), priceData);
            }
          } else {
            console.error(`Failed to fetch price for ${stock.symbol}: ${priceRes.status}`);
          }

          if (stock.type === "crypto" || stock.type === "stock" || stock.type === "etf") {
            const newsEndpoint = stock.type === "crypto" ? "/api/crypto-news" : "/api/stock-news";
            const newsRes = await fetchWithTimeout(
              `${newsEndpoint}?symbol=${encodeURIComponent(stock.symbol)}${cacheBuster}`,
              { cache: forceRefresh ? "no-store" : "default" },
              10000
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

    const today = new Date().toISOString().split("T")[0];

    const saveSnapshotForOwner = (owner: "total" | "simon" | "carolina") => {
      const lastSnapshot = portfolioHistory.find((s) => s.dateISO === today && s.owner === owner);
      if (!lastSnapshot) {
        const ownerStocks = owner === "total" ? stocks : stocks.filter((s) => s.owner === owner);
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
      } else {
        const ownerStocks = owner === "total" ? stocks : stocks.filter((s) => s.owner === owner);
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

        updatePortfolioSnapshot({
          dateISO: today,
          owner,
          totalValue: cashVal + invVal,
          cashValue: cashVal,
          investmentValue: invVal,
        });
      }
    };

    (["total", "simon", "carolina"] as const).forEach((owner) => saveSnapshotForOwner(owner));

    setLoading(false);
  }

  useEffect(() => {
    refreshPrices(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const owner: PortfolioOwner = activeTab === "carolina" ? "carolina" : "simon";
    addStock({
      symbol: symbol.toUpperCase(),
      shares: parseFloat(shares) || 0,
      costBasis: costBasis ? parseFloat(costBasis) : undefined,
      purchaseDateISO: purchaseDateISO || undefined,
      type: assetType,
      owner,
      accountId: selectedAccountId || undefined,
    });
    setSymbol("");
    setShares("0");
    setCostBasis("");
    setPurchaseDateISO("");
    setAssetType("cash");
  }

  const filteredStocks = useMemo(() => {
    const ownerFiltered =
      activeTab === "total" ? stocks : stocks.filter((s) => s.owner === activeTab);
    if (activeAccountId === "all") {
      return ownerFiltered;
    }
    return ownerFiltered.filter((s) => s.accountId === activeAccountId);
  }, [stocks, activeTab, activeAccountId]);

  const activeAccount = useMemo(() => {
    if (activeAccountId === "all") {
      return null;
    }
    return portfolioAccounts.find((account) => account.id === activeAccountId) ?? null;
  }, [activeAccountId, portfolioAccounts]);

  const getHoldingValue = useCallback(
    (holding: StockHolding) => {
      if (holding.type === "cash") {
        return holding.shares;
      }
      const price = prices.get(holding.symbol.toUpperCase());
      if (!price) {
        return 0;
      }
      return holding.shares * price.price;
    },
    [prices]
  );

  const getHoldingCurrency = useCallback(
    (holding: StockHolding) => {
      if (holding.type === "cash") {
        return "EUR";
      }
      const price = prices.get(holding.symbol.toUpperCase());
      return price?.currency ?? "EUR";
    },
    [prices]
  );

  const getHoldingAccountName = useCallback(
    (holding: StockHolding) => {
      if (!holding.accountId) {
        return "Unassigned";
      }
      return (
        portfolioAccounts.find((account) => account.id === holding.accountId)?.name ??
        "Unassigned"
      );
    },
    [portfolioAccounts]
  );

  const allocationSummary = useMemo(() => {
    const label =
      ALLOCATION_DIMENSIONS.find((dimension) => dimension.value === allocationDimension)?.label ??
      "Allocation";

    if (filteredStocks.length === 0) {
      return { label, data: [], total: 0 };
    }

    const buckets = new Map<string, number>();

    filteredStocks.forEach((holding) => {
      const value = getHoldingValue(holding);
      const symbol = holding.symbol.toUpperCase();
      const metadata = stockMetadata.get(symbol);
      let key: string;

      switch (allocationDimension) {
        case "positions":
          key = symbol;
          break;
        case "type":
          key = holding.type.charAt(0).toUpperCase() + holding.type.slice(1);
          break;
        case "sectors":
          if (holding.type === "crypto") {
            key = "Digital Assets";
            break;
          }
          key =
            metadata?.sector ??
            metadata?.industry ??
            metadata?.category ??
            fallbackSector(symbol);
          break;
        case "assets":
          key = getHoldingAccountName(holding);
          break;
        case "countries":
          if (holding.type === "crypto") {
            key = "Global";
            break;
          }
          key = metadata?.country ?? fallbackCountry(symbol);
          break;
        case "currencies":
          key = getHoldingCurrency(holding);
          break;
        default:
          key = "Other";
      }

      buckets.set(key, (buckets.get(key) ?? 0) + value);
    });

    const total = Array.from(buckets.values()).reduce((sum, value) => sum + value, 0);
    if (total <= 0) {
      return {
        label,
        data: Array.from(buckets.entries()).map(([name]) => ({
          name,
          value: 0,
          percent: 0,
        })),
        total: 0,
      };
    }

    const data = Array.from(buckets.entries())
      .map(([name, value]) => ({
        name,
        value,
        percent: value / total,
      }))
      .sort((a, b) => b.value - a.value);

    return { label, data, total };
  }, [
    allocationDimension,
    filteredStocks,
    getHoldingAccountName,
    getHoldingCurrency,
    getHoldingValue,
    stockMetadata,
  ]);

  const performanceData = useMemo(() => {
    if (ownerHistory.length === 0) {
      return [];
    }

    const groups = new Map<string, { start: number; end: number }>();
    const sorted = [...ownerHistory].sort((a, b) => a.dateISO.localeCompare(b.dateISO));

    sorted.forEach((snapshot) => {
      const date = new Date(snapshot.dateISO);
      const key =
        performancePeriod === "yearly"
          ? `${date.getFullYear()}`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

      if (!groups.has(key)) {
        groups.set(key, { start: snapshot.investmentValue, end: snapshot.investmentValue });
      } else {
        const entry = groups.get(key)!;
        entry.end = snapshot.investmentValue;
      }
    });

    const sortedKeys = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));
    const limitedKeys =
      performancePeriod === "yearly"
        ? sortedKeys.slice(-6)
        : sortedKeys.slice(-12); // last 12 months or last 6 years

    return limitedKeys.map((key) => {
      const entry = groups.get(key)!;
      const change = entry.end - entry.start;
      const percent = entry.start > 0 ? (change / entry.start) * 100 : 0;
      return {
        period: key,
        change,
        percent,
      };
    });
  }, [ownerHistory, performancePeriod]);

  const cashValue = filteredStocks
    .filter((s) => s.type === "cash")
    .reduce((sum, stock) => sum + stock.shares, 0);

  const investmentValue = filteredStocks
    .filter((s) => s.type !== "cash")
    .reduce((sum, stock) => {
      const price = prices.get(stock.symbol.toUpperCase());
      if (!price) return sum;
      return sum + stock.shares * price.price;
    }, 0);

  const totalValue = cashValue + investmentValue;

  const totalCost = filteredStocks
    .filter((s) => s.type !== "cash")
    .reduce((sum, stock) => {
      if (!stock.costBasis) return sum;
      return sum + stock.shares * stock.costBasis;
    }, 0);

  const totalGain = totalCost > 0 ? investmentValue - totalCost : 0;
  const totalGainPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

  const activeSparplans = filteredStocks.filter((s) => s.sparplan?.active);
  const totalMonthlyInvestment = activeSparplans.reduce((sum, s) => sum + (s.sparplan?.monthlyAmount || 0), 0);

  const dailyChangeValue = previousTotalValue !== null ? totalValue - previousTotalValue : 0;
  const hasPrevious = previousTotalValue !== null;
  const dailyChangePercent = hasPrevious && Math.abs(previousTotalValue as number) > 0
    ? (dailyChangeValue / (previousTotalValue as number)) * 100
    : 0;
  const dailyIsPositive = dailyChangeValue >= 0;

  const dailyChangeDisplay = hasPrevious
    ? privacyMode
      ? "•••••"
      : valueMode === "percentage"
      ? `${formatPercent(dailyChangePercent, false)} Today`
      : `${dailyIsPositive ? "+" : "−"}${formatCurrency(Math.abs(dailyChangeValue), currency, false)} (${formatPercent(dailyChangePercent, false)})`
    : privacyMode
    ? "•••••"
    : "Awaiting history";

  const rangeBaseline = rangePerformance.baseline ?? investmentValue;
  const rangeChangeValue = investmentValue - rangeBaseline;
  const rangeChangePercent = rangeBaseline !== 0 ? (rangeChangeValue / rangeBaseline) * 100 : 0;
  const rangeIsPositive = rangeChangeValue >= 0;
  const rangePerformanceDisplay = privacyMode
    ? "•••••"
    : valueMode === "percentage"
    ? formatPercent(rangeChangePercent, false)
    : `${rangeIsPositive ? "+" : "−"}${formatCurrency(Math.abs(rangeChangeValue), currency, false)} (${formatPercent(rangeChangePercent, false)})`;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Portfolio</h1>
            {lastUpdate && (
            <div className="text-xs text-zinc-500">Last updated: {lastUpdate.toLocaleTimeString()}</div>
            )}
            {activeAccount && (
              <div className="text-xs text-zinc-500">{activeAccount.name}</div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
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
              disabled={loading || stocks.filter((s) => s.type !== "cash").length === 0}
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

        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <GlobalSearch items={searchItems} />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeAccountId}
              onChange={(event) => setActiveAccountId(event.target.value)}
              className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-1.5 text-sm"
            >
              <option value="all">All accounts</option>
              {portfolioAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
            <div className="inline-flex overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <button
                type="button"
                onClick={() => setValueMode("absolute")}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  valueMode === "absolute"
                    ? "bg-blue-600 text-white"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                Absolute
              </button>
              <button
                type="button"
                onClick={() => setValueMode("percentage")}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  valueMode === "percentage"
                    ? "bg-blue-600 text-white"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                %
              </button>
            </div>
            <button
              type="button"
              onClick={togglePrivacyMode}
              className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {privacyMode ? "Show values" : "Hide values"}
            </button>
            <button
              type="button"
              onClick={scrollToAddForm}
              className="rounded-md bg-blue-600 text-white px-3 py-1.5 text-sm hover:bg-blue-700"
            >
              Add transaction
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 flex flex-wrap items-end justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Total portfolio value</div>
          <div className="text-3xl font-semibold">
            {formatCurrency(totalValue, currency, privacyMode)}
          </div>
          <div
            className={`text-sm font-medium ${
              !hasPrevious || Math.abs(dailyChangeValue) < 0.01
                ? "text-zinc-500"
                : dailyIsPositive
                ? "text-green-600 dark:text-green-500"
                : "text-red-600 dark:text-red-500"
            }`}
          >
            {dailyChangeDisplay}
          </div>
          <div
            className={`text-xs ${
              Math.abs(rangeChangeValue) < 0.01
                ? "text-zinc-500"
                : rangeIsPositive
                ? "text-green-600 dark:text-green-500"
                : "text-red-600 dark:text-red-500"
            }`}
          >
            Range performance: {rangePerformanceDisplay}
          </div>
        </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-100">Allocation</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Distribution across {allocationSummary.label.toLowerCase()}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {ALLOCATION_DIMENSIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setAllocationDimension(option.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    allocationDimension === option.value
                      ? "bg-blue-600 text-white shadow"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <AllocationRadialChart
            title={`${allocationSummary.label} Allocation`}
            subtitle={valueMode === "percentage" ? "Current share (absolute values)" : undefined}
            data={allocationSummary.data}
            totalValue={allocationSummary.total}
            totalCount={filteredStocks.length}
            currency={currency}
          />
        </div>

        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-100">Investment Performance</div>
              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                Live investment gains/losses for the selected range
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="inline-flex overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900">
                <button
                  type="button"
                  onClick={() => setPerformancePeriod("yearly")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    performancePeriod === "yearly"
                      ? "bg-blue-600 text-white"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  Yearly
                </button>
                <button
                  type="button"
                  onClick={() => setPerformancePeriod("monthly")}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    performancePeriod === "monthly"
                      ? "bg-blue-600 text-white"
                      : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  Monthly
                </button>
              </div>
              <Link
                href="/portfolio/performance"
                className="text-xs text-blue-500 hover:text-blue-600"
              >
                Show more →
              </Link>
            </div>
          </div>
          {performanceData.length === 0 ? (
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 text-sm text-zinc-600 dark:text-zinc-300">
              Not enough history to chart yet. Keep the app open to build a performance trail.
            </div>
          ) : (
            <PerformanceBars data={performanceData} currency={currency} />
          )}
        </div>
      </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-1 text-xs font-medium">
            {PORTFOLIO_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setRange(option.value)}
                className={`rounded-md px-3 py-1.5 transition-colors ${
                  range === option.value
                    ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow"
                    : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-50"
                }`}
                aria-pressed={range === option.value}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
              {(["total", "carolina", "simon"] as const).map((owner) => (
                <button
                  key={owner}
                  onClick={() => setActiveTab(owner)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === owner
                      ? owner === "carolina"
                        ? "border-purple-500 text-purple-600 dark:text-purple-400"
                        : owner === "simon"
                        ? "border-green-500 text-green-600 dark:text-green-400"
                        : "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
                  }`}
                >
                  {owner === "total"
                    ? "Total"
                    : owner.charAt(0).toUpperCase() + owner.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs uppercase tracking-wide text-zinc-500">Benchmark</span>
              <select
                value={benchmark}
                onChange={(event) => setBenchmark(event.target.value)}
                className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/60"
              >
                {BENCHMARK_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {benchmarkLoading && (
                <span className="text-xs text-zinc-500">Updating…</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {benchmarkError && (
        <div className="text-xs text-red-500">{benchmarkError}</div>
      )}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm">
        <div className="mb-3 font-semibold">Investment Performance</div>
        <PortfolioChart
          portfolioHistory={ownerHistory}
          currentValue={investmentValue}
          baselineValue={totalCost > 0 ? totalCost : undefined}
          height={280}
          range={range}
          benchmarkSeries={benchmarkSeries ?? undefined}
          benchmarkLabel={selectedBenchmark.type !== "none" ? selectedBenchmark.label : undefined}
          valueMode={valueMode}
        />
      </div>

      <div className="-mx-2 overflow-x-auto pb-2 md:mx-0 md:overflow-visible">
        <div className="flex gap-3 px-2 md:grid md:grid-cols-5 md:px-0">
          <div className="min-w-[190px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm md:min-w-0">
            <div className="text-sm text-zinc-500">Total Portfolio</div>
            <div className="text-2xl font-semibold">
              {formatCurrency(totalValue, currency, privacyMode)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Investments + Cash</div>
          </div>
          <div className="min-w-[190px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm md:min-w-0">
            <div className="text-sm text-zinc-500">Cash</div>
            <div className="text-2xl font-semibold">
              {formatCurrency(cashValue, currency, privacyMode)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Liquid assets</div>
          </div>
          <div className="min-w-[190px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm md:min-w-0">
            <div className="text-sm text-zinc-500">Investments</div>
            <div className="text-2xl font-semibold">
              {formatCurrency(investmentValue, currency, privacyMode)}
            </div>
            <div className="text-xs text-zinc-500 mt-1">Stocks, ETFs, Crypto</div>
          </div>
          <div className="min-w-[190px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm md:min-w-0">
            <div className="text-sm text-zinc-500">Investment Gain/Loss</div>
            <div
              className={`text-2xl font-semibold ${
                totalGain >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
              }`}
            >
              {formatCurrency(totalGain, currency, privacyMode)}
            </div>
            <div
              className={`text-xs ${
                totalGain >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
              }`}
            >
              {formatPercent(totalGainPercent, privacyMode)} return
            </div>
          </div>
          <div className="min-w-[190px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm md:min-w-0">
            <div className="text-sm text-zinc-500">Active Sparpläne</div>
            <div className="text-2xl font-semibold">
              {formatCurrency(totalMonthlyInvestment, currency, privacyMode)}/mo
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              {activeSparplans.length}{" "}
              {activeSparplans.length === 1 ? "plan" : "plans"}
            </div>
          </div>
        </div>
      </div>

      {/* Goal Allocation Summary */}
      {goals.length > 0 && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <h2 className="text-lg font-semibold mb-3">Goal Allocation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {goals.map((goal) => {
              const allocatedHoldings = filteredStocks.filter((s) => s.goalId === goal.id);
              const allocatedValue = allocatedHoldings.reduce((sum, stock) => {
                const assetType = stock.type || "stock";
                if (assetType === "cash") {
                  return sum + stock.shares;
                }
                const price = prices.get(stock.symbol.toUpperCase());
                const currentPrice = price?.price ?? 0;
                return sum + stock.shares * currentPrice;
              }, 0);

              return (
                <div key={goal.id} className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-900/50">
                  <div className="text-sm font-medium mb-1">{goal.name}</div>
                  <div className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    {formatCurrency(allocatedValue, currency, privacyMode)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {allocatedHoldings.length} {allocatedHoldings.length === 1 ? "holding" : "holdings"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab !== "total" && (
        <form
          ref={addFormRef}
          onSubmit={onAdd}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4"
        >
          <select
            value={selectedAccountId}
            onChange={(event) => setSelectedAccountId(event.target.value)}
            className="rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
          >
            {portfolioAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
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
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1000px]">
            <thead className="bg-zinc-50 dark:bg-zinc-900/50">
              <tr>
                <th className="text-left p-2 sticky left-0 bg-zinc-50 dark:bg-zinc-900/50 z-10">Type</th>
                <th className="text-left p-2 sticky left-[60px] bg-zinc-50 dark:bg-zinc-900/50 z-10">Symbol</th>
                <th className="text-left p-2">Sector</th>
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
                const assetType = stock.type || "stock";
                const symbol = stock.symbol.toUpperCase();

                const metadata = stockMetadata.get(symbol);
                const sectorLabel =
                  metadata?.sector ?? metadata?.industry ?? metadata?.category ?? fallbackSector(symbol);

                const price = prices.get(symbol);
                const currentPrice = price?.price ?? 0;

                const marketValue = assetType === "cash" ? stock.shares : stock.shares * currentPrice;

                const costValue = assetType !== "cash" && stock.costBasis ? stock.shares * stock.costBasis : 0;
                const gain = costValue > 0 ? marketValue - costValue : 0;
                const gainPercent = costValue > 0 ? (gain / costValue) * 100 : 0;

                return (
                  <tr key={stock.id} className="border-t border-zinc-200 dark:border-zinc-800">
                    <td className="p-2 sticky left-0 bg-white dark:bg-zinc-900 z-10">
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          assetType === "crypto"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            : assetType === "etf"
                            ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                            : assetType === "cash"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {assetType === "crypto" ? "₿" : assetType === "etf" ? "📊" : assetType === "cash" ? "💵" : "📈"}
                      </span>
                    </td>
                    <td className="p-2 font-mono font-semibold sticky left-[60px] bg-white dark:bg-zinc-900 z-10">
                      {symbol}
                    </td>
                    <td className="p-2 text-zinc-600 dark:text-zinc-300">{sectorLabel}</td>
                    <td className="p-2 text-right">
                      {assetType === "cash" ? "-" : formatNumber(stock.shares, privacyMode)}
                    </td>
                    <td className="p-2 text-right">
                      {assetType === "cash"
                        ? "-"
                        : stock.costBasis
                        ? formatCurrencyDetailed(stock.costBasis, currency, privacyMode)
                        : "-"}
                    </td>
                    <td className="p-2 text-right">
                      {assetType === "cash" ? (
                        <span className="text-zinc-500">Cash</span>
                      ) : loading ? (
                        <span className="text-zinc-500">Loading...</span>
                      ) : price && currentPrice > 0 ? (
                        formatCurrencyDetailed(currentPrice, currency, privacyMode)
                      ) : (
                        <span className="text-red-500 dark:text-red-400 text-xs" title="Failed to fetch price. Click 'Refresh Prices' to retry.">
                          Error
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-right font-semibold">{formatCurrency(marketValue, currency, privacyMode)}</td>
                    <td
                      className={`p-2 text-right ${
                        assetType === "cash"
                          ? "text-zinc-500"
                          : gain >= 0
                          ? "text-emerald-400"
                          : "text-rose-400"
                      }`}
                    >
                      {assetType === "cash"
                        ? "-"
                        : stock.costBasis
                        ? (
                            <>
                              {formatCurrency(gain, currency, privacyMode)} ({formatPercent(gainPercent, privacyMode)})
                            </>
                          )
                        : "-"}
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
                <div className="flex items-center justify-between px-4 py-3 bg-zinc-50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800">
                  <div>
                    <div className="text-sm font-semibold">{stock.symbol}</div>
                    <div className="text-xs text-zinc-500">
                      {stock.type === "crypto" ? "Crypto" : stock.type === "etf" ? "ETF / Index" : stock.type === "cash" ? "Cash" : "Stock"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {stock.type !== "cash" && (
                      <button
                        onClick={() => setExpandedChart(isChartExpanded ? null : stock.symbol)}
                        className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      >
                        {isChartExpanded ? "Hide chart" : "Show chart"}
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedNews(isNewsExpanded ? null : stock.symbol)}
                      className="rounded-md border border-zinc-200 dark:border-zinc-700 px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      {isNewsExpanded ? "Hide news" : "Show news"}
                    </button>
                  </div>
                </div>

                {isChartExpanded && stock.type !== "cash" && (
                  <div className="bg-white dark:bg-zinc-950 px-4 py-4">
                    <StockChart symbol={stock.symbol} type={stock.type} height={260} />
                  </div>
                )}

                {isNewsExpanded && (
                  <div className="px-4 py-4 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
                    {stockNews.length === 0 ? (
                      <div className="text-sm text-zinc-500">No recent news</div>
                    ) : (
                      stockNews.slice(0, 5).map((article, idx) => (
                        <a
                          key={idx}
                          href={article.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block group"
                        >
                          <div className="text-sm font-medium group-hover:text-blue-600">{article.title}</div>
                          <div className="text-xs text-zinc-500">
                            {article.publisher} • {article.publishedAt ? new Date(article.publishedAt).toLocaleString() : ""}
                          </div>
                        </a>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {sparplanModalStock && (
        <SparplanModal stock={sparplanModalStock} onClose={() => setSparplanModalStock(null)} />
      )}

      {sellModalStock && (
        <SellModal stock={sellModalStock.stock} onClose={() => setSellModalStock(null)} currentPrice={sellModalStock.price} />
      )}

      {editingStock && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingStock(null)}
        >
          <div
            className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">Edit {editingStock.symbol}</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateStock(editingStock.id, {
                  shares: parseFloat(formData.get("shares") as string) || editingStock.shares,
                  costBasis: formData.get("costBasis")
                    ? parseFloat(formData.get("costBasis") as string)
                    : editingStock.costBasis,
                  purchaseDateISO: (formData.get("purchaseDate") as string) || editingStock.purchaseDateISO,
                });
                setEditingStock(null);
              }}
              className="space-y-4"
            >
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
                    defaultValue={editingStock.costBasis ?? ""}
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
                  defaultValue={editingStock.purchaseDateISO ?? ""}
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

