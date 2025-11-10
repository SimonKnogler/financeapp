import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  try {
    // Extract base ticker (e.g., "ASML" from "ASML.AS")
    const baseTicker = symbol.split('.')[0].toUpperCase();
    
    console.log(`Fetching news for ${symbol} (searching for: ${baseTicker})`);

    // Search for news using the base ticker
    const searchUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(baseTicker)}&quotesCount=1&newsCount=10&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;
    const response = await fetch(searchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (!response.ok) {
      console.warn(`Failed to fetch news for ${baseTicker}: ${response.status}`);
      return NextResponse.json({ news: [] });
    }

    const data = await response.json();
    const newsItems = data?.news || [];
    
    // Simple filter: news must mention the base ticker in title or be in relatedTickers
    const filteredNews = newsItems
      .filter((item: any) => {
        const title = (item.title || "").toUpperCase();
        const relatedTickers = (item.relatedTickers || []).map((t: string) => t.split('.')[0].toUpperCase());
        
        // Must mention ticker in title OR be in related tickers
        return title.includes(baseTicker) || 
               title.includes(`$${baseTicker}`) ||
               relatedTickers.includes(baseTicker);
      })
      .sort((a: any, b: any) => {
        // Sort by publish time (most recent first)
        return (b.providerPublishTime || 0) - (a.providerPublishTime || 0);
      })
      .slice(0, 3); // Top 3 most recent

    console.log(`${symbol}: Found ${newsItems.length} total news, filtered to ${filteredNews.length} relevant articles about ${baseTicker}`);

    // Format news items
    const formattedNews = filteredNews.map((item: any) => ({
      title: item.title || "",
      publisher: item.publisher || "",
      link: item.link || "",
      publishedAt: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : null,
      thumbnail: item.thumbnail?.resolutions?.[0]?.url || null,
    }));

    return NextResponse.json({
      symbol: symbol.toUpperCase(),
      news: formattedNews,
    });
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return NextResponse.json({ news: [] });
  }
}

