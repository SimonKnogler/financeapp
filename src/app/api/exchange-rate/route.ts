import { NextRequest, NextResponse } from "next/server";

// Cache exchange rates for 1 hour
let rateCache: { rates: Record<string, number>; expires: number } | null = null;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get("from") || "USD";
  const to = searchParams.get("to") || "EUR";

  try {
    const now = Date.now();
    
    // Check cache
    if (rateCache && rateCache.expires > now) {
      const rate = rateCache.rates[`${from}_${to}`];
      if (rate) {
        return NextResponse.json({ from, to, rate });
      }
    }

    // Fetch from exchangerate-api.com (free, no key required for basic usage)
    const response = await fetch(`https://open.er-api.com/v6/latest/${from}`);
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch rates: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const rates = data?.rates;

    if (!rates || typeof rates !== "object") {
      return NextResponse.json({ error: "Invalid rate data" }, { status: 404 });
    }

    // Cache all rates
    const cacheData: Record<string, number> = {};
    for (const currency in rates) {
      cacheData[`${from}_${currency}`] = rates[currency];
    }
    rateCache = { rates: cacheData, expires: now + 60 * 60 * 1000 }; // 1 hour

    const rate = rates[to];
    if (typeof rate !== "number") {
      return NextResponse.json({ error: "Rate not found" }, { status: 404 });
    }

    return NextResponse.json({ from, to, rate });
  } catch (error) {
    console.error(`Error fetching exchange rate ${from} -> ${to}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch exchange rate" },
      { status: 500 }
    );
  }
}

