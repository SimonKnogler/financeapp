import type { MortgageScenario } from "@/types/finance";

export interface MortgageScheduleEntry {
  month: number;
  date: string;
  payment: number;
  interest: number;
  principal: number;
  extraPayment: number;
  balance: number;
  ratePercent: number;
}

export interface MortgageYearSummary {
  year: number;
  interestPaid: number;
  principalPaid: number;
  extraPaid: number;
  balance: number;
}

export interface MortgageProjectionResult {
  schedule: MortgageScheduleEntry[];
  yearly: MortgageYearSummary[];
  metrics: {
    monthlyPayment: number;
    totalInterest: number;
    totalPrincipal: number;
    totalPaid: number;
    balanceAfterFixation: number;
    payoffMonth?: number;
    payoffDate?: string;
  };
}

function getMonthlyPayment(scenario: MortgageScenario, annualRatePercent: number): number {
  const monthlyRate = annualRatePercent / 100 / 12;
  if (scenario.paymentType === "custom" && scenario.monthlyPayment) {
    return scenario.monthlyPayment;
  }
  const repaymentPercent = scenario.initialRepaymentPercent ?? 2;
  return (annualRatePercent + repaymentPercent) / 100 / 12 * scenario.loanAmount;
}

export function calculateMortgageProjection(scenario: MortgageScenario): MortgageProjectionResult {
  const schedule: MortgageScheduleEntry[] = [];
  const yearlyMap = new Map<number, MortgageYearSummary>();

  const startDate = scenario.startDateISO ? new Date(scenario.startDateISO) : new Date();
  let balance = scenario.loanAmount;
  let payoffMonth: number | undefined;
  let payoffDate: string | undefined;

  const rateAdjustments = (scenario.rateAdjustments ?? [])
    .slice()
    .sort((a, b) => a.year - b.year);

  let currentRate = scenario.interestRate;
  let monthlyPayment = getMonthlyPayment(scenario, currentRate);
  let adjustmentIndex = 0;

  const totalMonths = Math.max(12, Math.round(scenario.termYears * 12));
  for (let month = 1; month <= totalMonths; month++) {
    const yearIndex = Math.ceil(month / 12);
    if (
      adjustmentIndex < rateAdjustments.length &&
      rateAdjustments[adjustmentIndex].year === yearIndex
    ) {
      currentRate = rateAdjustments[adjustmentIndex].ratePercent;
      monthlyPayment = getMonthlyPayment(scenario, currentRate);
      adjustmentIndex += 1;
    }

    const monthDate = new Date(startDate);
    monthDate.setMonth(startDate.getMonth() + (month - 1));
    const dateISO = monthDate.toISOString().split("T")[0];

    const monthlyRate = currentRate / 100 / 12;
    const interestPortion = balance * monthlyRate;
    let principalPortion = Math.max(monthlyPayment - interestPortion, 0);

    const extraMonthly = scenario.extraPaymentMonthly ?? 0;
    const extraAnnual =
      scenario.extraPaymentAnnual && month % 12 === 0 ? scenario.extraPaymentAnnual : 0;
    const extraPayment = extraMonthly + extraAnnual;

    const totalPrincipal = Math.min(balance, principalPortion + extraPayment);

    balance = Math.max(0, balance - totalPrincipal);

    schedule.push({
      month,
      date: dateISO,
      payment: monthlyPayment,
      interest: interestPortion,
      principal: principalPortion,
      extraPayment,
      balance,
      ratePercent: currentRate,
    });

    const summary = yearlyMap.get(yearIndex) ?? {
      year: yearIndex,
      interestPaid: 0,
      principalPaid: 0,
      extraPaid: 0,
      balance,
    };
    summary.interestPaid += interestPortion;
    summary.principalPaid += principalPortion;
    summary.extraPaid += extraPayment;
    summary.balance = balance;
    yearlyMap.set(yearIndex, summary);

    if (balance <= 0) {
      payoffMonth = month;
      payoffDate = dateISO;
      break;
    }
  }

  const fixationMonths = Math.max(1, Math.round(scenario.fixationYears * 12));
  const fixationEntry = schedule[Math.min(fixationMonths - 1, schedule.length - 1)];
  const balanceAfterFixation = fixationEntry ? fixationEntry.balance : scenario.loanAmount;

  const totalInterest = schedule.reduce((sum, entry) => sum + entry.interest, 0);
  const totalPrincipal = schedule.reduce((sum, entry) => sum + entry.principal + entry.extraPayment, 0);

  return {
    schedule,
    yearly: Array.from(yearlyMap.values()),
    metrics: {
      monthlyPayment,
      totalInterest,
      totalPrincipal,
      totalPaid: totalInterest + totalPrincipal,
      balanceAfterFixation,
      payoffMonth,
      payoffDate,
    },
  };
}

export function buildMortgageCsv(schedule: MortgageScheduleEntry[], scenarioName: string): string {
  const header = "Scenario,Month,Date,Payment,Interest,Principal,Extra Payment,Balance,Rate\n";
  const rows = schedule
    .map((entry) =>
      [
        `"${scenarioName.replace(/"/g, '""')}"`,
        entry.month,
        entry.date,
        entry.payment.toFixed(2),
        entry.interest.toFixed(2),
        entry.principal.toFixed(2),
        entry.extraPayment.toFixed(2),
        entry.balance.toFixed(2),
        entry.ratePercent.toFixed(3),
      ].join(",")
    )
    .join("\n");
  return `${header}${rows}`;
}

