import type { StockNews } from "@/types/finance";

// Cache news for 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;
const newsCache = new Map<string, { news: StockNews[]; expires: number }>();

/**
 * Fetch latest news for a stock symbol
 */
export async function fetchStockNews(symbol: string): Promise<StockNews[]> {
  const now = Date.now();
  const upperSymbol = symbol.toUpperCase();
  const cached = newsCache.get(upperSymbol);
  
  if (cached && cached.expires > now) {
    console.log(`Using cached news for ${upperSymbol}`);
    return cached.news;
  }

  try {
    console.log(`Fetching news for ${upperSymbol}`);
    const response = await fetch(`/api/stock-news?symbol=${encodeURIComponent(upperSymbol)}`);

    if (!response.ok) {
      console.warn(`Failed to fetch news for ${upperSymbol}: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const news = data.news || [];
    console.log(`Received ${news.length} news items for ${upperSymbol}`);

    newsCache.set(upperSymbol, { news, expires: now + CACHE_TTL_MS });
    return news;
  } catch (error) {
    console.error(`Error fetching news for ${upperSymbol}:`, error);
    return [];
  }
}

/**
 * Fetch news for multiple stocks in parallel
 */
export async function fetchStockNewsMultiple(symbols: string[]): Promise<Map<string, StockNews[]>> {
  const results = await Promise.allSettled(
    symbols.map((sym) => fetchStockNews(sym))
  );

  const newsMap = new Map<string, StockNews[]>();
  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      newsMap.set(symbols[idx].toUpperCase(), result.value);
    }
  });

  return newsMap;
}

