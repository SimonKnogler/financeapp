import { NextRequest, NextResponse } from "next/server";

/**
 * Fetches average diesel price in Germany
 * Using Tankerkoenig API as primary source, with fallback to estimated price
 */
export async function GET(request: NextRequest) {
  try {
    // For now, we'll use a fallback approach since Tankerkoenig requires API key registration
    // You can add your API key here once registered at https://creativecommons.tankerkoenig.de/
    const apiKey = process.env.TANKERKOENIG_API_KEY;
    
    if (apiKey) {
      // Example: Fetch prices around Berlin area (can be customized)
      const lat = 52.52;
      const lng = 13.40;
      const radius = 25; // km
      
      const url = `https://creativecommons.tankerkoenig.de/json/list.php?lat=${lat}&lng=${lng}&rad=${radius}&sort=price&type=diesel&apikey=${apiKey}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.ok && data.stations && data.stations.length > 0) {
          // Calculate average diesel price from nearby stations
          const prices = data.stations
            .filter((s: any) => s.diesel && s.diesel > 0)
            .map((s: any) => s.diesel);
          
          if (prices.length > 0) {
            const avgPrice = prices.reduce((sum: number, p: number) => sum + p, 0) / prices.length;
            
            return NextResponse.json({
              price: avgPrice,
              currency: "EUR",
              unit: "liter",
              source: "tankerkoenig",
              stationCount: prices.length,
              timestamp: Date.now(),
            });
          }
        }
      }
    }
    
    // Fallback: Use estimated average German diesel price
    // This can be manually updated or fetched from other sources
    // Average German diesel price as of late 2024: ~€1.65/liter
    const estimatedPrice = 1.65;
    
    return NextResponse.json({
      price: estimatedPrice,
      currency: "EUR",
      unit: "liter",
      source: "estimated",
      note: "Using estimated price. Add TANKERKOENIG_API_KEY to .env.local for live prices",
      timestamp: Date.now(),
    });
    
  } catch (error) {
    console.error("Error fetching diesel price:", error);
    
    // Return fallback price on error
    return NextResponse.json({
      price: 1.65,
      currency: "EUR",
      unit: "liter",
      source: "fallback",
      error: "Failed to fetch live price",
      timestamp: Date.now(),
    });
  }
}

