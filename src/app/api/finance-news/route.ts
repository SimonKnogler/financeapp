import { NextRequest, NextResponse } from "next/server";
import Parser from "rss-parser";

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  category: Region;
}

interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  publishedAt: string;
  thumbnail: string;
  url: string;
  category: Region;
}

type Region = "germany" | "us" | "global";

type ParserItem = {
  title?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  enclosure?: { url?: string };
  guid?: string;
  [key: string]: any;
};

const rssParser = new Parser<ParserItem>({
  headers: {
    "User-Agent": "FinancesApp/1.0 (+https://financeapp)",
  },
  timeout: 8000,
});

const ARTICLE_FEEDS: Record<Region, { url: string; source: string }[]> = {
  germany: [
    { url: "https://www.tagesschau.de/xml/rss2/", source: "Tagesschau" },
    { url: "https://www.handelsblatt.com/contentexport/feed/finance", source: "Handelsblatt" },
    { url: "https://www.manager-magazin.de/rss", source: "manager magazin" },
  ],
  us: [
    { url: "https://feeds.a.dj.com/rss/RSSMarketsMain.xml", source: "Wall Street Journal" },
    { url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", source: "CNBC Markets" },
    { url: "https://www.marketwatch.com/rss/topstories", source: "MarketWatch" },
  ],
  global: [
    { url: "https://feeds.reuters.com/reuters/businessNews", source: "Reuters" },
    { url: "https://www.ft.com/rss/home", source: "Financial Times" },
    { url: "https://www.bloomberg.com/feed/podcast/etf-report.xml", source: "Bloomberg" },
  ],
};

const YOUTUBE_CHANNELS: Record<Region, { channelId: string; label: string }[]> = {
  germany: [
    { channelId: "UC_1H0lk_eHMcIAY0Y0VdD6g", label: "Finanzfluss" },
    { channelId: "UCeARcCUiZg79SQQ-2_XNlXQ", label: "Finanztip" },
  ],
  us: [
    { channelId: "UCIALMKvObZNtJ6AmdCLP7Lg", label: "Bloomberg Television" },
    { channelId: "UCrp_UI8XtuYfpiqluWLD7Lw", label: "CNBC Television" },
  ],
  global: [
    { channelId: "UCnyBx5LP8TJM6LeTnl5WlIg", label: "Financial Times" },
    { channelId: "UCIALMKvObZNtJ6AmdCLP7Lg", label: "Bloomberg Television" },
  ],
};

function normaliseText(value?: string | null): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function toISODate(value?: string): string {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function extractImage(item: ParserItem): string | undefined {
  const enclosure = item.enclosure?.url;
  const mediaContent = item["media:content"]?.["$"]?.url || item["media:content"]?.url;
  const mediaThumbnail = item["media:thumbnail"]?.["$"]?.url || item["media:thumbnail"]?.url;
  const firstImage = item["image"]?.url;
  return enclosure || mediaContent || mediaThumbnail || firstImage || undefined;
}

async function fetchArticlesForRegion(region: Region): Promise<NewsArticle[]> {
  const feeds = ARTICLE_FEEDS[region];
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const parsed = await rssParser.parseURL(feed.url);
      return (parsed.items ?? []).map((item) => ({
        title: normaliseText(item.title) || feed.source,
        description: normaliseText(item.contentSnippet || item.summary || item.content),
        url: item.link ?? "",
        source: feed.source,
        publishedAt: toISODate(item.isoDate ?? item.pubDate),
        imageUrl: extractImage(item),
        category: region,
      })) as NewsArticle[];
    })
  );

  const articles = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));

  const deduped = dedupeByUrl(articles).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return deduped.slice(0, 8);
}

async function fetchVideosForRegion(region: Region): Promise<YouTubeVideo[]> {
  const channels = YOUTUBE_CHANNELS[region];
  if (!channels?.length) {
    return [];
  }

  const results = await Promise.allSettled(
    channels.map(async (channel) => {
      const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channelId}`;
      const parsed = await rssParser.parseURL(url);
      return (parsed.items ?? []).map((item) => {
        const id = (item.id ?? "").replace("yt:video:", "");
        const link = item.link ?? (id ? `https://www.youtube.com/watch?v=${id}` : "");
        const thumbnail = item["media:thumbnail"]?.["$"]?.url || item["media:thumbnail"]?.url;
        return {
          id: id || item.guid || link,
          title: normaliseText(item.title) || channel.label,
          channel: channel.label,
          publishedAt: toISODate(item.isoDate ?? item.pubDate),
          thumbnail: thumbnail ?? "https://i.ytimg.com/img/no_thumbnail.jpg",
          url: link,
          category: region,
        } satisfies YouTubeVideo;
      });
    })
  );

  const videos = results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
  const deduped = dedupeById(videos).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  return deduped.slice(0, 8);
}

function dedupeByUrl(items: NewsArticle[]): NewsArticle[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.url || `${item.source}:${item.title}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return Boolean(item.url);
  });
}

function dedupeById(items: YouTubeVideo[]): YouTubeVideo[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.id || item.url;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return Boolean(item.url);
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const regionParam = (searchParams.get("region") ?? "all").toLowerCase();

  const requestedRegions: Region[] =
    regionParam === "all"
      ? ["germany", "us", "global"]
      : (regionParam === "germany" || regionParam === "us" || regionParam === "global"
          ? [regionParam]
          : ["germany", "us", "global"]);

  try {
    const [articlesArrays, videosArrays] = await Promise.all([
      Promise.all(requestedRegions.map((region) => fetchArticlesForRegion(region))),
      Promise.all(requestedRegions.map((region) => fetchVideosForRegion(region))),
    ]);

    const articles = dedupeByUrl(articlesArrays.flat()).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    const videos = dedupeById(videosArrays.flat()).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );

    return NextResponse.json(
      {
        articles: articles.slice(0, 18),
        videos: videos.slice(0, 12),
        timestamp: Date.now(),
        usingFallback: articles.length === 0 && videos.length === 0,
      },
      {
        headers: {
          "Cache-Control": "s-maxage=300, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching finance news:", error);

    return NextResponse.json(
      {
        articles: [],
        videos: [],
        timestamp: Date.now(),
        usingFallback: true,
        error: "Failed to load live feeds",
      },
      {
        headers: {
          "Cache-Control": "s-maxage=60",
        },
      }
    );
  }
}

