"use client";

import { useState, useEffect } from "react";
import { Newspaper, RefreshCw, ExternalLink, Youtube, Globe } from "lucide-react";

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

interface NewsData {
  articles: NewsArticle[];
  videos: YouTubeVideo[];
  timestamp: number;
  usingFallback?: boolean;
}

export default function NewsPage() {
  const [newsData, setNewsData] = useState<NewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "germany" | "us">("all");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/finance-news?region=${filter}`);
      const data = await response.json();
      setNewsData(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Failed to fetch news:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // Refresh every 30 minutes
    const interval = setInterval(fetchNews, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [filter]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "germany":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "us":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
    }
  };

  const getCategoryFlag = (category: string) => {
    switch (category) {
      case "germany":
        return "🇩🇪";
      case "us":
        return "🇺🇸";
      default:
        return "🌍";
    }
  };

  const filteredArticles = newsData?.articles.filter(
    (a) => filter === "all" || a.category === filter
  ) || [];

  const filteredVideos = newsData?.videos.filter(
    (v) => filter === "all" || v.category === filter
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
            <Newspaper className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Financial News</h1>
            <p className="text-sm text-zinc-500">
              Economic & Finance updates from Germany and the US
            </p>
          </div>
        </div>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setFilter("all")}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
            filter === "all"
              ? "border-purple-500 text-purple-600 dark:text-purple-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          <Globe className="h-4 w-4" />
          All
        </button>
        <button
          onClick={() => setFilter("germany")}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
            filter === "germany"
              ? "border-yellow-500 text-yellow-600 dark:text-yellow-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          🇩🇪 Germany
        </button>
        <button
          onClick={() => setFilter("us")}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
            filter === "us"
              ? "border-blue-500 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
          }`}
        >
          🇺🇸 United States
        </button>
      </div>

      {/* Setup Notice */}
      {newsData?.usingFallback && (
        <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
            📰 Setup API Keys for Live News
          </h3>
          <p className="text-xs text-blue-800 dark:text-blue-400 mb-2">
            Currently showing fallback content. Add these API keys to your <code>.env.local</code> file:
          </p>
          <ul className="text-xs text-blue-800 dark:text-blue-400 space-y-1 ml-4">
            <li>• <strong>NEWS_API_KEY</strong> - Get free at <a href="https://newsapi.org/" target="_blank" rel="noopener" className="underline">newsapi.org</a></li>
            <li>• <strong>YOUTUBE_API_KEY</strong> - Get free at <a href="https://console.cloud.google.com/" target="_blank" rel="noopener" className="underline">Google Cloud</a></li>
          </ul>
        </div>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <div className="text-xs text-zinc-500">
          Last updated: {lastUpdate.toLocaleString()}
        </div>
      )}

      {loading && !newsData ? (
        <div className="text-center py-12 text-zinc-500">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          Loading financial news...
        </div>
      ) : (
        <>
          {/* YouTube Videos Section */}
          {filteredVideos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Youtube className="h-5 w-5 text-red-600" />
                <h2 className="text-lg font-semibold">Video Updates</h2>
              </div>
              
              {/* Video Player Modal */}
              {selectedVideo && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedVideo(null)}>
                  <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedVideo(null)}
                      className="absolute -top-10 right-0 text-white hover:text-gray-300 text-sm flex items-center gap-2"
                    >
                      ✕ Close
                    </button>
                    <div className="bg-black rounded-lg overflow-hidden">
                      <div className="relative" style={{ paddingBottom: "56.25%" }}>
                        <iframe
                          className="absolute inset-0 w-full h-full"
                          src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
                          title={selectedVideo.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                      <div className="p-4 bg-zinc-900">
                        <h3 className="font-semibold text-white mb-2">{selectedVideo.title}</h3>
                        <p className="text-sm text-zinc-400">{selectedVideo.channel} • {formatTimeAgo(selectedVideo.publishedAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredVideos.map((video) => (
                  <button
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className="group rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:border-red-300 dark:hover:border-red-700 transition-colors text-left"
                  >
                    <div className="relative">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full aspect-video object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-red-600 rounded-full p-3">
                          <Youtube className="h-8 w-8 text-white" />
                        </div>
                      </div>
                      <span className={`absolute top-2 left-2 text-xs px-2 py-1 rounded ${getCategoryColor(video.category)}`}>
                        {getCategoryFlag(video.category)}
                      </span>
                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                        Click to play
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 mb-1 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">{video.title}</h3>
                      <p className="text-xs text-zinc-500">{video.channel}</p>
                      <p className="text-xs text-zinc-400 mt-1">{formatTimeAgo(video.publishedAt)}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* News Articles Section */}
          {filteredArticles.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Newspaper className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h2 className="text-lg font-semibold">Latest Articles</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredArticles.map((article, index) => (
                  <a
                    key={index}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors bg-white dark:bg-zinc-900"
                  >
                    {article.imageUrl && (
                      <div className="relative h-48 overflow-hidden">
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <span className={`absolute top-2 left-2 text-xs px-2 py-1 rounded ${getCategoryColor(article.category)}`}>
                          {getCategoryFlag(article.category)}
                        </span>
                      </div>
                    )}
                    <div className="p-4">
                      {!article.imageUrl && (
                        <span className={`inline-block text-xs px-2 py-1 rounded mb-2 ${getCategoryColor(article.category)}`}>
                          {getCategoryFlag(article.category)} {article.category.toUpperCase()}
                        </span>
                      )}
                      <h3 className="font-semibold text-sm mb-2 line-clamp-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {article.title}
                      </h3>
                      {article.description && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3 line-clamp-2">
                          {article.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span className="font-medium">{article.source}</span>
                        <span>{formatTimeAgo(article.publishedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        Read more <ExternalLink className="h-3 w-3" />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredArticles.length === 0 && filteredVideos.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <Newspaper className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No news available for this region</p>
              <p className="text-sm mt-1">Try selecting a different filter</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

