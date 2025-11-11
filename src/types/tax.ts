export type GermanFilingStatus = "single" | "married_joint";

export interface GermanTaxScenario {
  id: string;
  name: string;
  year: number;
  filingStatus: GermanFilingStatus;
  taxClass?: "I" | "II" | "III" | "IV" | "V" | "VI";
  salaryAnnual?: number;
  bonusAnnual?: number;
  otherEmploymentIncome?: number;
  selfEmploymentIncome?: number;
  capitalGains?: number;
  capitalGainsAllowance?: number;
  deductibleExpenses?: number;
  specialExpenses?: number;
  extraordinaryBurden?: number;
  additionalDeductions?: number;
  socialHealthInsurance?: number;
  socialPensionInsurance?: number;
  socialUnemploymentInsurance?: number;
  socialCareInsurance?: number;
  includeSolidaritySurcharge: boolean;
  includeChurchTax: boolean;
  churchTaxRate?: number;
  includeCapitalGainsTax: boolean;
  notes?: string;
}

export interface GermanTaxScenarioResult {
  scenario: GermanTaxScenario;
  totalEmploymentIncome: number;
  totalTaxableIncome: number;
  assessedIncomeTax: number;
  solidaritySurcharge: number;
  churchTax: number;
  capitalGainsTax: number;
  capitalGainsSolidarity: number;
  capitalGainsChurchTax: number;
  totalTax: number;
  totalNetAnnual: number;
  totalNetMonthly: number;
  effectiveAverageRate: number;
  effectiveMarginalRate: number;
  breakdown: {
    grossAnnual: number;
    employmentNet: number;
    capitalNet: number;
    socialContributions: number;
    deductions: number;
  };
}
