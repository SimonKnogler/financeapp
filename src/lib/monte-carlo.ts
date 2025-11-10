import { FinanceState, MonteCarloResult, MonteCarloScenario } from "@/types/finance";
import { generateProjection } from "./projection";

/**
 * Generate a random number from a normal distribution using Box-Muller transform
 */
function normalRandom(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

/**
 * Calculate percentile from sorted array
 */
function percentile(sortedArray: number[], p: number): number {
  if (sortedArray.length === 0) return 0;
  const index = (sortedArray.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index % 1;
  
  if (lower === upper) {
    return sortedArray[lower];
  }
  
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}

/**
 * Run Monte Carlo simulation for financial projections
 * 
 * @param state - Current financial state
 * @param stockPortfolioValue - Current portfolio value
 * @param iterations - Number of simulations to run (default: 1000)
 * @returns Monte Carlo results with percentiles
 */
export function runMonteCarloSimulation(
  state: FinanceState,
  stockPortfolioValue: number = 0,
  iterations: number = 1000
): MonteCarloResult {
  console.log(`Running Monte Carlo simulation with ${iterations} iterations...`);
  
  const allScenarios: number[][] = []; // [iteration][monthIndex] = netWorth
  const numMonths = Math.max(1, Math.round(state.assumptions.projectionYears * 12));
  
  // Initialize array for all scenarios
  for (let i = 0; i < iterations; i++) {
    allScenarios.push(new Array(numMonths).fill(0));
  }
  
  // Run simulations
  for (let iter = 0; iter < iterations; iter++) {
    // Clone state to avoid mutations
    const scenarioState: FinanceState = JSON.parse(JSON.stringify(state));
    
    // Add randomness to investment returns
    for (const account of scenarioState.accounts) {
      if (account.type === "investment" || account.type === "property") {
        const mean = account.expectedReturnAnnual || 0.07;
        const volatility = account.volatilityAnnual || 0.15;
        // Generate random return for this scenario
        account.expectedReturnAnnual = normalRandom(mean, volatility);
      }
    }
    
    // Add randomness to income (±1% variation)
    for (const income of scenarioState.incomes) {
      const growthVariation = normalRandom(0, 0.01);
      income.growthAnnual = (income.growthAnnual || 0.03) + growthVariation;
    }
    
    // Add randomness to expenses (±2% variation)
    for (const expense of scenarioState.expenses) {
      const growthVariation = normalRandom(0, 0.02);
      expense.growthAnnual = (expense.growthAnnual || 0.02) + growthVariation;
    }
    
    // Add randomness to stock portfolio returns (if portfolio exists)
    let scenarioPortfolioValue = stockPortfolioValue;
    if (stockPortfolioValue > 0) {
      // Assume portfolio follows market with some volatility
      const portfolioReturn = normalRandom(0.07, 0.15); // 7% mean, 15% volatility
      const monthlyReturn = Math.pow(1 + portfolioReturn, 1 / 12) - 1;
      scenarioPortfolioValue = stockPortfolioValue * Math.pow(1 + monthlyReturn, 1);
    }
    
    // Run projection for this scenario
    const projection = generateProjection(scenarioState, scenarioPortfolioValue);
    
    // Store net worth for each month
    for (let monthIdx = 0; monthIdx < numMonths && monthIdx < projection.points.length; monthIdx++) {
      allScenarios[iter][monthIdx] = projection.points[monthIdx].netWorth;
    }
    
    // Log progress every 100 iterations
    if ((iter + 1) % 100 === 0) {
      console.log(`Completed ${iter + 1}/${iterations} iterations`);
    }
  }
  
  // Calculate percentiles for each month
  const scenarios: MonteCarloScenario[] = [];
  
  for (let monthIdx = 0; monthIdx < numMonths; monthIdx++) {
    // Extract all net worth values for this month across all scenarios
    const netWorths = allScenarios.map(scenario => scenario[monthIdx]).sort((a, b) => a - b);
    
    // Calculate percentiles
    const p10 = percentile(netWorths, 0.10);
    const p50 = percentile(netWorths, 0.50);
    const p90 = percentile(netWorths, 0.90);
    
    // Get date from original projection
    const deterministicProjection = generateProjection(state, stockPortfolioValue);
    const dateISO = deterministicProjection.points[monthIdx]?.dateISO || "";
    
    scenarios.push({
      dateISO,
      p10,
      p50,
      p90,
    });
  }
  
  // Calculate success rate for goals (if any)
  let successRate = 1.0; // Default to 100% if no goals
  
  if (state.goals && state.goals.length > 0) {
    // For each goal, calculate how many scenarios reach the target
    const goalSuccessRates: number[] = [];
    
    for (const goal of state.goals) {
      // Find the month index for the goal's target date
      const goalDate = new Date(goal.targetDateISO);
      const startDate = new Date(state.assumptions.startDateISO);
      const monthsDiff = Math.round(
        (goalDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );
      
      if (monthsDiff >= 0 && monthsDiff < numMonths) {
        // Count scenarios that reach the goal
        let successCount = 0;
        for (const scenario of allScenarios) {
          if (scenario[monthsDiff] >= goal.targetAmount) {
            successCount++;
          }
        }
        goalSuccessRates.push(successCount / iterations);
      }
    }
    
    // Overall success rate is the minimum across all goals
    if (goalSuccessRates.length > 0) {
      successRate = Math.min(...goalSuccessRates);
    }
  }
  
  console.log(`Monte Carlo simulation complete. Success rate: ${(successRate * 100).toFixed(1)}%`);
  
  return {
    scenarios,
    successRate,
  };
}

