import { AssetType } from "@/types/finance";

export interface HistoricalPrice {
  date: string;
  close: number;
}

export interface HistoricalAnalysis {
  symbol: string;
  averageAnnualReturn: number; // as decimal (e.g., 0.07 = 7%)
  volatility: number; // annual volatility as decimal
  sharpeRatio: number;
  maxDrawdown: number; // as decimal (e.g., -0.15 = -15%)
  dataPoints: number;
  startDate: string;
  endDate: string;
}

/**
 * Fetch historical data and calculate returns, volatility, etc.
 */
export async function analyzeHistoricalReturns(symbol: string, assetType?: AssetType): Promise<HistoricalAnalysis | null> {
  try {
    // Skip historical analysis for crypto - use default high return
    // CoinGecko API doesn't provide historical data in the same format
    if (assetType === "crypto") {
      console.log(`Using default returns for crypto ${symbol}`);
      return null;
    }
    
    const response = await fetch(`/api/historical-data?symbol=${encodeURIComponent(symbol)}`);
    
    if (!response.ok) {
      console.warn(`Failed to fetch historical data for ${symbol}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.prices || data.prices.length < 12) {
      console.warn(`Insufficient data for ${symbol}`);
      return null;
    }

    const prices: HistoricalPrice[] = data.prices;
    
    // Calculate monthly returns
    const monthlyReturns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const prevPrice = prices[i - 1].close;
      const currPrice = prices[i].close;
      if (prevPrice > 0) {
        const monthlyReturn = (currPrice - prevPrice) / prevPrice;
        monthlyReturns.push(monthlyReturn);
      }
    }

    if (monthlyReturns.length === 0) {
      return null;
    }

    // Calculate average monthly return
    const avgMonthlyReturn = monthlyReturns.reduce((sum, r) => sum + r, 0) / monthlyReturns.length;
    
    // Annualize the return (compound)
    const averageAnnualReturn = Math.pow(1 + avgMonthlyReturn, 12) - 1;

    // Calculate volatility (standard deviation of returns)
    const variance = monthlyReturns.reduce((sum, r) => {
      const diff = r - avgMonthlyReturn;
      return sum + diff * diff;
    }, 0) / monthlyReturns.length;
    
    const monthlyVolatility = Math.sqrt(variance);
    const annualVolatility = monthlyVolatility * Math.sqrt(12); // Annualize volatility

    // Calculate Sharpe Ratio (assuming 2% risk-free rate)
    const riskFreeRate = 0.02;
    const sharpeRatio = annualVolatility > 0 
      ? (averageAnnualReturn - riskFreeRate) / annualVolatility 
      : 0;

    // Calculate maximum drawdown
    let maxDrawdown = 0;
    let peak = prices[0].close;
    
    for (let i = 0; i < prices.length; i++) {
      if (prices[i].close > peak) {
        peak = prices[i].close;
      }
      const drawdown = (prices[i].close - peak) / peak;
      if (drawdown < maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    return {
      symbol,
      averageAnnualReturn,
      volatility: annualVolatility,
      sharpeRatio,
      maxDrawdown,
      dataPoints: prices.length,
      startDate: prices[0].date,
      endDate: prices[prices.length - 1].date,
    };

  } catch (error) {
    console.error(`Error analyzing ${symbol}:`, error);
    return null;
  }
}

/**
 * Get default expected return based on asset type
 */
export function getDefaultReturn(assetType: AssetType, symbol?: string): number {
  // Check if it's a known regional index
  if (symbol) {
    const upperSymbol = symbol.toUpperCase();
    
    // US stocks/ETFs
    if (upperSymbol.includes("US") || !upperSymbol.includes(".")) {
      return 0.08; // 8% for US equity
    }
    
    // European stocks/ETFs
    if (upperSymbol.includes(".DE") || upperSymbol.includes(".AS") || 
        upperSymbol.includes(".PA") || upperSymbol.includes(".L")) {
      return 0.06; // 6% for European equity
    }
    
    // Emerging markets
    if (upperSymbol.includes(".HK") || upperSymbol.includes(".SS")) {
      return 0.09; // 9% for emerging markets
    }
  }

  // Default by asset type
  switch (assetType) {
    case "etf":
      return 0.07; // 7% global equity average
    case "stock":
      return 0.08; // 8% individual stocks
    case "crypto":
      return 0.15; // 15% crypto (high risk/reward)
    case "cash":
      return 0.00; // 0% cash
    default:
      return 0.07;
  }
}

/**
 * Get conservative, realistic, and optimistic projections
 */
export function getProjectionScenarios(baseReturn: number): {
  conservative: number;
  realistic: number;
  optimistic: number;
} {
  return {
    conservative: baseReturn * 0.6, // 60% of base
    realistic: baseReturn, // Base return
    optimistic: baseReturn * 1.4, // 140% of base
  };
}

/**
 * Cache for historical analysis results
 */
const analysisCache = new Map<string, { data: HistoricalAnalysis | null; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function getCachedHistoricalAnalysis(symbol: string): Promise<HistoricalAnalysis | null> {
  const cached = analysisCache.get(symbol);
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  const analysis = await analyzeHistoricalReturns(symbol);
  analysisCache.set(symbol, { data: analysis, timestamp: Date.now() });
  
  return analysis;
}

