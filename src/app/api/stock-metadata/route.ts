import { NextRequest, NextResponse } from "next/server";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.5 Safari/605.1.15";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  const upperSymbol = symbol.toUpperCase();
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
    upperSymbol
  )}?modules=assetProfile`;

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      next: { revalidate: 21600 }, // 6 hours
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch metadata: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const result = data?.quoteSummary?.result?.[0]?.assetProfile;

    if (!result) {
      return NextResponse.json(
        {
          symbol: upperSymbol,
          sector: null,
          industry: null,
          country: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        symbol: upperSymbol,
        sector: result.sector ?? null,
        industry: result.industry ?? null,
        country: result.country ?? null,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error(`Error fetching metadata for ${upperSymbol}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch stock metadata" },
      { status: 500 }
    );
  }
}

