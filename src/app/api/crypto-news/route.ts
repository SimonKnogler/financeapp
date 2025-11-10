import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  try {
    // Use CryptoCompare free API for news with timeout
    const url = `https://min-api.cryptocompare.com/data/v2/news/?categories=${symbol.toUpperCase()}&lang=EN`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
      signal: controller.signal,
      next: { revalidate: 600 }, // Cache for 10 minutes
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Failed to fetch crypto news for ${symbol}: ${response.status}`);
      return NextResponse.json({ news: [] });
    }

    const data = await response.json();
    const newsItems = data?.Data || [];

    // Filter and format news
    const symbolUpper = symbol.toUpperCase();
    const formattedNews = newsItems
      .filter((item: any) => {
        const title = (item.title || "").toUpperCase();
        const body = (item.body || "").toUpperCase();
        // Check if symbol or common name appears in title or body
        return title.includes(symbolUpper) || 
               body.includes(symbolUpper) ||
               title.includes("BITCOIN") && symbolUpper === "BTC" ||
               title.includes("ETHEREUM") && symbolUpper === "ETH";
      })
      .slice(0, 3)
      .map((item: any) => ({
        title: item.title || "",
        publisher: item.source || "",
        link: item.url || item.guid || "",
        publishedAt: item.published_on ? new Date(item.published_on * 1000).toISOString() : null,
        thumbnail: item.imageurl || null,
      }));

    console.log(`${symbol}: Found ${newsItems.length} crypto news, using ${formattedNews.length}`);

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      news: formattedNews,
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn(`Crypto news timeout for ${symbol}`);
    } else {
      console.error(`Error fetching crypto news for ${symbol}:`, error);
    }
    return NextResponse.json({ news: [] });
  }
}

