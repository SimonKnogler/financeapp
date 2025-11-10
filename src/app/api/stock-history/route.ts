import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");
  const range = searchParams.get("range") || "1mo"; // 1d, 5d, 1mo, 6mo, 1y, 5y

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  try {
    // Determine appropriate interval based on range
    let interval = "1d";
    switch (range) {
      case "1d":
        interval = "5m"; // 5 minute intervals for 1 day
        break;
      case "5d":
        interval = "15m"; // 15 minute intervals for 5 days
        break;
      case "1mo":
        interval = "1h"; // 1 hour intervals for 1 month
        break;
      case "6mo":
        interval = "1d"; // 1 day intervals for 6 months
        break;
      case "1y":
        interval = "1d"; // 1 day intervals for 1 year
        break;
      case "5y":
        interval = "1wk"; // 1 week intervals for 5 years
        break;
      default:
        interval = "1d";
    }

    // Fetch historical data from Yahoo Finance
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}`;
    
    console.log(`Fetching ${range} chart for ${symbol} with ${interval} interval`);
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch history for ${symbol}: ${response.status}`);
      return NextResponse.json({ error: "Failed to fetch data" }, { status: response.status });
    }

    const data = await response.json();
    const result = data?.chart?.result?.[0];

    if (!result) {
      console.warn(`No data in response for ${symbol}`);
      return NextResponse.json({ error: "No data returned" }, { status: 404 });
    }

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];
    const opens = quotes.open || [];
    const highs = quotes.high || [];
    const lows = quotes.low || [];
    const volumes = quotes.volume || [];

    console.log(`${symbol}: Retrieved ${timestamps.length} data points for ${range}`);

    // Format chart data with proper date formatting
    const chartData = timestamps.map((ts: number, idx: number) => {
      const date = new Date(ts * 1000);
      // For intraday data (1d, 5d), include time; for daily+, just date
      const dateStr = interval.includes('m') || interval.includes('h') 
        ? date.toISOString().slice(0, 16).replace('T', ' ') // "YYYY-MM-DD HH:MM"
        : date.toISOString().split('T')[0]; // "YYYY-MM-DD"
      
      return {
        date: dateStr,
        timestamp: ts,
        close: closes[idx],
        open: opens[idx],
        high: highs[idx],
        low: lows[idx],
        volume: volumes[idx],
      };
    }).filter((d: any) => d.close !== null && d.close !== undefined);

    const currency = result.meta?.currency || "USD";

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      currency: currency.toUpperCase(),
      data: chartData,
    });
  } catch (error) {
    console.error(`Error fetching history for ${symbol}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch stock history" },
      { status: 500 }
    );
  }
}

