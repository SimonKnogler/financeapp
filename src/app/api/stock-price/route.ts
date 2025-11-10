import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      return NextResponse.json({ error: "No data returned" }, { status: 404 });
    }

    const price = result.meta?.regularMarketPrice;
    const currency = result.meta?.currency || "USD";
    const exchange = result.meta?.exchangeName || "";
    
    console.log(`${symbol}: price=${price} ${currency}, exchange=${exchange}`);

    if (typeof price !== "number") {
      return NextResponse.json({ error: "Invalid price data" }, { status: 404 });
    }

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      price,
      currency: currency.toUpperCase(),
      timestamp: Date.now(),
      exchange,
    });
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch stock price" },
      { status: 500 }
    );
  }
}

