import { calculateGermanTax, estimateSocialContributions, type GermanTaxInput } from "@/lib/tax/germany";
import { describe, it, expect } from "@jest/globals";

describe("German Tax Calculator", () => {
  describe("calculateGermanTax", () => {
    it("should calculate tax for a basic salary scenario", () => {
      const input: GermanTaxInput = {
        taxClass: 1,
        grossSalary: 60000,
        solidarityEnabled: true,
        churchTaxEnabled: false,
      };

      const result = calculateGermanTax(input);

      expect(result.totalGrossIncome).toBe(60000);
      expect(result.incomeTax).toBeGreaterThan(0);
      expect(result.netIncome).toBeLessThan(60000);
      expect(result.netIncome).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeGreaterThan(0);
      expect(result.effectiveTaxRate).toBeLessThan(100);
    });

    it("should apply married splitting correctly", () => {
      const singleInput: GermanTaxInput = {
        taxClass: 1,
        grossSalary: 120000,
        solidarityEnabled: true,
        churchTaxEnabled: false,
        marriedSplitting: false,
      };

      const marriedInput: GermanTaxInput = {
        ...singleInput,
        marriedSplitting: true,
      };

      const singleResult = calculateGermanTax(singleInput);
      const marriedResult = calculateGermanTax(marriedInput);

      // Married splitting should result in lower tax
      expect(marriedResult.incomeTax).toBeLessThan(singleResult.incomeTax);
      expect(marriedResult.effectiveTaxRate).toBeLessThan(singleResult.effectiveTaxRate);
    });

    it("should handle capital gains with allowance", () => {
      const input: GermanTaxInput = {
        taxClass: 1,
        grossSalary: 50000,
        capitalGains: 5000,
        capitalGainsAllowance: 1000,
        solidarityEnabled: true,
        churchTaxEnabled: false,
      };

      const result = calculateGermanTax(input);

      expect(result.breakdown.capitalGains).toBe(5000);
      expect(result.breakdown.capitalGainsAllowance).toBe(1000);
      expect(result.breakdown.taxableCapitalIncome).toBe(4000);
    });

    it("should apply deductions correctly", () => {
      const withoutDeductions: GermanTaxInput = {
        taxClass: 1,
        grossSalary: 60000,
        workRelatedExpenses: 1230, // Standard flat rate
        solidarityEnabled: true,
        churchTaxEnabled: false,
      };

      const withDeductions: GermanTaxInput = {
        ...withoutDeductions,
        workRelatedExpenses: 5000,
        specialExpenses: 2000,
      };

      const resultWithout = calculateGermanTax(withoutDeductions);
      const resultWith = calculateGermanTax(withDeductions);

      // Higher deductions should result in lower tax
      expect(resultWith.totalDeductions).toBeGreaterThan(resultWithout.totalDeductions);
      expect(resultWith.incomeTax).toBeLessThan(resultWithout.incomeTax);
    });

    it("should calculate solidarity surcharge correctly", () => {
      const withSoli: GermanTaxInput = {
        taxClass: 1,
        grossSalary: 60000,
        solidarityEnabled: true,
        churchTaxEnabled: false,
      };

      const withoutSoli: GermanTaxInput = {
        ...withSoli,
        solidarityEnabled: false,
      };

      const resultWithSoli = calculateGermanTax(withSoli);
      const resultWithoutSoli = calculateGermanTax(withoutSoli);

      expect(resultWithSoli.solidarityTax).toBeGreaterThanOrEqual(0);
      expect(resultWithoutSoli.solidarityTax).toBe(0);
      expect(resultWithSoli.totalTax).toBeGreaterThanOrEqual(resultWithoutSoli.totalTax);
    });

    it("should calculate church tax when enabled", () => {
      const withChurch: GermanTaxInput = {
        taxClass: 1,
        grossSalary: 60000,
        solidarityEnabled: true,
        churchTaxEnabled: true,
        churchTaxRate: 0.09,
      };

      const withoutChurch: GermanTaxInput = {
        ...withChurch,
        churchTaxEnabled: false,
      };

      const resultWithChurch = calculateGermanTax(withChurch);
      const resultWithoutChurch = calculateGermanTax(withoutChurch);

      expect(resultWithChurch.churchTax).toBeGreaterThan(0);
      expect(resultWithoutChurch.churchTax).toBe(0);
      expect(resultWithChurch.totalTax).toBeGreaterThan(resultWithoutChurch.totalTax);
    });

    it("should include social contributions in net calculation", () => {
      const withSocial: GermanTaxInput = {
        taxClass: 1,
        grossSalary: 60000,
        solidarityEnabled: true,
        churchTaxEnabled: false,
        pensionContribution: 5000,
        healthContribution: 3000,
      };

      const withoutSocial: GermanTaxInput = {
        ...withSocial,
        pensionContribution: 0,
        healthContribution: 0,
      };

      const resultWithSocial = calculateGermanTax(withSocial);
      const resultWithoutSocial = calculateGermanTax(withoutSocial);

      expect(resultWithSocial.totalSocialContributions).toBe(8000);
      expect(resultWithoutSocial.totalSocialContributions).toBe(0);
      expect(resultWithSocial.netIncome).toBeLessThan(resultWithoutSocial.netIncome);
    });

    it("should handle low income with Grundfreibetrag", () => {
      const input: GermanTaxInput = {
        taxClass: 1,
        grossSalary: 10000, // Below Grundfreibetrag
        solidarityEnabled: true,
        churchTaxEnabled: false,
      };

      const result = calculateGermanTax(input);

      expect(result.incomeTax).toBe(0);
      expect(result.solidarityTax).toBe(0);
    });

    it("should calculate marginal tax rate", () => {
      const input: GermanTaxInput = {
        taxClass: 1,
        grossSalary: 60000,
        solidarityEnabled: true,
        churchTaxEnabled: false,
      };

      const result = calculateGermanTax(input);

      expect(result.marginalTaxRate).toBeGreaterThan(0);
      expect(result.marginalTaxRate).toBeGreaterThanOrEqual(result.effectiveTaxRate);
    });
  });

  describe("estimateSocialContributions", () => {
    it("should estimate social contributions for typical salary", () => {
      const result = estimateSocialContributions(60000);

      expect(result.pensionContribution).toBeGreaterThan(0);
      expect(result.healthContribution).toBeGreaterThan(0);
      expect(result.unemploymentContribution).toBeGreaterThan(0);
      expect(result.careContribution).toBeGreaterThan(0);
      expect(result.total).toBe(
        result.pensionContribution +
        result.healthContribution +
        result.unemploymentContribution +
        result.careContribution
      );
    });

    it("should apply contribution ceilings", () => {
      const lowSalary = estimateSocialContributions(30000);
      const highSalary = estimateSocialContributions(200000);

      // High salary contributions should not be proportionally much higher due to ceilings
      const lowRatio = lowSalary.total / 30000;
      const highRatio = highSalary.total / 200000;

      expect(highRatio).toBeLessThan(lowRatio);
    });
  });
});
