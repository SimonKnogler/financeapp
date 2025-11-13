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
  )}?modules=assetProfile,fundProfile,summaryProfile`;

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
    const summary = data?.quoteSummary?.result?.[0];
    const assetProfile = summary?.assetProfile;
    const fundProfile = summary?.fundProfile;
    const summaryProfile = summary?.summaryProfile;

    if (!assetProfile && !fundProfile && !summaryProfile) {
      return NextResponse.json(
        {
          symbol: upperSymbol,
          sector: null,
          industry: null,
          country: null,
          category: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        symbol: upperSymbol,
        sector: assetProfile?.sector ?? summaryProfile?.sector ?? null,
        industry: assetProfile?.industry ?? summaryProfile?.industry ?? null,
        country: assetProfile?.country ?? summaryProfile?.country ?? null,
        category: fundProfile?.categoryName ?? fundProfile?.investmentStyle ?? null,
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

