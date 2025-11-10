import { addMonths, differenceInCalendarMonths, isAfter, isBefore, startOfMonth } from "date-fns";
import { Account, FinanceState, Frequency, ProjectionPoint, ProjectionResult } from "@/types/finance";

function toMonthLabel(date: Date): string {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}`;
}

function monthRateFromAnnual(annualRate: number): number {
  // Convert nominal annual rate to effective monthly
  return Math.pow(1 + annualRate, 1 / 12) - 1;
}

function isActiveInMonth(date: Date, startISO?: string, endISO?: string): boolean {
  const monthStart = startOfMonth(date);
  if (startISO) {
    const s = startOfMonth(new Date(startISO));
    if (isBefore(monthStart, s)) return false;
  }
  if (endISO) {
    const e = startOfMonth(new Date(endISO));
    if (isAfter(monthStart, e)) return false;
  }
  return true;
}

function amountForFrequency(amount: number, frequency: Frequency): number {
  if (frequency === "monthly") return amount;
  if (frequency === "yearly") return amount / 12;
  // "once" -> model as one-time inflow in the first active month; for monthly rollups, we include it only once
  return amount; // caller will zero this out except for first active month
}

export function generateProjection(state: FinanceState, stockPortfolioValue?: number): ProjectionResult {
  const startDate = startOfMonth(new Date(state.assumptions.startDateISO));
  const months = Math.max(1, Math.round(state.assumptions.projectionYears * 12));
  const inflationMonthly = monthRateFromAnnual(state.assumptions.inflationAnnual);
  const taxRate = Math.max(0, Math.min(1, state.assumptions.taxRateEffective));

  // Clone balances so we don't mutate store
  const accountBalances: Record<string, number> = {};
  state.accounts.forEach((a) => {
    accountBalances[a.id] = a.balance ?? 0;
  });

  const byAccountBalances: Record<string, number[]> = {};
  state.accounts.forEach((a) => {
    byAccountBalances[a.id] = [];
  });

  const points: ProjectionPoint[] = [];
  const monthLabels: string[] = [];

  // Track "once" items so we only include them in their first active month
  const onceIncomeIncluded: Record<string, boolean> = {};
  const onceExpenseIncluded: Record<string, boolean> = {};

  for (let i = 0; i < months; i++) {
    const current = addMonths(startDate, i);
    const currentLabel = toMonthLabel(current);
    monthLabels.push(currentLabel);

    // 1) Incomes
    let grossIncome = 0;
    for (const inc of state.incomes) {
      if (!isActiveInMonth(current, inc.startDateISO, inc.endDateISO)) continue;

      let base = amountForFrequency(inc.amount, inc.frequency);
      // Growth
      const growth = inc.growthAnnual ?? 0;
      const monthsSinceStart = inc.startDateISO
        ? differenceInCalendarMonths(startOfMonth(current), startOfMonth(new Date(inc.startDateISO)))
        : i;
      const monthlyGrowth = monthRateFromAnnual(growth);
      base = base * Math.pow(1 + monthlyGrowth, Math.max(0, monthsSinceStart));

      if (inc.frequency === "once") {
        if (onceIncomeIncluded[inc.id]) {
          base = 0;
        } else {
          onceIncomeIncluded[inc.id] = true;
        }
      }
      grossIncome += base;
    }

    // 2) Expenses
    let expenses = 0;
    for (const exp of state.expenses) {
      if (!isActiveInMonth(current, exp.startDateISO, exp.endDateISO)) continue;

      let base = amountForFrequency(exp.amount, exp.frequency);
      const growth = exp.growthAnnual ?? state.assumptions.inflationAnnual;
      const monthsSinceStart = exp.startDateISO
        ? differenceInCalendarMonths(startOfMonth(current), startOfMonth(new Date(exp.startDateISO)))
        : i;
      const monthlyGrowth = monthRateFromAnnual(growth);
      base = base * Math.pow(1 + monthlyGrowth, Math.max(0, monthsSinceStart));

      if (exp.frequency === "once") {
        if (onceExpenseIncluded[exp.id]) {
          base = 0;
        } else {
          onceExpenseIncluded[exp.id] = true;
        }
      }
      expenses += base;
    }

    // 3) Taxes (simple effective rate)
    const taxes = grossIncome * taxRate;
    const afterTaxIncome = grossIncome - taxes;

    // 4) Account flows
    // Treat cash accounts as receivers of net cash. Contributions move from cash to target account.
    // Loans accrue interest and are paid down by minPaymentMonthly if provided.
    // Investment and property accounts grow by expectedReturnAnnual (monthly).

    // Ensure at least one cash account exists; if not, we simulate a virtual cash bucket
    const cashAccount = state.accounts.find((a) => a.type === "cash");
    const cashAccountId = cashAccount?.id ?? "__virtual_cash__";
    if (cashAccount && !(cashAccount.id in accountBalances)) {
      accountBalances[cashAccount.id] = cashAccount.balance ?? 0;
    }
    if (!cashAccount && !(cashAccountId in accountBalances)) {
      accountBalances[cashAccountId] = 0;
      byAccountBalances[cashAccountId] = [];
    }

    let netCashDelta = afterTaxIncome - expenses;

    // Contributions (move from cash to target)
    for (const account of state.accounts) {
      const contrib = account.contributionMonthly ?? 0;
      if (contrib > 0) {
        accountBalances[account.id] = (accountBalances[account.id] ?? 0) + contrib;
        netCashDelta -= contrib;
      }
    }

    // Loans: accrue interest and pay minimum payment if configured
    for (const account of state.accounts) {
      if (account.type !== "loan") continue;
      const balance = accountBalances[account.id] ?? 0;
      const rateMonthly = monthRateFromAnnual(account.interestRateAnnual ?? 0);
      const interest = balance * rateMonthly;
      let newBalance = balance + interest;
      const minPay = Math.max(0, account.minPaymentMonthly ?? 0);
      if (minPay > 0) {
        newBalance = Math.max(0, newBalance - minPay);
        netCashDelta -= minPay;
      }
      accountBalances[account.id] = newBalance;
    }

    // Investments and properties: apply monthly growth
    for (const account of state.accounts) {
      if (account.type === "investment" || account.type === "property") {
        const balance = accountBalances[account.id] ?? 0;
        const rateMonthly = monthRateFromAnnual(account.expectedReturnAnnual ?? 0);
        accountBalances[account.id] = balance * (1 + rateMonthly);
      }
    }

    // Apply net cash delta to cash
    accountBalances[cashAccountId] = (accountBalances[cashAccountId] ?? 0) + netCashDelta;

    // Inflation adjustment is implicitly handled via expense growth; asset revaluation can be optionally modeled separately

    // Aggregate totals
    let totalAssets = 0;
    let totalLiabilities = 0;
    for (const account of state.accounts) {
      const bal = accountBalances[account.id] ?? 0;
      if (account.type === "loan") {
        totalLiabilities += bal;
      } else {
        totalAssets += bal;
      }
    }
    // Include virtual cash if present
    if (!cashAccount) {
      const virtualCash = accountBalances[cashAccountId] ?? 0;
      if (virtualCash >= 0) totalAssets += virtualCash;
      else totalLiabilities += Math.abs(virtualCash);
    }

    // Add stock portfolio value to total assets (if provided)
    if (stockPortfolioValue && stockPortfolioValue > 0) {
      totalAssets += stockPortfolioValue;
    }

    const netWorth = totalAssets - totalLiabilities;
    const cashFlow = netCashDelta; // per month

    // Push balances snapshot
    state.accounts.forEach((a) => {
      byAccountBalances[a.id].push(accountBalances[a.id] ?? 0);
    });
    if (!cashAccount) {
      byAccountBalances[cashAccountId].push(accountBalances[cashAccountId] ?? 0);
    }

    points.push({
      dateISO: `${currentLabel}-01`,
      netWorth,
      totalAssets,
      totalLiabilities,
      cashFlow,
      income: grossIncome,
      expenses,
      taxes,
      stockPortfolioValue,
    });
  }

  return {
    points,
    byAccountBalances,
    monthLabels,
  };
}


