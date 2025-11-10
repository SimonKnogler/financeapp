"use client";

import { useState } from "react";
import { useFinanceStore } from "@/store/finance-store";
import type { StockHolding } from "@/types/finance";
import { X } from "lucide-react";

interface SellModalProps {
  stock: StockHolding;
  currentPrice: number;
  onClose: () => void;
}

export function SellModal({ stock, currentPrice, onClose }: SellModalProps) {
  const updateStock = useFinanceStore((s) => s.updateStock);
  const addStock = useFinanceStore((s) => s.addStock);
  const stocks = useFinanceStore((s) => s.stocks);
  
  const [sharesToSell, setSharesToSell] = useState("");
  const [useGermanTax, setUseGermanTax] = useState(true);

  // Calculate values
  const sharesToSellNum = parseFloat(sharesToSell) || 0;
  const saleProceeds = sharesToSellNum * currentPrice;
  const costBasis = (stock.costBasis || 0) * sharesToSellNum;
  const capitalGain = saleProceeds - costBasis;
  
  // German capital gains tax (Abgeltungssteuer)
  // 25% tax + 5.5% solidarity surcharge on tax = 26.375% total
  // Plus potential church tax (8-9%, we'll use 0% as default)
  const taxRate = useGermanTax ? 0.26375 : 0; // 25% + 5.5% Soli
  const taxAmount = capitalGain > 0 ? capitalGain * taxRate : 0;
  const netProceeds = saleProceeds - taxAmount;

  function handleSell(e: React.FormEvent) {
    e.preventDefault();
    
    if (sharesToSellNum <= 0 || sharesToSellNum > stock.shares) {
      alert("Invalid number of shares");
      return;
    }

    // 1. Reduce stock position or remove if selling all
    const remainingShares = stock.shares - sharesToSellNum;
    
    if (remainingShares > 0) {
      updateStock(stock.id, { shares: remainingShares });
    } else {
      useFinanceStore.getState().removeStock(stock.id);
    }

    // 2. Add net proceeds to cash (find or create cash account for same owner)
    const cashAccount = stocks.find(
      (s) => s.type === "cash" && s.symbol.toLowerCase().includes("trading") && s.owner === stock.owner
    );

    if (cashAccount) {
      // Add to existing cash account
      updateStock(cashAccount.id, {
        shares: cashAccount.shares + netProceeds,
      });
    } else {
      // Create new cash account for trading proceeds
      addStock({
        symbol: "Trading Cash",
        shares: netProceeds,
        type: "cash",
        owner: stock.owner, // Use same owner as the sold asset
      });
    }

    console.log(`Sold ${sharesToSellNum} ${stock.symbol}:`);
    console.log(`- Sale proceeds: €${saleProceeds.toFixed(2)}`);
    console.log(`- Capital gain: €${capitalGain.toFixed(2)}`);
    console.log(`- Tax paid: €${taxAmount.toFixed(2)}`);
    console.log(`- Net cash received: €${netProceeds.toFixed(2)}`);
    
    alert(
      `Sold ${sharesToSellNum} shares of ${stock.symbol}\n\n` +
      `Sale proceeds: €${saleProceeds.toFixed(2)}\n` +
      `Capital gain: €${capitalGain.toFixed(2)}\n` +
      `Tax paid (26.375%): €${taxAmount.toFixed(2)}\n` +
      `Net cash received: €${netProceeds.toFixed(2)}`
    );
    
    onClose();
  }

  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 className="text-lg font-semibold">
            Sell {stock.symbol}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSell} className="p-4 space-y-4">
          <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg p-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Holdings:</span>
              <span className="font-semibold">{stock.shares} shares</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Current Price:</span>
              <span className="font-semibold">{formatter.format(currentPrice)}</span>
            </div>
            {stock.costBasis && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Cost Basis:</span>
                <span className="font-semibold">{formatter.format(stock.costBasis)}/share</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Shares to Sell
            </label>
            <input
              type="number"
              step="0.00000001"
              required
              value={sharesToSell}
              onChange={(e) => setSharesToSell(e.target.value)}
              max={stock.shares}
              min="0"
              className="w-full rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2"
              placeholder={`Max: ${stock.shares}`}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="germanTax"
              checked={useGermanTax}
              onChange={(e) => setUseGermanTax(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="germanTax" className="text-sm">
              Apply German capital gains tax (26.375%)
            </label>
          </div>

          {sharesToSellNum > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-2 text-sm">
              <div className="font-medium text-blue-900 dark:text-blue-100">
                Transaction Summary
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-600 dark:text-zinc-400">Sale Proceeds:</span>
                  <span className="font-semibold">{formatter.format(saleProceeds)}</span>
                </div>
                {stock.costBasis && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">Cost Basis:</span>
                      <span>{formatter.format(costBasis)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-600 dark:text-zinc-400">Capital Gain:</span>
                      <span className={capitalGain >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                        {formatter.format(capitalGain)}
                      </span>
                    </div>
                  </>
                )}
                {useGermanTax && capitalGain > 0 && (
                  <div className="flex justify-between text-red-600 dark:text-red-400">
                    <span>Tax (26.375%):</span>
                    <span>-{formatter.format(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <span className="font-semibold">Net Cash Received:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    {formatter.format(netProceeds)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 px-4 py-2 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sharesToSellNum <= 0 || sharesToSellNum > stock.shares}
              className="flex-1 rounded-md bg-red-600 hover:bg-red-700 text-white px-4 py-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Sell {sharesToSellNum > 0 && `${sharesToSellNum} shares`}
            </button>
          </div>
        </form>

        <div className="px-4 pb-4">
          <div className="text-xs text-zinc-500 space-y-1">
            <p><strong>German Tax Info:</strong></p>
            <p>• Abgeltungssteuer: 25%</p>
            <p>• Solidaritätszuschlag: 5.5% of tax (1.375% total)</p>
            <p>• Total: 26.375% on capital gains</p>
            <p className="pt-1">Note: Church tax (8-9%) not included. Losses can offset gains within same year.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

