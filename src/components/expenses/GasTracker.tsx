"use client";

import { useState, useEffect } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { formatCurrency } from "@/lib/privacy";
import { Car, RefreshCw, TrendingUp, TrendingDown, Fuel } from "lucide-react";

interface DieselPriceData {
  price: number;
  currency: string;
  unit: string;
  source: string;
  stationCount?: number;
  timestamp: number;
  note?: string;
}

export function GasTracker() {
  const expenses = useFinanceStore((s) => s.expenses);
  const updateExpense = useFinanceStore((s) => s.updateExpense);
  const addExpense = useFinanceStore((s) => s.addExpense);
  const privacyMode = useFinanceStore((s) => s.privacyMode);
  
  const [dieselPrice, setDieselPrice] = useState<DieselPriceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [monthlyKm, setMonthlyKm] = useState("1600");
  const [fuelConsumption, setFuelConsumption] = useState("7.0"); // L/100km
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  // Find or create gas expense
  const gasExpense = expenses.find(
    (e) => e.name.toLowerCase().includes("gas") || e.name.toLowerCase().includes("diesel") || e.name.toLowerCase().includes("fuel")
  );

  // Calculate monthly cost
  const calculateMonthlyCost = (price: number, km: number, consumption: number) => {
    const litersNeeded = (km / 100) * consumption;
    return litersNeeded * price;
  };

  const fetchDieselPrice = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/diesel-price");
      const data: DieselPriceData = await response.json();
      setDieselPrice(data);
      setLastUpdate(new Date());
      
      // Store price history
      setPriceHistory(prev => [...prev.slice(-6), data.price]);
      
      // Update or create gas expense
      const monthlyCost = calculateMonthlyCost(
        data.price,
        parseFloat(monthlyKm),
        parseFloat(fuelConsumption)
      );
      
      if (gasExpense) {
        updateExpense(gasExpense.id, {
          amount: monthlyCost,
        });
      } else {
        // Create new gas expense under household
        addExpense({
          name: "Gas (Diesel)",
          amount: monthlyCost,
          frequency: "monthly",
          owner: "household",
        });
      }
    } catch (error) {
      console.error("Failed to fetch diesel price:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch price on mount and every hour
  useEffect(() => {
    fetchDieselPrice();
    const interval = setInterval(fetchDieselPrice, 60 * 60 * 1000); // 1 hour
    return () => clearInterval(interval);
  }, [monthlyKm, fuelConsumption]); // Re-fetch when parameters change

  if (!dieselPrice) {
    return (
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Fuel className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold">Gas Expense Tracker</h2>
        </div>
        <div className="text-center py-8 text-zinc-500">
          Loading diesel prices...
        </div>
      </div>
    );
  }

  const monthlyCost = calculateMonthlyCost(
    dieselPrice.price,
    parseFloat(monthlyKm),
    parseFloat(fuelConsumption)
  );
  
  const litersPerMonth = (parseFloat(monthlyKm) / 100) * parseFloat(fuelConsumption);
  const priceChange = priceHistory.length >= 2 
    ? ((dieselPrice.price - priceHistory[priceHistory.length - 2]) / priceHistory[priceHistory.length - 2]) * 100
    : 0;

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/10 dark:to-orange-900/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Fuel className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <h2 className="text-lg font-semibold">Gas Expense Tracker</h2>
        </div>
        <button
          onClick={() => fetchDieselPrice()}
          disabled={loading}
          className="flex items-center gap-1 text-sm px-3 py-1 rounded-md border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/20 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Current Price Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <div className="text-xs text-zinc-500 mb-1">Current Diesel Price</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {privacyMode ? "•••••" : `€${dieselPrice.price.toFixed(3)}`}
          </div>
          <div className="text-xs text-zinc-500 mt-1">per liter</div>
          {priceChange !== 0 && (
            <div className={`flex items-center gap-1 text-xs mt-2 ${
              priceChange > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
            }`}>
              {priceChange > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(priceChange).toFixed(2)}% vs last update
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <div className="text-xs text-zinc-500 mb-1">Monthly Consumption</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {privacyMode ? "•••" : litersPerMonth.toFixed(1)} L
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {monthlyKm} km @ {fuelConsumption} L/100km
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <div className="text-xs text-zinc-500 mb-1">Monthly Gas Cost</div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(monthlyCost, "EUR", privacyMode)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Automatically updated in expenses
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-white dark:bg-zinc-900 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
        <h3 className="text-sm font-semibold mb-3">Driving Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Monthly Driving Distance (km)</label>
            <input
              type="number"
              step="10"
              value={monthlyKm}
              onChange={(e) => setMonthlyKm(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
              placeholder="1600"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-500 mb-1">Fuel Consumption (L/100km)</label>
            <input
              type="number"
              step="0.1"
              value={fuelConsumption}
              onChange={(e) => setFuelConsumption(e.target.value)}
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
              placeholder="7.0"
            />
          </div>
        </div>
        <button
          onClick={() => fetchDieselPrice()}
          className="mt-3 w-full rounded-md bg-amber-500 text-white px-4 py-2 text-sm hover:bg-amber-600"
        >
          Update Gas Expense
        </button>
      </div>

      {/* Info */}
      <div className="mt-4 text-xs text-zinc-600 dark:text-zinc-400 space-y-1">
        <p><strong>Data Source:</strong> {dieselPrice.source === "tankerkoenig" ? `Tankerkoenig API (${dieselPrice.stationCount} stations)` : "Estimated German average"}</p>
        {lastUpdate && <p><strong>Last Updated:</strong> {lastUpdate.toLocaleString()}</p>}
        {dieselPrice.note && <p className="text-blue-600 dark:text-blue-400">💡 {dieselPrice.note}</p>}
        <p className="pt-2"><strong>Automatic Updates:</strong> Price refreshes every hour and updates your "Gas (Diesel)" expense under Household automatically.</p>
      </div>
    </div>
  );
}

