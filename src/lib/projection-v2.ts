import { StockHolding, IncomeItem, ExpenseItem, FinanceState } from "@/types/finance";
import { PortfolioValue, PortfolioBreakdown } from "./portfolio-calculator";
import { getDefaultReturn } from "./historical-analysis";
import { addMonths, startOfMonth } from "date-fns";

export interface ProjectionPoint {
  month: number;
  date: string;
  netWorth: number;
  portfolioValue: number;
  cashValue: number;
  investmentValue: number;
  sparplanContributions: number; // cumulative
  incomeExpenseDelta: number; // monthly net cash flow
  breakdown: { symbol: string; value: number }[];
}

export interface ProjectionSummary {
  startingValue: number;
  endingValue: number;
  totalGain: number;
  totalContributions: number;
  averageAnnualReturn: number;
}

export interface ProjectionResult {
  points: ProjectionPoint[];
  summary: ProjectionSummary;
}

export interface AssetReturn {
  symbol: string;
  expectedReturn: number; // annual return as decimal
  volatility?: number;
}

export type ScenarioType = "conservative" | "realistic" | "optimistic";

/**
 * Generate advanced financial projection with real portfolio values and historical returns
 */
export async function generateProjectionV2(
  currentPortfolio: PortfolioValue,
  stocks: StockHolding[],
  incomes: IncomeItem[],
  expenses: ExpenseItem[],
  assetReturns: Map<string, AssetReturn>,
  projectionYears: number,
  scenario: ScenarioType = "realistic"
): Promise<ProjectionResult> {
  
  const months = projectionYears * 12;
  const points: ProjectionPoint[] = [];
  const startDate = startOfMonth(new Date());
  
  // Initialize holdings with current values
  let holdingsMap = new Map<string, { shares: number; type: string; value: number; return: number }>();
  
  console.log(`📈 generateProjectionV2: Initializing with ${currentPortfolio.breakdown.length} holdings, scenario: ${scenario}`);
  
  currentPortfolio.breakdown.forEach(item => {
    const assetReturn = assetReturns.get(item.symbol);
    let expectedReturn = assetReturn?.expectedReturn || getDefaultReturn(item.type as any, item.symbol);
    
    console.log(`  ${item.symbol}: Base return ${(expectedReturn * 100).toFixed(1)}% (from ${assetReturn ? 'assetReturns Map' : 'default'})`);
    
    // Adjust return based on scenario
    if (scenario === "conservative") {
      expectedReturn *= 0.6; // 60% of base
    } else if (scenario === "optimistic") {
      expectedReturn *= 1.4; // 140% of base
    }
    
    console.log(`  ${item.symbol}: Adjusted return ${(expectedReturn * 100).toFixed(1)}% for ${scenario} scenario`);
    
    holdingsMap.set(item.symbol, {
      shares: item.shares,
      type: item.type,
      value: item.value,
      return: expectedReturn,
    });
  });
  
  let cashValue = currentPortfolio.cash;
  let totalSparplanContributions = 0;
  
  // Project month by month
  for (let month = 0; month < months; month++) {
    const currentDate = addMonths(startDate, month);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // 1. Calculate investment growth for this month
    const monthlyReturns = new Map<string, number>();
    holdingsMap.forEach((holding, symbol) => {
      if (holding.type !== "cash") {
        const monthlyReturn = holding.return / 12; // Simple monthly approximation
        const growth = holding.value * monthlyReturn;
        holding.value += growth;
        monthlyReturns.set(symbol, monthlyReturn);
      }
    });
    
    // 2. Add Sparplan contributions
    const activeSparplans = stocks.filter(
      s => s.type === "etf" && s.sparplan?.active && s.sparplan.monthlyAmount > 0
    );
    
    activeSparplans.forEach(sp => {
      if (!sp.sparplan) return;
      
      const contribution = sp.sparplan.monthlyAmount;
      totalSparplanContributions += contribution;
      
      // Add contribution to the respective holding
      const holding = holdingsMap.get(sp.symbol);
      if (holding) {
        // Calculate how many shares we can buy (simplified)
        const avgPrice = holding.value / holding.shares;
        const newShares = contribution / avgPrice;
        holding.shares += newShares;
        holding.value += contribution;
      } else {
        // Create new holding if not exists
        const expectedReturn = assetReturns.get(sp.symbol)?.expectedReturn || getDefaultReturn("etf", sp.symbol);
        holdingsMap.set(sp.symbol, {
          shares: 1, // Simplified
          type: "etf",
          value: contribution,
          return: expectedReturn,
        });
      }
      
      // NOTE: Don't deduct from cash since we're not modeling income
      // Sparpläne are treated as new money coming into the portfolio
    });
    
    // 3. Process income/expenses for this month
    // NOTE: Income and expenses are NOT included in the projection
    // Only portfolio growth and Sparplan contributions are considered
    const netCashFlow = 0; // No cash flow from income/expenses
    
    // 4. Calculate total portfolio value
    let investmentValue = 0;
    const breakdown: { symbol: string; value: number }[] = [];
    
    holdingsMap.forEach((holding, symbol) => {
      if (holding.type === "cash") {
        // Cash holdings don't grow
        breakdown.push({ symbol, value: holding.value });
      } else {
        investmentValue += holding.value;
        breakdown.push({ symbol, value: holding.value });
      }
    });
    
    // Add standalone cash
    breakdown.push({ symbol: "Cash", value: cashValue });
    
    const totalValue = investmentValue + cashValue;
    
    // 5. Record snapshot
    points.push({
      month,
      date: dateStr,
      netWorth: totalValue,
      portfolioValue: totalValue,
      cashValue,
      investmentValue,
      sparplanContributions: totalSparplanContributions,
      incomeExpenseDelta: netCashFlow,
      breakdown,
    });
  }
  
  // Calculate summary
  const startingValue = points[0]?.netWorth || 0;
  const endingValue = points[points.length - 1]?.netWorth || 0;
  const totalGain = endingValue - startingValue - totalSparplanContributions;
  const totalContributions = totalSparplanContributions; // Only Sparpläne, no income/expenses
  
  const averageAnnualReturn = startingValue > 0
    ? (Math.pow(endingValue / startingValue, 1 / projectionYears) - 1)
    : 0;
  
  return {
    points,
    summary: {
      startingValue,
      endingValue,
      totalGain,
      totalContributions,
      averageAnnualReturn,
    },
  };
}

/**
 * Calculate when a specific milestone will be reached
 */
export function calculateMilestoneReach(
  projection: ProjectionResult,
  targetAmount: number
): { months: number; date: string } | null {
  const point = projection.points.find(p => p.netWorth >= targetAmount);
  
  if (!point) {
    return null;
  }
  
  return {
    months: point.month,
    date: point.date,
  };
}

/**
 * Calculate impact of changing Sparplan contribution
 */
export function calculateContributionImpact(
  baseProjection: ProjectionResult,
  increasedProjection: ProjectionResult,
  milestone: number
): {
  timeSaved: number; // months
  valueDifference: number; // at end
} {
  const baseMilestone = calculateMilestoneReach(baseProjection, milestone);
  const increasedMilestone = calculateMilestoneReach(increasedProjection, milestone);
  
  const timeSaved = baseMilestone && increasedMilestone
    ? baseMilestone.months - increasedMilestone.months
    : 0;
  
  const valueDifference = 
    increasedProjection.summary.endingValue - baseProjection.summary.endingValue;
  
  return {
    timeSaved,
    valueDifference,
  };
}

