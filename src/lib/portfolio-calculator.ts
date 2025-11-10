import { StockHolding, StockPrice, PortfolioOwner } from "@/types/finance";
import { fetchStockPrices } from "./stock-prices";

export interface PortfolioBreakdown {
  symbol: string;
  type: "stock" | "crypto" | "etf" | "cash";
  shares: number;
  price: number;
  value: number;
  owner: PortfolioOwner;
}

export interface PortfolioValue {
  total: number;
  cash: number;
  investments: number;
  breakdown: PortfolioBreakdown[];
}

/**
 * Calculate portfolio value with live prices
 * This is the centralized, authoritative portfolio calculation
 * Use this everywhere to ensure consistency
 */
export async function calculatePortfolioValue(
  stocks: StockHolding[],
  owner?: PortfolioOwner | "total"
): Promise<PortfolioValue> {
  // Filter by owner if specified
  const filteredStocks = owner && owner !== "total"
    ? stocks.filter(s => s.owner === owner)
    : stocks;

  if (filteredStocks.length === 0) {
    return {
      total: 0,
      cash: 0,
      investments: 0,
      breakdown: [],
    };
  }

  // Separate cash from investments
  const cashHoldings = filteredStocks.filter(s => s.type === "cash");
  const investmentHoldings = filteredStocks.filter(s => s.type !== "cash");

  // Calculate cash value (no price fetching needed)
  const cashValue = cashHoldings.reduce((sum, stock) => sum + stock.shares, 0);

  // If no investments, return early
  if (investmentHoldings.length === 0) {
    return {
      total: cashValue,
      cash: cashValue,
      investments: 0,
      breakdown: cashHoldings.map(stock => ({
        symbol: stock.symbol,
        type: stock.type,
        shares: stock.shares,
        price: 1,
        value: stock.shares,
        owner: stock.owner,
      })),
    };
  }

  // Separate stocks/ETFs from crypto
  const stockETFHoldings = investmentHoldings.filter(s => s.type === "stock" || s.type === "etf");
  const cryptoHoldings = investmentHoldings.filter(s => s.type === "crypto");
  
  // Fetch prices for stocks/ETFs and crypto in parallel
  const [stockPrices, cryptoPrices] = await Promise.all([
    // Fetch stock/ETF prices
    stockETFHoldings.length > 0 
      ? fetchStockPrices(stockETFHoldings.map(s => s.symbol), "EUR")
      : Promise.resolve(new Map()),
    
    // Fetch crypto prices in parallel
    cryptoHoldings.length > 0
      ? Promise.all(
          cryptoHoldings.map(async (crypto) => {
            try {
              const response = await fetch(`/api/crypto-price?symbol=${encodeURIComponent(crypto.symbol)}`);
              if (response.ok) {
                const data = await response.json();
                return {
                  symbol: crypto.symbol.toUpperCase(),
                  price: {
                    symbol: crypto.symbol.toUpperCase(),
                    price: data.price,
                    currency: data.currency,
                    timestamp: data.timestamp,
                  } as StockPrice,
                };
              }
            } catch (error) {
              console.error(`Failed to fetch crypto price for ${crypto.symbol}:`, error);
            }
            return null;
          })
        ).then(results => {
          const cryptoMap = new Map<string, StockPrice>();
          results.forEach(result => {
            if (result) {
              cryptoMap.set(result.symbol, result.price);
            }
          });
          return cryptoMap;
        })
      : Promise.resolve(new Map()),
  ]);
  
  // Combine stock and crypto prices
  const prices = new Map([...stockPrices, ...cryptoPrices]);

  // Calculate breakdown for each holding
  const breakdown: PortfolioBreakdown[] = [];
  let investmentValue = 0;

  // Add cash holdings
  cashHoldings.forEach(stock => {
    breakdown.push({
      symbol: stock.symbol,
      type: stock.type,
      shares: stock.shares,
      price: 1,
      value: stock.shares,
      owner: stock.owner,
    });
  });

  // Add investment holdings
  investmentHoldings.forEach(stock => {
    const priceData = prices.get(stock.symbol.toUpperCase());
    if (priceData) {
      const value = stock.shares * priceData.price;
      investmentValue += value;
      breakdown.push({
        symbol: stock.symbol,
        type: stock.type,
        shares: stock.shares,
        price: priceData.price,
        value,
        owner: stock.owner,
      });
    } else {
      // If no price found, use 0 but still include in breakdown
      console.warn(`No price found for ${stock.symbol}`);
      breakdown.push({
        symbol: stock.symbol,
        type: stock.type,
        shares: stock.shares,
        price: 0,
        value: 0,
        owner: stock.owner,
      });
    }
  });

  return {
    total: cashValue + investmentValue,
    cash: cashValue,
    investments: investmentValue,
    breakdown,
  };
}

/**
 * Calculate portfolio value synchronously using provided prices
 * Useful when prices are already fetched
 */
export function calculatePortfolioValueSync(
  stocks: StockHolding[],
  prices: Map<string, StockPrice>,
  owner?: PortfolioOwner | "total"
): PortfolioValue {
  const filteredStocks = owner && owner !== "total"
    ? stocks.filter(s => s.owner === owner)
    : stocks;

  if (filteredStocks.length === 0) {
    return {
      total: 0,
      cash: 0,
      investments: 0,
      breakdown: [],
    };
  }

  const breakdown: PortfolioBreakdown[] = [];
  let cashValue = 0;
  let investmentValue = 0;

  filteredStocks.forEach(stock => {
    if (stock.type === "cash") {
      cashValue += stock.shares;
      breakdown.push({
        symbol: stock.symbol,
        type: stock.type,
        shares: stock.shares,
        price: 1,
        value: stock.shares,
        owner: stock.owner,
      });
    } else {
      const priceData = prices.get(stock.symbol.toUpperCase());
      const price = priceData?.price || 0;
      const value = stock.shares * price;
      investmentValue += value;
      breakdown.push({
        symbol: stock.symbol,
        type: stock.type,
        shares: stock.shares,
        price,
        value,
        owner: stock.owner,
      });
    }
  });

  return {
    total: cashValue + investmentValue,
    cash: cashValue,
    investments: investmentValue,
    breakdown,
  };
}

/**
 * Get active Sparpläne with total monthly contribution
 */
export function getActiveSparplans(stocks: StockHolding[]) {
  const activeSparpläne = stocks.filter(
    s => s.type === "etf" && s.sparplan?.active
  );

  const totalMonthlyContribution = activeSparpläne.reduce(
    (sum, s) => sum + (s.sparplan?.monthlyAmount || 0),
    0
  );

  return {
    sparpläne: activeSparpläne,
    count: activeSparpläne.length,
    totalMonthly: totalMonthlyContribution,
  };
}

