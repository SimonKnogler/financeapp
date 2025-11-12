/**
 * Revolut Integration Module
 * 
 * Supports:
 * 1. Manual CSV import from Revolut exports
 * 2. Future: Revolut Business API integration (when available)
 * 3. Transaction parsing and portfolio position sync
 */

import type { StockHolding, PortfolioOwner } from "@/types/finance";

export interface RevolutTransaction {
  date: string; // ISO date
  type: "BUY" | "SELL" | "DIVIDEND" | "FEE";
  ticker: string;
  shares: number;
  price: number;
  totalAmount: number;
  currency: string;
  description?: string;
}

export interface RevolutPortfolioSnapshot {
  positions: {
    ticker: string;
    shares: number;
    averageCost: number;
    currentValue: number;
  }[];
  cash: number;
  currency: string;
  timestamp: string;
}

/**
 * Parse Revolut CSV export to extract transactions
 * 
 * Expected CSV format (from Revolut account statement):
 * Date,Type,Product,Ticker,Shares,Price per share,Total Amount,Currency
 * 2024-11-01,BUY,Stock,AAPL,10,150.00,1500.00,USD
 */
export function parseRevolutCSV(csvContent: string): RevolutTransaction[] {
  const lines = csvContent.trim().split("\n");
  
  if (lines.length < 2) {
    throw new Error("Invalid CSV: No data rows found");
  }

  const header = lines[0].toLowerCase();
  
  // Validate header contains required columns
  const requiredColumns = ["date", "type", "ticker", "shares", "price", "total", "currency"];
  const hasRequiredColumns = requiredColumns.every(col => 
    header.includes(col.toLowerCase())
  );
  
  if (!hasRequiredColumns) {
    throw new Error("Invalid Revolut CSV format. Expected columns: Date, Type, Ticker, Shares, Price, Total Amount, Currency");
  }

  const transactions: RevolutTransaction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(",").map(col => col.trim());
    
    if (columns.length < 7) continue;
    
    const [date, type, product, ticker, shares, price, totalAmount, currency, ...rest] = columns;
    
    const transactionType = type.toUpperCase() as "BUY" | "SELL" | "DIVIDEND" | "FEE";
    
    if (!["BUY", "SELL", "DIVIDEND", "FEE"].includes(transactionType)) {
      console.warn(`Skipping unknown transaction type: ${type}`);
      continue;
    }
    
    transactions.push({
      date: date,
      type: transactionType,
      ticker: ticker.toUpperCase(),
      shares: parseFloat(shares) || 0,
      price: parseFloat(price) || 0,
      totalAmount: parseFloat(totalAmount) || 0,
      currency: currency.toUpperCase(),
      description: rest.join(","),
    });
  }
  
  return transactions;
}

/**
 * Convert Revolut transactions to portfolio positions
 * Groups by ticker and calculates average cost basis
 */
export function transactionsToPositions(
  transactions: RevolutTransaction[],
  owner: PortfolioOwner = "simon"
): StockHolding[] {
  const positionMap = new Map<string, {
    shares: number;
    totalCost: number;
    purchaseDate?: string;
  }>();
  
  // Process transactions chronologically
  const sorted = transactions.slice().sort((a, b) => a.date.localeCompare(b.date));
  
  for (const tx of sorted) {
    if (tx.type !== "BUY" && tx.type !== "SELL") continue;
    
    const position = positionMap.get(tx.ticker) || {
      shares: 0,
      totalCost: 0,
    };
    
    if (tx.type === "BUY") {
      position.shares += tx.shares;
      position.totalCost += Math.abs(tx.totalAmount);
      if (!position.purchaseDate) {
        position.purchaseDate = tx.date;
      }
    } else if (tx.type === "SELL") {
      const avgCost = position.shares > 0 ? position.totalCost / position.shares : 0;
      const soldValue = tx.shares * avgCost;
      position.shares -= tx.shares;
      position.totalCost -= soldValue;
    }
    
    positionMap.set(tx.ticker, position);
  }
  
  // Convert to StockHolding array
  const holdings: StockHolding[] = [];
  
  positionMap.forEach((position, ticker) => {
    if (position.shares <= 0) return; // Skip sold-out positions
    
    const avgCost = position.shares > 0 ? position.totalCost / position.shares : undefined;
    
    holdings.push({
      id: `revolut_${ticker}_${Date.now()}`,
      symbol: ticker,
      shares: position.shares,
      costBasis: avgCost,
      purchaseDateISO: position.purchaseDate,
      type: "stock", // Revolut mainly stocks/ETFs
      owner,
    });
  });
  
  return holdings;
}

/**
 * Future: Revolut Business API integration
 * 
 * Revolut Business API requires:
 * - Business account on 'Grow' plan or higher
 * - OAuth2 authentication
 * - API credentials from Revolut Business dashboard
 * 
 * If you upgrade to Business API access, implement here:
 * - fetchRevolutPositions()
 * - fetchRevolutTransactions()
 * - syncRevolutPortfolio()
 */
export async function fetchRevolutBusinessPortfolio(apiKey: string): Promise<RevolutPortfolioSnapshot | null> {
  // Placeholder for future Business API integration
  console.warn("Revolut Business API integration not yet implemented");
  console.warn("For personal accounts, use CSV import instead");
  return null;
}

/**
 * Validate Revolut CSV format before parsing
 */
export function validateRevolutCSV(csvContent: string): { valid: boolean; error?: string } {
  if (!csvContent || csvContent.trim().length === 0) {
    return { valid: false, error: "CSV file is empty" };
  }
  
  const lines = csvContent.trim().split("\n");
  
  if (lines.length < 2) {
    return { valid: false, error: "CSV must contain at least a header row and one data row" };
  }
  
  const header = lines[0].toLowerCase();
  const requiredColumns = ["date", "type", "ticker", "shares", "price"];
  const missingColumns = requiredColumns.filter(col => !header.includes(col));
  
  if (missingColumns.length > 0) {
    return { 
      valid: false, 
      error: `Missing required columns: ${missingColumns.join(", ")}` 
    };
  }
  
  return { valid: true };
}

