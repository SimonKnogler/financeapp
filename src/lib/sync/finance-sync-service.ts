const LEGACY_EXPENSE_SEEDS = [
  { name: "Rent", amount: 1500, frequency: "monthly" as const },
  { name: "Groceries", amount: 600, frequency: "monthly" as const },
  { name: "Miscellaneous", amount: 400, frequency: "monthly" as const },
];

const LEGACY_INCOME_SEEDS = [
  { name: "Salary", amount: 5000, frequency: "monthly" as const },
];

const CLIENT_ID_STORAGE_KEY = "finance-sync-client-id";

export const FINANCE_SYNC_VERSION = 1;

import type { FinanceState, StoredDocument, PortfolioAccount } from "@/types/finance";

export type FinanceSyncState = FinanceState & {
  customAssetReturns: Record<string, number>;
  taxScenarios?: import("@/types/tax").GermanTaxScenario[];
  documents?: StoredDocument[];
};

export type FinanceSyncData = FinanceSyncState;

export interface FinanceSyncDocument {
  version: number;
  meta: {
    updatedAt: string;
    clientId: string;
    hash: string;
  };
  data: FinanceSyncData;
}

function isLegacySeedExpense(expense: { name: string; amount: number; frequency: string }) {
  return LEGACY_EXPENSE_SEEDS.some(
    (seed) =>
      expense.name === seed.name &&
      expense.frequency === seed.frequency &&
      Math.abs(expense.amount - seed.amount) < 0.01
  );
}

function isLegacySeedIncome(income: { name: string; amount: number; frequency: string }) {
  return LEGACY_INCOME_SEEDS.some(
    (seed) =>
      income.name === seed.name &&
      income.frequency === seed.frequency &&
      Math.abs(income.amount - seed.amount) < 0.01
  );
}

function cleanObject<T extends object>(input: T): T {
  const result: Partial<T> = {};
  for (const key of Object.keys(input) as Array<keyof T>) {
    const value = input[key];
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

function normaliseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normaliseString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return undefined;
}

function normaliseAssumptions(
  assumptions: FinanceSyncState["assumptions"] | undefined
): FinanceSyncState["assumptions"] {
  const todayISO = new Date().toISOString().split("T")[0];
  const defaults = {
    startDateISO: todayISO,
    projectionYears: 30,
    inflationAnnual: 0.02,
    taxRateEffective: 0.26,
    currency: "EUR",
  } satisfies FinanceSyncState["assumptions"];

  if (!assumptions) {
    return defaults;
  }

  const result = {
    ...defaults,
    ...assumptions,
  };

  result.projectionYears = normaliseNumber(result.projectionYears) ?? defaults.projectionYears;
  result.inflationAnnual = normaliseNumber(result.inflationAnnual) ?? defaults.inflationAnnual;
  result.taxRateEffective = normaliseNumber(result.taxRateEffective) ?? defaults.taxRateEffective;
  result.startDateISO = normaliseString(result.startDateISO) ?? defaults.startDateISO;
  // Force currency to EUR to keep application consistent
  result.currency = "EUR";

  return result;
}

function sortById<T extends { id?: string; name?: string }>(items: T[]): T[] {
  return items.slice().sort((a, b) => {
    const aKey = a.id ?? a.name ?? "";
    const bKey = b.id ?? b.name ?? "";
    return aKey.localeCompare(bKey);
  });
}

function sortSnapshots(
  snapshots: FinanceSyncState["portfolioHistory"]
): FinanceSyncState["portfolioHistory"] {
  return snapshots
    .slice()
    .sort((a, b) => {
      const ownerCompare = (a.owner ?? "").localeCompare(b.owner ?? "");
      if (ownerCompare !== 0) return ownerCompare;
      return (a.dateISO ?? "").localeCompare(b.dateISO ?? "");
    })
    .map((snapshot) => ({
      ...snapshot,
      timestamp: snapshot.timestamp ?? Date.now(),
    }));
}

function sortDocumentsByDate(
  documents: FinanceSyncState["documents"]
): FinanceSyncState["documents"] {
  return documents
    .slice()
    .sort((a, b) => new Date(b.uploadedAt ?? 0).getTime() - new Date(a.uploadedAt ?? 0).getTime());
}

function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function normaliseTaxScenario(
  scenario: Partial<import("@/types/tax").GermanTaxScenario> | undefined
): import("@/types/tax").GermanTaxScenario {
  const currentYear = new Date().getFullYear();
  return {
    id: scenario?.id ?? randomId("tax"),
    name: scenario?.name ?? "New Scenario",
    year: scenario?.year ?? currentYear,
    filingStatus: scenario?.filingStatus ?? "single",
    taxClass: scenario?.taxClass,
    salaryAnnual: normaliseNumber(scenario?.salaryAnnual),
    bonusAnnual: normaliseNumber(scenario?.bonusAnnual),
    otherEmploymentIncome: normaliseNumber(scenario?.otherEmploymentIncome),
    selfEmploymentIncome: normaliseNumber(scenario?.selfEmploymentIncome),
    capitalGains: normaliseNumber(scenario?.capitalGains),
    capitalGainsAllowance: normaliseNumber(scenario?.capitalGainsAllowance) ?? 1000,
    deductibleExpenses: normaliseNumber(scenario?.deductibleExpenses),
    specialExpenses: normaliseNumber(scenario?.specialExpenses),
    extraordinaryBurden: normaliseNumber(scenario?.extraordinaryBurden),
    additionalDeductions: normaliseNumber(scenario?.additionalDeductions),
    socialHealthInsurance: normaliseNumber(scenario?.socialHealthInsurance),
    socialPensionInsurance: normaliseNumber(scenario?.socialPensionInsurance),
    socialUnemploymentInsurance: normaliseNumber(scenario?.socialUnemploymentInsurance),
    socialCareInsurance: normaliseNumber(scenario?.socialCareInsurance),
    includeSolidaritySurcharge: scenario?.includeSolidaritySurcharge ?? true,
    includeChurchTax: scenario?.includeChurchTax ?? false,
    churchTaxRate: normaliseNumber(scenario?.churchTaxRate) ?? 0.08,
    includeCapitalGainsTax: scenario?.includeCapitalGainsTax ?? true,
    notes: scenario?.notes,
  };
}

function normaliseDocument(
  document: Partial<StoredDocument> | undefined
): StoredDocument {
  return {
    id: document?.id ?? randomId("doc"),
    name: normaliseString(document?.name) ?? "Document",
    size: normaliseNumber(document?.size) ?? 0,
    storagePath: normaliseString(document?.storagePath) ?? "",
    uploadedAt: normaliseString(document?.uploadedAt) ?? new Date().toISOString(),
    uploadedById: normaliseString(document?.uploadedById) ?? "unknown",
    uploadedByEmail: document?.uploadedByEmail ?? null,
    description: normaliseString(document?.description),
    tags: Array.isArray(document?.tags)
      ? document.tags
          .map((tag) => normaliseString(tag) ?? "")
          .filter((tag): tag is string => Boolean(tag && tag.length > 0))
      : undefined,
  };
}

function normalisePortfolioAccount(
  account: Partial<PortfolioAccount> | undefined
): PortfolioAccount {
  return {
    id: account?.id ?? randomId("port"),
    name: normaliseString(account?.name) ?? "Portfolio",
    description: normaliseString(account?.description),
    owner: account?.owner ?? "household",
    benchmarkSymbol: normaliseString(account?.benchmarkSymbol) ?? null,
  };
}

export function sanitizeFinanceSyncState(state: FinanceSyncState): FinanceSyncData {
  const accounts = sortById((state.accounts ?? []).map((account) => cleanObject({
    ...account,
    balance: normaliseNumber(account.balance) ?? 0,
    expectedReturnAnnual: normaliseNumber(account.expectedReturnAnnual),
    volatilityAnnual: normaliseNumber(account.volatilityAnnual),
    contributionMonthly: normaliseNumber(account.contributionMonthly),
    interestRateAnnual: normaliseNumber(account.interestRateAnnual),
    minPaymentMonthly: normaliseNumber(account.minPaymentMonthly),
  })));

  const stocks = sortById((state.stocks ?? []).map((stock) => cleanObject({
    ...stock,
    shares: normaliseNumber(stock.shares) ?? 0,
    costBasis: normaliseNumber(stock.costBasis),
  })));

  const portfolioAccounts = sortById(
    (state.portfolioAccounts ?? [])
      .map((account) => cleanObject(normalisePortfolioAccount(account)))
  );

  const expenses = sortById(
    (state.expenses ?? [])
      .filter((expense) => !isLegacySeedExpense(expense))
      .map((expense) =>
        cleanObject({
          ...expense,
          amount: normaliseNumber(expense.amount) ?? 0,
          growthAnnual: normaliseNumber(expense.growthAnnual) ?? 0,
        })
      )
  );

  const incomes = sortById(
    (state.incomes ?? [])
      .filter((income) => !isLegacySeedIncome(income))
      .map((income) =>
        cleanObject({
          ...income,
          amount: normaliseNumber(income.amount) ?? 0,
          growthAnnual: normaliseNumber(income.growthAnnual) ?? 0,
        })
      )
  );

  const goals = sortById((state.goals ?? []).map((goal) => cleanObject(goal)));

  const portfolioHistory = sortSnapshots(state.portfolioHistory ?? []);

  const documents = sortDocumentsByDate((state.documents ?? []).map((document) => normaliseDocument(document)));

  const customAssetReturnsEntries = Object.entries(state.customAssetReturns ?? {})
    .filter(([, value]) => Number.isFinite(Number(value)))
    .map(([symbol, value]) => [symbol, Number(value)] as const)
    .sort((a, b) => a[0].localeCompare(b[0]));

  const customAssetReturns: Record<string, number> = {};
  for (const [symbol, value] of customAssetReturnsEntries) {
    customAssetReturns[symbol] = value;
  }

  return {
    accounts,
    portfolioAccounts,
    stocks,
    expenses,
    incomes,
    goals,
    portfolioHistory,
    assumptions: normaliseAssumptions(state.assumptions),
    customAssetReturns,
    taxScenarios: sortById((state.taxScenarios ?? []).map((scenario) => normaliseTaxScenario(scenario))),
    documents,
  } satisfies FinanceSyncData;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries
      .map(([key, val]) => `${JSON.stringify(key)}:${stableStringify(val)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashString(input: string): string {
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return ((h2 & 0x1fffff) * 4294967296 + (h1 >>> 0)).toString(16);
}

export function computeFinanceStateHash(state: FinanceSyncState): string {
  const sanitized = sanitizeFinanceSyncState(state);
  return hashString(stableStringify(sanitized));
}

export function buildFinanceDocument(state: FinanceSyncState, clientId: string): FinanceSyncDocument {
  const sanitized = sanitizeFinanceSyncState(state);
  const hash = hashString(stableStringify(sanitized));

  return {
    version: FINANCE_SYNC_VERSION,
    meta: {
      updatedAt: new Date().toISOString(),
      clientId,
      hash,
    },
    data: sanitized,
  } satisfies FinanceSyncDocument;
}

export function deserializeFinanceDocument(document: FinanceSyncDocument): FinanceSyncState {
  const data = document?.data ?? ({} as FinanceSyncData);
  return sanitizeFinanceSyncState({
    ...data,
    customAssetReturns: data.customAssetReturns ?? {},
    taxScenarios: data.taxScenarios ?? [],
    documents: data.documents ?? [],
  });
}

export function getFinanceSyncClientId(): string {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
    return "server";
  }

  const storage = window.localStorage;
  let clientId = storage.getItem(CLIENT_ID_STORAGE_KEY);
  if (!clientId) {
    if (typeof window.crypto !== "undefined" && typeof window.crypto.randomUUID === "function") {
      clientId = window.crypto.randomUUID();
    } else {
      clientId = `client_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    }
    storage.setItem(CLIENT_ID_STORAGE_KEY, clientId);
  }
  return clientId;
}
