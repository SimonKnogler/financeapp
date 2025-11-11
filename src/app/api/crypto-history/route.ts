import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch cryptocurrency historical data using CoinGecko API
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");
  const range = searchParams.get("range") || "30"; // days

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  const symbolUpper = symbol.toUpperCase();

  // Map crypto symbols to CoinGecko IDs
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
    ICP: "internet-computer",
  };

  const coinId = symbolMap[symbolUpper] || symbol.toLowerCase();

  // Map range to days
  const rangeDays: Record<string, string> = {
    "1d": "1",
    "5d": "5",
    "1mo": "30",
    "6mo": "180",
    "1y": "365",
    "5y": "1825",
  };
  const days = rangeDays[range] || range;

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=eur&days=${days}`;
    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      console.error(`CoinGecko history API error for ${symbol}: ${response.status}`);
      return NextResponse.json(
        { error: "Failed to fetch data", symbol: symbolUpper },
        { status: response.status }
      );
    }

    const data = await response.json();
    const prices = data?.prices || [];

    if (prices.length === 0) {
      return NextResponse.json(
        { error: "No historical data available", symbol: symbolUpper },
        { status: 404 }
      );
    }

    // Format chart data
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
  } catch (error: any) {
    console.error(`Error fetching crypto history for ${symbol}:`, error.message || error);
    return NextResponse.json(
      { error: "Failed to fetch crypto history", symbol: symbolUpper },
      { status: 500 }
    );
  }
}

