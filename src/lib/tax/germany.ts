/**
 * German Tax Calculator (Einkommensteuer + Solidarity + Church Tax + Social Contributions)
 * Based on §32a EStG (2024/2025 formulas)
 */

export type TaxClass = 1 | 2 | 3 | 4 | 5 | 6;

export interface GermanTaxInput {
  // Year
  year?: number;

  // Filing status
  taxClass?: TaxClass;
  marriedSplitting?: boolean;

  // Income sources (all optional)
  grossSalary?: number;
  bonus?: number;
  selfEmployedIncome?: number;
  capitalGains?: number;
  dividends?: number;
  otherIncome?: number;

  // Deductions (optional)
  workRelatedExpenses?: number; // Werbungskosten
  specialExpenses?: number; // Sonderausgaben
  extraordinaryBurdens?: number; // Außergewöhnliche Belastungen

  // Capital gains allowance
  capitalGainsAllowance?: number; // Sparerpauschbetrag (default 1000 single, 2000 married)

  // Surcharges
  solidarityEnabled?: boolean;
  churchTaxEnabled?: boolean;
  churchTaxRate?: number; // 8% or 9% depending on Bundesland

  // Social contributions (optional, for net pay calculation)
  pensionContribution?: number; // Rentenversicherung employee share
  healthContribution?: number; // Krankenversicherung employee share
  unemploymentContribution?: number; // Arbeitslosenversicherung employee share
  careContribution?: number; // Pflegeversicherung employee share
}

export interface GermanTaxResult {
  // Inputs summary
  totalGrossIncome: number;
  totalDeductions: number;
  taxableIncome: number;

  // Tax components
  incomeTax: number;
  solidarityTax: number;
  churchTax: number;
  totalTax: number;

  // Social contributions
  totalSocialContributions: number;

  // Net result
  netIncome: number;

  // Rates
  effectiveTaxRate: number; // (totalTax / totalGrossIncome) * 100
  marginalTaxRate: number; // Rate on next euro earned

  // Breakdown
  breakdown: {
    grossSalary: number;
    bonus: number;
    selfEmployedIncome: number;
    capitalGains: number;
    dividends: number;
    otherIncome: number;
    workRelatedExpenses: number;
    specialExpenses: number;
    extraordinaryBurdens: number;
    capitalGainsAllowance: number;
    taxableSalary: number;
    taxableCapitalIncome: number;
    pensionContribution: number;
    healthContribution: number;
    unemploymentContribution: number;
    careContribution: number;
  };
}

/**
 * Calculate German income tax according to §32a EStG (2024 formula)
 * Returns the tax for the given taxable income
 */
function calculateIncomeTax2024(taxableIncome: number): number {
  // Round down to full euros
  const y = Math.floor(taxableIncome);

  if (y <= 11604) {
    // Zone 1: Basic allowance (Grundfreibetrag)
    return 0;
  }

  if (y <= 17005) {
    // Zone 2: Linear progression
    const x = (y - 11604) / 10000;
    return (922.98 * x + 1400) * x;
  }

  if (y <= 66760) {
    // Zone 3: First progression zone
    const z = (y - 17005) / 10000;
    return (181.19 * z + 2397) * z + 1025.38;
  }

  if (y <= 277825) {
    // Zone 4: Upper progression zone
    return 0.42 * y - 10602.13;
  }

  // Zone 5: Top rate
  return 0.45 * y - 18936.88;
}

/**
 * Calculate solidarity surcharge (Solidaritätszuschlag)
 * 5.5% of income tax, with exemption threshold
 */
function calculateSolidarityTax(incomeTax: number, marriedSplitting: boolean): number {
  const threshold = marriedSplitting ? 32688 : 16344;

  if (incomeTax <= threshold) {
    return 0;
  }

  const exemptionZone = marriedSplitting ? 2000 : 1000;
  const surplusTax = incomeTax - threshold;

  if (surplusTax <= exemptionZone) {
    // Partial solidarity tax in exemption zone
    return surplusTax * 0.119;
  }

  // Full 5.5%
  return incomeTax * 0.055;
}

/**
 * Calculate marginal tax rate (rate on next euro earned)
 */
function calculateMarginalRate(taxableIncome: number, marriedSplitting: boolean): number {
  const delta = 100; // Test with 100 euro increase
  const baseTax = calculateIncomeTax2024(taxableIncome);
  const increasedTax = calculateIncomeTax2024(taxableIncome + delta);
  const marginalIncomeTax = (increasedTax - baseTax) / delta;

  // Add solidarity surcharge effect
  const baseSoli = calculateSolidarityTax(baseTax, marriedSplitting);
  const increasedSoli = calculateSolidarityTax(increasedTax, marriedSplitting);
  const marginalSoli = (increasedSoli - baseSoli) / delta;

  return (marginalIncomeTax + marginalSoli) * 100;
}

/**
 * Main German tax calculator
 */
export function calculateGermanTax(input: GermanTaxInput): GermanTaxResult {
  // Defaults
  const year = input.year ?? new Date().getFullYear();
  const taxClass = input.taxClass ?? 1;
  const marriedSplitting = input.marriedSplitting ?? false;
  const solidarityEnabled = input.solidarityEnabled ?? true;
  const churchTaxEnabled = input.churchTaxEnabled ?? false;
  const churchTaxRate = input.churchTaxRate ?? 0.09;

  // Income components
  const grossSalary = input.grossSalary ?? 0;
  const bonus = input.bonus ?? 0;
  const selfEmployedIncome = input.selfEmployedIncome ?? 0;
  const capitalGains = input.capitalGains ?? 0;
  const dividends = input.dividends ?? 0;
  const otherIncome = input.otherIncome ?? 0;

  // Deductions
  const workRelatedExpenses = input.workRelatedExpenses ?? 1230; // Werbungskostenpauschale
  const specialExpenses = input.specialExpenses ?? 0;
  const extraordinaryBurdens = input.extraordinaryBurdens ?? 0;

  // Capital gains allowance (Sparerpauschbetrag)
  const capitalGainsAllowance = input.capitalGainsAllowance ?? (marriedSplitting ? 2000 : 1000);

  // Social contributions
  const pensionContribution = input.pensionContribution ?? 0;
  const healthContribution = input.healthContribution ?? 0;
  const unemploymentContribution = input.unemploymentContribution ?? 0;
  const careContribution = input.careContribution ?? 0;

  // Total gross income
  const totalGrossIncome = grossSalary + bonus + selfEmployedIncome + capitalGains + dividends + otherIncome;

  // Total deductions
  const totalDeductions = workRelatedExpenses + specialExpenses + extraordinaryBurdens;

  // Taxable salary income (employment + self-employed)
  const taxableSalary = Math.max(0, grossSalary + bonus + selfEmployedIncome + otherIncome - totalDeductions);

  // Taxable capital income (with allowance)
  const totalCapitalIncome = capitalGains + dividends;
  const taxableCapitalIncome = Math.max(0, totalCapitalIncome - capitalGainsAllowance);

  // Total taxable income
  let taxableIncome = taxableSalary + taxableCapitalIncome;

  // Apply married splitting if enabled
  if (marriedSplitting) {
    taxableIncome = taxableIncome / 2;
  }

  // Calculate income tax
  let incomeTax = calculateIncomeTax2024(taxableIncome);

  // If married splitting, double the tax
  if (marriedSplitting) {
    incomeTax = incomeTax * 2;
  }

  // Calculate solidarity surcharge
  const solidarityTax = solidarityEnabled ? calculateSolidarityTax(incomeTax, marriedSplitting) : 0;

  // Calculate church tax (based on income tax)
  const churchTax = churchTaxEnabled ? incomeTax * churchTaxRate : 0;

  // Total tax
  const totalTax = incomeTax + solidarityTax + churchTax;

  // Total social contributions
  const totalSocialContributions = pensionContribution + healthContribution + unemploymentContribution + careContribution;

  // Net income
  const netIncome = totalGrossIncome - totalTax - totalSocialContributions;

  // Effective tax rate
  const effectiveTaxRate = totalGrossIncome > 0 ? (totalTax / totalGrossIncome) * 100 : 0;

  // Marginal tax rate
  const marginalTaxRate = calculateMarginalRate(marriedSplitting ? taxableIncome * 2 : taxableIncome, marriedSplitting);

  return {
    totalGrossIncome,
    totalDeductions,
    taxableIncome: marriedSplitting ? taxableIncome * 2 : taxableIncome,
    incomeTax,
    solidarityTax,
    churchTax,
    totalTax,
    totalSocialContributions,
    netIncome,
    effectiveTaxRate,
    marginalTaxRate,
    breakdown: {
      grossSalary,
      bonus,
      selfEmployedIncome,
      capitalGains,
      dividends,
      otherIncome,
      workRelatedExpenses,
      specialExpenses,
      extraordinaryBurdens,
      capitalGainsAllowance,
      taxableSalary,
      taxableCapitalIncome,
      pensionContribution,
      healthContribution,
      unemploymentContribution,
      careContribution,
    },
  };
}

/**
 * Estimate social contributions based on gross salary
 * (Employee shares only, using 2024 rates and ceilings)
 */
export function estimateSocialContributions(grossSalaryYearly: number): {
  pensionContribution: number;
  healthContribution: number;
  unemploymentContribution: number;
  careContribution: number;
  total: number;
} {
  const monthlyGross = grossSalaryYearly / 12;

  // 2024 contribution ceilings (West Germany, monthly)
  const pensionCeiling = 7550;
  const healthCeiling = 5175;

  // Contribution rates (employee share)
  const pensionRate = 0.093; // 9.3%
  const healthRate = 0.073; // 7.3% base rate
  const healthAdditionalRate = 0.017; // 1.7% average additional rate
  const unemploymentRate = 0.013; // 1.3%
  const careRate = 0.01775; // 1.775% (without children) or 1.525% (with children), using higher rate

  // Apply ceilings
  const pensionBase = Math.min(monthlyGross, pensionCeiling);
  const healthBase = Math.min(monthlyGross, healthCeiling);

  // Calculate monthly contributions
  const monthlyPension = pensionBase * pensionRate;
  const monthlyHealth = healthBase * (healthRate + healthAdditionalRate);
  const monthlyUnemployment = pensionBase * unemploymentRate;
  const monthlyCare = healthBase * careRate;

  // Return yearly contributions
  return {
    pensionContribution: monthlyPension * 12,
    healthContribution: monthlyHealth * 12,
    unemploymentContribution: monthlyUnemployment * 12,
    careContribution: monthlyCare * 12,
    total: (monthlyPension + monthlyHealth + monthlyUnemployment + monthlyCare) * 12,
  };
}
