import { NextRequest, NextResponse } from "next/server";

/**
 * Fetch cryptocurrency price using Binance API (ultra-fast, no API key needed)
 * Falls back to CoinCap if Binance doesn't have the pair
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json({ error: "Symbol required" }, { status: 400 });
  }

  const symbolUpper = symbol.toUpperCase();

  console.log(`[crypto-price] Fetching price for ${symbol}`);
  
  try {
    // Try Binance first - much faster and more reliable
    // Get price in USDT first (most liquid pair)
    const binancePair = `${symbolUpper}USDT`;
    const binanceUrl = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binancePair}`;
    
    console.log(`[crypto-price] Trying Binance: ${binanceUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

    try {
      const binanceResponse = await fetch(binanceUrl, {
        headers: { "Accept": "application/json" },
        signal: controller.signal,
        next: { revalidate: 30 }, // Cache for 30 seconds
      });
      clearTimeout(timeoutId);

      console.log(`[crypto-price] Binance response status: ${binanceResponse.status}`);

      if (binanceResponse.ok) {
        const binanceData = await binanceResponse.json();
        
        if (binanceData.lastPrice) {
          const priceUsdt = parseFloat(binanceData.lastPrice);
          const changePercent24Hr = parseFloat(binanceData.priceChangePercent || "0");

          // Get EUR/USDT rate from Binance (also fast)
          const eurUsdtUrl = "https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT";
          let eurRate = 0.92; // Fallback
          
          try {
            const eurResponse = await fetch(eurUsdtUrl, {
              next: { revalidate: 300 }, // Cache for 5 minutes
            });
            if (eurResponse.ok) {
              const eurData = await eurResponse.json();
              eurRate = 1 / parseFloat(eurData.price); // Convert EUR/USDT to USDT/EUR
            }
          } catch (e) {
            // Use fallback
          }

          const eurPrice = priceUsdt * eurRate;

          console.log(`[crypto-price] Success via Binance: ${eurPrice} EUR`);

          return NextResponse.json({
            symbol: symbolUpper,
            price: eurPrice,
            currency: "EUR",
            timestamp: Date.now(),
            change24h: changePercent24Hr,
            source: "binance",
          });
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.warn(`[crypto-price] Binance timeout for ${symbol}`);
      } else {
        console.warn(`[crypto-price] Binance failed for ${symbol}:`, error);
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.warn(`[crypto-price] Error with Binance for ${symbol}:`, error);
  }

  // Fallback to CoinCap for less common cryptos
  console.log(`[crypto-price] Trying CoinCap fallback for ${symbol}`);
  
  try {
    const coinCapIds: Record<string, string> = {
      BTC: "bitcoin",
      ETH: "ethereum",
      USDT: "tether",
      BNB: "binance-coin",
      USDC: "usd-coin",
      XRP: "xrp",
      ADA: "cardano",
      DOGE: "dogecoin",
      SOL: "solana",
      DOT: "polkadot",
      MATIC: "polygon",
      LTC: "litecoin",
      AVAX: "avalanche",
      LINK: "chainlink",
      UNI: "uniswap",
      ATOM: "cosmos",
      XLM: "stellar",
      ALGO: "algorand",
      VET: "vechain",
      ICP: "internet-computer",
      ETC: "ethereum-classic",
    };

    const coinCapId = coinCapIds[symbolUpper] || symbol.toLowerCase();
    const coinCapUrl = `https://api.coincap.io/v2/assets/${coinCapId}`;
    
    console.log(`[crypto-price] CoinCap URL: ${coinCapUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const coinCapResponse = await fetch(coinCapUrl, {
        headers: { "Accept": "application/json" },
        signal: controller.signal,
        next: { revalidate: 30 },
      });
      clearTimeout(timeoutId);

      console.log(`[crypto-price] CoinCap response status: ${coinCapResponse.status}`);

      if (coinCapResponse.ok) {
        const coinCapData = await coinCapResponse.json();
        
        if (coinCapData.data?.priceUsd) {
          const priceUsd = parseFloat(coinCapData.data.priceUsd);
          const changePercent24Hr = parseFloat(coinCapData.data.changePercent24Hr || "0");
          const eurPrice = priceUsd * 0.92; // Simple conversion

          console.log(`[crypto-price] Success via CoinCap: ${eurPrice} EUR`);

          return NextResponse.json({
            symbol: symbolUpper,
            price: eurPrice,
            currency: "EUR",
            timestamp: Date.now(),
            change24h: changePercent24Hr,
            source: "coincap",
          });
        } else {
          console.warn(`[crypto-price] CoinCap returned no price data for ${symbol}`);
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(`[crypto-price] CoinCap error for ${symbol}:`, error);
      throw error;
    }

    console.warn(`[crypto-price] Crypto not found: ${symbol}`);
    return NextResponse.json({ error: "Crypto not found" }, { status: 404 });
    
  } catch (error: any) {
    console.error(`Error fetching crypto price for ${symbol}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch crypto price", details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

