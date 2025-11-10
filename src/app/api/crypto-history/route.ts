import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");
  const range = searchParams.get("range") || "30"; // days

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  const symbolUpper = symbol.toUpperCase();

  try {
    // Map range to Binance interval and limit
    const rangeMapping: Record<string, { interval: string; limit: number }> = {
      "1d": { interval: "15m", limit: 96 },      // 96 x 15min = 1 day
      "5d": { interval: "1h", limit: 120 },      // 120 hours = 5 days
      "1mo": { interval: "4h", limit: 180 },     // 180 x 4h = 30 days
      "30": { interval: "4h", limit: 180 },      // Same as 1mo
      "6mo": { interval: "1d", limit: 180 },     // 180 days
      "180": { interval: "1d", limit: 180 },     // Same as 6mo
      "1y": { interval: "1d", limit: 365 },      // 365 days
      "365": { interval: "1d", limit: 365 },     // Same as 1y
      "5y": { interval: "1w", limit: 260 },      // 260 weeks ~ 5 years
      "1825": { interval: "1w", limit: 260 },    // Same as 5y
    };

    const config = rangeMapping[range] || { interval: "1d", limit: 30 };
    
    // Use Binance Klines API - much faster than CoinGecko
    const binancePair = `${symbolUpper}USDT`;
    const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=${config.interval}&limit=${config.limit}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const binanceResponse = await fetch(binanceUrl, {
        headers: { "Accept": "application/json" },
        signal: controller.signal,
        next: { revalidate: 300 }, // Cache for 5 minutes
      });
      clearTimeout(timeoutId);

      if (binanceResponse.ok) {
        const klines = await binanceResponse.json();

        // Get EUR/USDT conversion rate
        const eurUsdtUrl = "https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT";
        let eurRate = 0.92;
        
        try {
          const eurResponse = await fetch(eurUsdtUrl, {
            next: { revalidate: 300 },
          });
          if (eurResponse.ok) {
            const eurData = await eurResponse.json();
            eurRate = 1 / parseFloat(eurData.price);
          }
        } catch (e) {
          // Use fallback
        }

        // Format chart data
        // Binance kline format: [timestamp, open, high, low, close, volume, ...]
        const chartData = klines.map((kline: any[]) => ({
          date: new Date(kline[0]).toISOString().split('T')[0],
          timestamp: Math.floor(kline[0] / 1000),
          open: parseFloat(kline[1]) * eurRate,
          high: parseFloat(kline[2]) * eurRate,
          low: parseFloat(kline[3]) * eurRate,
          close: parseFloat(kline[4]) * eurRate,
          volume: parseFloat(kline[5]),
        }));

        return NextResponse.json({
          symbol: symbolUpper,
          currency: "EUR",
          data: chartData,
          source: "binance",
        });
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.warn(`Binance timeout for ${symbol} history`);
      } else {
        throw error;
      }
    }

    // Fallback to CoinGecko for less common cryptos
    const symbolMap: Record<string, string> = {
      BTC: "bitcoin",
      ETH: "ethereum",
      USDT: "tether",
      BNB: "binancecoin",
      SOL: "solana",
      XRP: "ripple",
      USDC: "usd-coin",
      ADA: "cardano",
      DOGE: "dogecoin",
      AVAX: "avalanche-2",
      DOT: "polkadot",
      MATIC: "matic-network",
      LINK: "chainlink",
      UNI: "uniswap",
      LTC: "litecoin",
      ATOM: "cosmos",
      ETC: "ethereum-classic",
      XLM: "stellar",
      ALGO: "algorand",
      VET: "vechain",
    };

    const coinId = symbolMap[symbolUpper] || symbol.toLowerCase();
    const rangeDays: Record<string, string> = {
      "1d": "1",
      "5d": "5",
      "1mo": "30",
      "6mo": "180",
      "1y": "365",
      "5y": "1825",
    };
    const days = rangeDays[range] || range;

    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=eur&days=${days}`;
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch crypto history for ${symbol}: ${response.status}`);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: response.status });
    }

    const data = await response.json();
    const prices = data?.prices || [];

    const chartData = prices.map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toISOString().split('T')[0],
      timestamp: Math.floor(timestamp / 1000),
      close: price,
      open: price,
      high: price,
      low: price,
      volume: 0,
    }));

    return NextResponse.json({
      symbol: symbolUpper,
      currency: "EUR",
      data: chartData,
      source: "coingecko",
    });
  } catch (error) {
    console.error(`Error fetching crypto history for ${symbol}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch crypto history" },
      { status: 500 }
    );
  }
}

