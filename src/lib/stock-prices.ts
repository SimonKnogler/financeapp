import type { StockPrice } from "@/types/finance";

// Cache prices for 1 minute to avoid excessive API calls
const CACHE_TTL_MS = 60 * 1000;
const priceCache = new Map<string, { price: StockPrice; expires: number }>();

// Cache exchange rates for 1 hour
const exchangeRateCache = new Map<string, { rate: number; expires: number }>();

async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;
  
  const cacheKey = `${from}_${to}`;
  const now = Date.now();
  const cached = exchangeRateCache.get(cacheKey);
  
  if (cached && cached.expires > now) {
    return cached.rate;
  }

  try {
    const response = await fetch(`/api/exchange-rate?from=${from}&to=${to}`);
    if (!response.ok) return 1;
    
    const data = await response.json();
    const rate = data.rate || 1;
    
    exchangeRateCache.set(cacheKey, { rate, expires: now + 60 * 60 * 1000 });
    return rate;
  } catch (error) {
    console.error(`Failed to fetch exchange rate ${from} -> ${to}:`, error);
    return 1;
  }
}

/**
 * Fetch current stock price via Next.js API route (avoids CORS issues)
 * Converts to EUR automatically
 */
export async function fetchStockPrice(symbol: string, targetCurrency: string = "EUR"): Promise<StockPrice | null> {
  const now = Date.now();
  const cacheKey = `${symbol}_${targetCurrency}`;
  const cached = priceCache.get(cacheKey);
  
  if (cached && cached.expires > now) {
    return cached.price;
  }

  try {
    const response = await fetch(`/api/stock-price?symbol=${encodeURIComponent(symbol)}`);

    if (!response.ok) {
      console.warn(`Failed to fetch price for ${symbol}: ${response.status}`);
      return null;
    }

    const data: StockPrice = await response.json();

    // Convert to target currency if needed
    let price = data.price;
    let currency = data.currency;
    
    if (data.currency !== targetCurrency) {
      const rate = await getExchangeRate(data.currency, targetCurrency);
      price = data.price * rate;
      currency = targetCurrency;
    }

    const stockPrice: StockPrice = {
      symbol: data.symbol,
      price,
      currency,
      timestamp: data.timestamp,
    };

    priceCache.set(cacheKey, { price: stockPrice, expires: now + CACHE_TTL_MS });
    return stockPrice;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch multiple stock prices in parallel
 * All prices converted to targetCurrency (default EUR)
 */
export async function fetchStockPrices(symbols: string[], targetCurrency: string = "EUR"): Promise<Map<string, StockPrice>> {
  const results = await Promise.allSettled(
    symbols.map((sym) => fetchStockPrice(sym, targetCurrency))
  );

  const priceMap = new Map<string, StockPrice>();
  results.forEach((result, idx) => {
    if (result.status === "fulfilled" && result.value) {
      priceMap.set(symbols[idx].toUpperCase(), result.value);
    }
  });

  return priceMap;
}

