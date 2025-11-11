import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch cryptocurrency price using CoinCap API (reliable, no API key needed)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  const symbolUpper = symbol.toUpperCase();

  // Map common crypto symbols to CoinCap IDs
  const coinCapIds: Record<string, string> = {
    BTC: "bitcoin",
    ETH: "ethereum",
    USDT: "tether",
    BNB: "binance-coin",
    USDC: "usd-coin",
    XRP: "xrp",
    ADA: "cardano",
    DOGE: "dogecoin",
    SOL: "solana",
    DOT: "polkadot",
    MATIC: "polygon",
    LTC: "litecoin",
    AVAX: "avalanche",
    LINK: "chainlink",
    UNI: "uniswap",
    ATOM: "cosmos",
    XLM: "stellar",
    ALGO: "algorand",
    VET: "vechain",
    ICP: "internet-computer",
    ETC: "ethereum-classic",
  };

  const coinCapId = coinCapIds[symbolUpper] || symbol.toLowerCase();
  const coinCapUrl = `https://api.coincap.io/v2/assets/${coinCapId}`;

  try {
    const response = await fetch(coinCapUrl, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    if (!response.ok) {
      console.error(`CoinCap API error for ${symbol}: ${response.status}`);
      return NextResponse.json(
        { error: "Crypto not found", symbol: symbolUpper },
        { status: 404 }
      );
    }

    const data = await response.json();

    if (!data.data?.priceUsd) {
      console.error(`No price data for ${symbol}`);
      return NextResponse.json(
        { error: "No price data available", symbol: symbolUpper },
        { status: 404 }
      );
    }

    const priceUsd = parseFloat(data.data.priceUsd);
    const changePercent24Hr = parseFloat(data.data.changePercent24Hr || "0");
    
    // Simple USD to EUR conversion (approximate)
    const eurPrice = priceUsd * 0.92;

    return NextResponse.json({
      symbol: symbolUpper,
      price: eurPrice,
      currency: "EUR",
      timestamp: Date.now(),
      change24h: changePercent24Hr,
      source: "coincap",
    });
  } catch (error: any) {
    console.error(`Error fetching crypto price for ${symbol}:`, error.message || error);
    return NextResponse.json(
      { error: "Failed to fetch crypto price", symbol: symbolUpper },
      { status: 500 }
    );
  }
}

