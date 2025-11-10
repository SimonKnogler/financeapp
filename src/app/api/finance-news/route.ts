import { NextRequest, NextResponse } from "next/server";

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  publishedAt: string;
  imageUrl?: string;
  category: "germany" | "us" | "global";
}

interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  publishedAt: string;
  thumbnail: string;
  url: string;
  category: "germany" | "us" | "global";
}

/**
 * Fetches financial and economic news from Germany and US
 * Uses News API for articles
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const region = searchParams.get("region") || "all"; // "germany", "us", or "all"
  
  try {
    const newsApiKey = process.env.NEWS_API_KEY;
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    
    const articles: NewsArticle[] = [];
    const videos: YouTubeVideo[] = [];
    
    // Fetch news articles
    if (newsApiKey) {
      if (region === "germany" || region === "all") {
        const germanyNews = await fetchGermanyNews(newsApiKey);
        articles.push(...germanyNews);
      }
      
      if (region === "us" || region === "all") {
        const usNews = await fetchUSNews(newsApiKey);
        articles.push(...usNews);
      }
    } else {
      // Use fallback curated sources
      articles.push(...getFallbackNews());
    }
    
    // Fetch YouTube videos
    if (youtubeApiKey) {
      if (region === "germany" || region === "all") {
        const germanyVideos = await fetchGermanyVideos(youtubeApiKey);
        videos.push(...germanyVideos);
      }
      
      if (region === "us" || region === "all") {
        const usVideos = await fetchUSVideos(youtubeApiKey);
        videos.push(...usVideos);
      }
    } else {
      // Use fallback curated channels
      videos.push(...getFallbackVideos());
    }
    
    return NextResponse.json({
      articles: articles.slice(0, 12),
      videos: videos.slice(0, 8),
      timestamp: Date.now(),
      usingFallback: !newsApiKey || !youtubeApiKey,
    });
    
  } catch (error) {
    console.error("Error fetching finance news:", error);
    
    return NextResponse.json({
      articles: getFallbackNews(),
      videos: getFallbackVideos(),
      timestamp: Date.now(),
      error: "Using fallback content",
    });
  }
}

async function fetchGermanyNews(apiKey: string): Promise<NewsArticle[]> {
  const query = encodeURIComponent("wirtschaft OR finanzen OR börse OR dax");
  const url = `https://newsapi.org/v2/everything?q=${query}&language=de&sortBy=publishedAt&apiKey=${apiKey}&pageSize=6`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.articles) {
    return data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      publishedAt: article.publishedAt,
      imageUrl: article.urlToImage,
      category: "germany" as const,
    }));
  }
  
  return [];
}

async function fetchUSNews(apiKey: string): Promise<NewsArticle[]> {
  const query = encodeURIComponent("finance OR economy OR stock market OR federal reserve");
  const url = `https://newsapi.org/v2/everything?q=${query}&language=en&sortBy=publishedAt&apiKey=${apiKey}&pageSize=6`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (data.articles) {
    return data.articles.map((article: any) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      source: article.source.name,
      publishedAt: article.publishedAt,
      imageUrl: article.urlToImage,
      category: "us" as const,
    }));
  }
  
  return [];
}

async function fetchGermanyVideos(apiKey: string): Promise<YouTubeVideo[]> {
  // Search for German financial channels
  const channels = [
    "UC_1H0lk_eHMcIAY0Y0VdD6g", // Finanzfluss
    "UCeARcCUiZg79SQQ-2_XNlXQ", // Finanztip
  ];
  
  const videos: YouTubeVideo[] = [];
  
  for (const channelId of channels.slice(0, 1)) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=4&order=date&type=video&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.items) {
      videos.push(...data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails.medium.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        category: "germany" as const,
      })));
    }
  }
  
  return videos;
}

async function fetchUSVideos(apiKey: string): Promise<YouTubeVideo[]> {
  // Search for US financial channels
  const channels = [
    "UCIALMKvObZNtJ6AmdCLP7Lg", // Bloomberg Television
    "UCrp_UI8XtuYfpiqluWLD7Lw", // CNBC Television
  ];
  
  const videos: YouTubeVideo[] = [];
  
  for (const channelId of channels.slice(0, 1)) {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=4&order=date&type=video&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.items) {
      videos.push(...data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        channel: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails.medium.url,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        category: "us" as const,
      })));
    }
  }
  
  return videos;
}

function getFallbackNews(): NewsArticle[] {
  return [
    {
      title: "Get live financial news with News API",
      description: "Configure NEWS_API_KEY in your .env.local to see real-time financial news from Germany and the US",
      url: "https://newsapi.org/",
      source: "Setup Required",
      publishedAt: new Date().toISOString(),
      category: "global",
    },
    {
      title: "Deutsche Wirtschaft - Aktuelle Nachrichten",
      description: "Tagesschau bietet aktuelle Wirtschaftsnachrichten aus Deutschland",
      url: "https://www.tagesschau.de/wirtschaft/",
      source: "Tagesschau",
      publishedAt: new Date().toISOString(),
      category: "germany",
    },
    {
      title: "DAX aktuell - Börse Frankfurt",
      description: "Aktuelle Kurse und Analysen zum DAX",
      url: "https://www.boerse-frankfurt.de/index/dax",
      source: "Börse Frankfurt",
      publishedAt: new Date().toISOString(),
      category: "germany",
    },
    {
      title: "Wall Street Journal - Markets",
      description: "Latest US market news and analysis",
      url: "https://www.wsj.com/markets",
      source: "Wall Street Journal",
      publishedAt: new Date().toISOString(),
      category: "us",
    },
    {
      title: "Bloomberg - Economics",
      description: "Global economic news and data",
      url: "https://www.bloomberg.com/economics",
      source: "Bloomberg",
      publishedAt: new Date().toISOString(),
      category: "us",
    },
  ];
}

function getFallbackVideos(): YouTubeVideo[] {
  return [
    {
      id: "fallback-1",
      title: "Finanzfluss - German Finance Channel",
      channel: "Finanzfluss",
      publishedAt: new Date().toISOString(),
      thumbnail: "https://via.placeholder.com/320x180?text=Finanzfluss",
      url: "https://www.youtube.com/@Finanzfluss",
      category: "germany",
    },
    {
      id: "fallback-2",
      title: "Finanztip - Money Tips Germany",
      channel: "Finanztip",
      publishedAt: new Date().toISOString(),
      thumbnail: "https://via.placeholder.com/320x180?text=Finanztip",
      url: "https://www.youtube.com/@Finanztip",
      category: "germany",
    },
    {
      id: "fallback-3",
      title: "Bloomberg Television",
      channel: "Bloomberg",
      publishedAt: new Date().toISOString(),
      thumbnail: "https://via.placeholder.com/320x180?text=Bloomberg",
      url: "https://www.youtube.com/@markets",
      category: "us",
    },
    {
      id: "fallback-4",
      title: "CNBC Television",
      channel: "CNBC",
      publishedAt: new Date().toISOString(),
      thumbnail: "https://via.placeholder.com/320x180?text=CNBC",
      url: "https://www.youtube.com/@CNBCtelevision",
      category: "us",
    },
  ];
}

