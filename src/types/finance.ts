export type Frequency = "monthly" | "yearly" | "once";

export type AccountType = "cash" | "investment" | "loan" | "property";

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  // Investment-specific
  expectedReturnAnnual?: number; // e.g., 0.05 = 5%
  volatilityAnnual?: number; // for Monte Carlo (optional)
  contributionMonthly?: number;
  // Loan-specific
  interestRateAnnual?: number; // e.g., 0.04 = 4%
  minPaymentMonthly?: number;
}

export interface GoalAllocation {
  goalId: string;
  percentage: number; // 0-100, percentage of income allocated to this goal
}

export interface IncomeItem {
  id: string;
  name: string;
  amount: number; // base nominal amount in today's currency
  frequency: Frequency;
  startDateISO?: string; // inclusive (YYYY-MM-DD)
  endDateISO?: string; // inclusive
  growthAnnual?: number; // e.g., 0.03 = 3% annual growth
  goalAllocations?: GoalAllocation[]; // optional: allocate portions to specific goals
  owner: PortfolioOwner; // who owns this income
}

export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  startDateISO?: string;
  endDateISO?: string;
  growthAnnual?: number; // e.g., 0.02 = inflation
  owner: PortfolioOwner; // who owns this expense
}

export type AssetType = "stock" | "crypto" | "etf" | "cash";

export type PortfolioOwner = "simon" | "carolina" | "household";

export interface StockHolding {
  id: string;
  symbol: string; // e.g., "AAPL", "GOOGL", "BTC", "ETH", or account name for cash
  shares: number; // for cash, this is the amount in EUR
  costBasis?: number; // optional: original purchase price per share
  purchaseDateISO?: string; // optional: when purchased
  type: AssetType; // stock, crypto, etf, or cash
  sparplan?: SparplanConfig; // optional: savings plan configuration
  owner: PortfolioOwner; // who owns this holding
  goalId?: string; // optional: link to a financial goal
}

export interface SparplanConfig {
  active: boolean;
  monthlyAmount: number; // EUR amount to invest monthly
  executionDay: number; // day of month (1-28)
  startDateISO: string; // when sparplan started
  endDateISO?: string; // optional end date
}

export interface StockPrice {
  symbol: string;
  price: number;
  currency: string;
  timestamp: number;
}

export interface StockNews {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string | null;
  thumbnail: string | null;
}

export interface Assumptions {
  startDateISO: string; // simulation start date (YYYY-MM-DD)
  projectionYears: number; // number of years to project
  inflationAnnual: number; // default inflation assumption
  taxRateEffective: number; // simple effective tax rate on gross income
  currency: string; // e.g., "USD", "EUR", "GBP"
  expectedPortfolioReturn?: number; // expected annual portfolio return (e.g., 0.07 = 7%)
  portfolioVolatility?: number; // portfolio volatility for Monte Carlo (e.g., 0.15 = 15%)
  monthlySavingsGoal?: number; // monthly savings target
}

export interface PortfolioSnapshot {
  dateISO: string; // YYYY-MM-DD
  timestamp: number;
  totalValue: number;
  cashValue: number;
  investmentValue: number;
  owner: "total" | "simon" | "carolina"; // whose portfolio this snapshot represents
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDateISO: string;
  category: "retirement" | "house" | "emergency" | "education" | "other";
  priority: "high" | "medium" | "low";
  owner: PortfolioOwner | "joint";
}

export interface StoredDocument {
  id: string;
  name: string;
  size: number;
  storagePath: string;
  uploadedAt: string; // ISO timestamp
  uploadedById: string;
  uploadedByEmail?: string | null;
  description?: string;
  tags?: string[];
}

export interface MonteCarloScenario {
  dateISO: string;
  p10: number;  // 10th percentile
  p50: number;  // median
  p90: number;  // 90th percentile
}

export interface MonteCarloResult {
  scenarios: MonteCarloScenario[];
  successRate: number; // probability of reaching goals
}

export interface FinanceState {
  accounts: Account[];
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  stocks: StockHolding[];
  portfolioHistory: PortfolioSnapshot[];
  goals: FinancialGoal[];
  assumptions: Assumptions;
  documents: StoredDocument[];
}

export interface ProjectionPoint {
  dateISO: string; // first day of month
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  cashFlow: number; // income - expenses - taxes - debt service - net contributions
  income: number;
  expenses: number;
  taxes: number;
  stockPortfolioValue?: number; // live stock portfolio value (dynamically calculated)
}

export interface ProjectionResult {
  points: ProjectionPoint[];
  byAccountBalances: Record<string, number[]>; // accountId -> monthly balances
  monthLabels: string[]; // YYYY-MM
}


