import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch cryptocurrency price using CoinGecko API (free, no API key needed)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  const symbolUpper = symbol.toUpperCase();

  // Map common crypto symbols to CoinGecko IDs
  const coinGeckoIds: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    USDT: "tether",
    BNB: "binancecoin",
    USDC: "usd-coin",
    XRP: "ripple",
    ADA: "cardano",
    DOGE: "dogecoin",
    SOL: "solana",
    DOT: "polkadot",
    MATIC: "matic-network",
    LTC: "litecoin",
    AVAX: "avalanche-2",
    LINK: "chainlink",
    UNI: "uniswap",
    ATOM: "cosmos",
    XLM: "stellar",
    ALGO: "algorand",
    VET: "vechain",
    ICP: "internet-computer",
    ETC: "ethereum-classic",
  };

  const coinGeckoId = coinGeckoIds[symbolUpper] || symbol.toLowerCase();
  const coinGeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinGeckoId}&vs_currencies=eur&include_24hr_change=true`;

  try {
    const response = await fetch(coinGeckoUrl, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 60 }, // Cache for 1 minute
    });

    if (!response.ok) {
      console.error(`CoinGecko API error for ${symbol}: ${response.status}`);
      return NextResponse.json(
        { error: "Crypto not found", symbol: symbolUpper },
        { status: 404 }
      );
    }

    const data = await response.json();

    if (!data[coinGeckoId]?.eur) {
      console.error(`No price data for ${symbol} (${coinGeckoId})`);
      return NextResponse.json(
        { error: "No price data available", symbol: symbolUpper },
        { status: 404 }
      );
    }

    const eurPrice = data[coinGeckoId].eur;
    const changePercent24Hr = data[coinGeckoId].eur_24h_change || 0;

        return NextResponse.json({
      symbol: symbolUpper,
          price: eurPrice,
          currency: "EUR",
          timestamp: Date.now(),
          change24h: changePercent24Hr,
      source: "coingecko",
        });
  } catch (error: any) {
    console.error(`Error fetching crypto price for ${symbol}:`, error.message || error);
    return NextResponse.json(
      { error: "Failed to fetch crypto price", symbol: symbolUpper },
      { status: 500 }
    );
  }
}

