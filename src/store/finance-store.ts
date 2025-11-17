import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addMonths, startOfMonth } from "date-fns";
import { Assumptions, Account, ExpenseItem, FinanceState, IncomeItem, StockHolding, StoredDocument, PortfolioAccount, MortgageScenario } from "@/types/finance";
import type { GermanTaxScenario } from "@/types/tax";

function firstOfCurrentMonthISO(): string {
  const d = startOfMonth(new Date());
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}-01`;
}

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function normalizeTaxScenario(input?: Partial<GermanTaxScenario>): GermanTaxScenario {
  const currentYear = new Date().getFullYear();
  return {
    id: input?.id ?? generateId("tax"),
    name: input?.name ?? "New Scenario",
    year: input?.year ?? currentYear,
    filingStatus: input?.filingStatus ?? "single",
    taxClass: input?.taxClass,
    salaryAnnual: input?.salaryAnnual,
    bonusAnnual: input?.bonusAnnual,
    otherEmploymentIncome: input?.otherEmploymentIncome,
    selfEmploymentIncome: input?.selfEmploymentIncome,
    capitalGains: input?.capitalGains,
    capitalGainsAllowance: input?.capitalGainsAllowance ?? 1000,
    deductibleExpenses: input?.deductibleExpenses,
    specialExpenses: input?.specialExpenses,
    extraordinaryBurden: input?.extraordinaryBurden,
    additionalDeductions: input?.additionalDeductions,
    socialHealthInsurance: input?.socialHealthInsurance,
    socialPensionInsurance: input?.socialPensionInsurance,
    socialUnemploymentInsurance: input?.socialUnemploymentInsurance,
    socialCareInsurance: input?.socialCareInsurance,
    includeSolidaritySurcharge: input?.includeSolidaritySurcharge ?? true,
    includeChurchTax: input?.includeChurchTax ?? false,
    churchTaxRate: input?.churchTaxRate ?? 0.08,
    includeCapitalGainsTax: input?.includeCapitalGainsTax ?? true,
    notes: input?.notes,
  };
}

function normalizeMortgageScenario(input?: Partial<MortgageScenario>): MortgageScenario {
  const purchasePrice = input?.purchasePrice ?? 500000;
  const downPayment = input?.downPayment ?? Math.min(100000, purchasePrice * 0.2);
  const loanAmount = input?.loanAmount ?? Math.max(purchasePrice - downPayment, 0);
  return {
    id: input?.id ?? generateId("mort"),
    name: input?.name ?? "Neue Finanzierung",
    purchasePrice,
    downPayment,
    loanAmount,
    interestRate: input?.interestRate ?? 4,
    paymentType: input?.paymentType ?? "annuity",
    initialRepaymentPercent: input?.initialRepaymentPercent ?? 2,
    monthlyPayment: input?.monthlyPayment,
    termYears: input?.termYears ?? 30,
    fixationYears: input?.fixationYears ?? 10,
    extraPaymentAnnual: input?.extraPaymentAnnual ?? 0,
    extraPaymentMonthly: input?.extraPaymentMonthly ?? 0,
    startDateISO: input?.startDateISO ?? firstOfCurrentMonthISO(),
    notes: input?.notes,
    rateAdjustments: Array.isArray(input?.rateAdjustments)
      ? input!.rateAdjustments!.map((adj) => ({
          id: adj.id ?? generateId("rate"),
          year: Math.max(1, adj.year ?? 1),
          ratePercent: adj.ratePercent ?? input?.interestRate ?? 4,
        }))
      : [],
  };
}

export interface FinanceStore extends FinanceState {
  // Privacy
  privacyMode: boolean;
  togglePrivacyMode: () => void;
  // Accounts
  addAccount: (input: Omit<Account, "id">) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  removeAccount: (id: string) => void;
  // Income
  addIncome: (input: Omit<IncomeItem, "id">) => void;
  updateIncome: (id: string, updates: Partial<IncomeItem>) => void;
  removeIncome: (id: string) => void;
  // Expenses
  addExpense: (input: Omit<ExpenseItem, "id">) => void;
  updateExpense: (id: string, updates: Partial<ExpenseItem>) => void;
  removeExpense: (id: string) => void;
  // Stocks
  addStock: (input: Omit<StockHolding, "id">) => void;
  updateStock: (id: string, updates: Partial<StockHolding>) => void;
  removeStock: (id: string) => void;
  toggleSparplan: (id: string, sparplan: Partial<StockHolding["sparplan"]>) => void;
  // Portfolio History
  addPortfolioSnapshot: (snapshot: Omit<import("@/types/finance").PortfolioSnapshot, "timestamp">) => void;
  updatePortfolioSnapshot: (snapshot: Omit<import("@/types/finance").PortfolioSnapshot, "timestamp">) => void;
  // Goals
  addGoal: (input: Omit<import("@/types/finance").FinancialGoal, "id">) => void;
  updateGoal: (id: string, updates: Partial<import("@/types/finance").FinancialGoal>) => void;
  removeGoal: (id: string) => void;
  // Assumptions
  setAssumptions: (updates: Partial<Assumptions>) => void;
  // Custom Asset Returns (for projections)
  customAssetReturns: Record<string, number>; // symbol -> expected return as decimal
  setCustomAssetReturn: (symbol: string, expectedReturn: number) => void;
  clearCustomAssetReturn: (symbol: string) => void;
  resetAll: () => void;
  replaceWithCloudData: (
    data: FinanceState & {
      customAssetReturns?: Record<string, number>;
      taxScenarios?: Partial<GermanTaxScenario>[];
      documents?: StoredDocument[];
      mortgageScenarios?: Partial<MortgageScenario>[];
    }
  ) => void;
  cloudSyncToken: number;
  taxScenarios: GermanTaxScenario[];
  addTaxScenario: (scenario?: Partial<GermanTaxScenario>) => void;
  updateTaxScenario: (id: string, updates: Partial<GermanTaxScenario>) => void;
  removeTaxScenario: (id: string) => void;
  duplicateTaxScenario: (id: string) => void;
  addPortfolioAccount: (account: Omit<PortfolioAccount, "id">) => void;
  updatePortfolioAccount: (id: string, updates: Partial<PortfolioAccount>) => void;
  removePortfolioAccount: (id: string) => void;
  // Documents
  addDocument: (document: StoredDocument) => void;
  updateDocument: (id: string, updates: Partial<StoredDocument>) => void;
  removeDocument: (id: string) => void;
  // Mortgage scenarios
  addMortgageScenario: (scenario?: Partial<MortgageScenario>) => void;
  updateMortgageScenario: (id: string, updates: Partial<MortgageScenario>) => void;
  removeMortgageScenario: (id: string) => void;
  duplicateMortgageScenario: (id: string) => void;
}

const defaultState: FinanceState & {
  customAssetReturns: Record<string, number>;
  taxScenarios: GermanTaxScenario[];
  cloudSyncToken: number;
  documents: StoredDocument[];
  mortgageScenarios: MortgageScenario[];
} = {
  accounts: [],
  portfolioAccounts: [
    {
      id: "portfolio_main",
      name: "Main Portfolio",
      owner: "household",
      description: "All holdings combined",
      benchmarkSymbol: "VWCE.DE",
    },
  ],
  incomes: [],
  expenses: [],
  stocks: [], // Both stocks and crypto stored here
  portfolioHistory: [],
  goals: [],
  assumptions: {
    startDateISO: firstOfCurrentMonthISO(),
    projectionYears: 30,
    inflationAnnual: 0.02,
    taxRateEffective: 0.25,
    currency: "EUR",
  },
  customAssetReturns: {}, // Persisted custom returns for projection calculations
  cloudSyncToken: 0,
  taxScenarios: [],
  documents: [],
  mortgageScenarios: [],
};

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
      ...defaultState,
      privacyMode: false,
      togglePrivacyMode: () =>
        set((state) => ({
          privacyMode: !state.privacyMode,
        })),
      addAccount: (input) =>
        set((state) => ({
          accounts: [...state.accounts, { ...input, id: generateId("acc") }],
        })),
      updateAccount: (id, updates) =>
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),
      removeAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
        })),
      addPortfolioAccount: (account) =>
        set((state) => ({
          portfolioAccounts: [
            ...state.portfolioAccounts,
            { ...account, id: generateId("port") },
          ],
        })),
      updatePortfolioAccount: (id, updates) =>
        set((state) => ({
          portfolioAccounts: state.portfolioAccounts.map((account) =>
            account.id === id ? { ...account, ...updates } : account
          ),
        })),
      removePortfolioAccount: (id) =>
        set((state) => ({
          portfolioAccounts: state.portfolioAccounts.filter((account) => account.id !== id),
          stocks: state.stocks.map((stock) =>
            stock.accountId === id ? { ...stock, accountId: undefined } : stock
          ),
        })),
      addIncome: (input) =>
        set((state) => ({
          incomes: [...state.incomes, { ...input, id: generateId("inc") }],
        })),
      updateIncome: (id, updates) =>
        set((state) => ({
          incomes: state.incomes.map((x) => (x.id === id ? { ...x, ...updates } : x)),
        })),
      removeIncome: (id) =>
        set((state) => ({
          incomes: state.incomes.filter((x) => x.id !== id),
        })),
      addExpense: (input) =>
        set((state) => ({
          expenses: [...state.expenses, { ...input, id: generateId("exp") }],
        })),
      updateExpense: (id, updates) =>
        set((state) => ({
          expenses: state.expenses.map((x) => (x.id === id ? { ...x, ...updates } : x)),
        })),
      removeExpense: (id) =>
        set((state) => ({
          expenses: state.expenses.filter((x) => x.id !== id),
        })),
      addStock: (input) =>
        set((state) => {
          const fallbackAccountId =
            input.accountId ??
            state.portfolioAccounts[0]?.id ??
            defaultState.portfolioAccounts[0].id;
          return {
            stocks: [
              ...state.stocks,
              { ...input, id: generateId("stock"), accountId: fallbackAccountId },
            ],
          };
        }),
      updateStock: (id, updates) =>
        set((state) => ({
          stocks: state.stocks.map((x) => (x.id === id ? { ...x, ...updates } : x)),
        })),
      removeStock: (id) =>
        set((state) => ({
          stocks: state.stocks.filter((x) => x.id !== id),
        })),
      toggleSparplan: (id, sparplan) =>
        set((state) => ({
          stocks: state.stocks.map((x) =>
            x.id === id ? { ...x, sparplan: { ...x.sparplan, ...sparplan } as any } : x
          ),
        })),
      addPortfolioSnapshot: (snapshot) =>
        set((state) => ({
          portfolioHistory: [
            ...state.portfolioHistory,
            { ...snapshot, timestamp: Date.now() },
          ],
        })),
      updatePortfolioSnapshot: (snapshot) =>
        set((state) => {
          // Find existing snapshot for the same date and owner
          const existingIndex = state.portfolioHistory.findIndex(
            s => s.dateISO === snapshot.dateISO && s.owner === snapshot.owner
          );
          
          if (existingIndex >= 0) {
            // Update existing snapshot
            const updated = [...state.portfolioHistory];
            updated[existingIndex] = { ...snapshot, timestamp: Date.now() };
            return { portfolioHistory: updated };
          } else {
            // Add new snapshot
            return {
              portfolioHistory: [
                ...state.portfolioHistory,
                { ...snapshot, timestamp: Date.now() },
              ],
            };
          }
        }),
      addGoal: (input) =>
        set((state) => ({
          goals: [...state.goals, { ...input, id: generateId("goal") }],
        })),
      updateGoal: (id, updates) =>
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        })),
      removeGoal: (id) =>
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
        })),
      setAssumptions: (updates) =>
        set((state) => ({
          assumptions: { ...state.assumptions, ...updates },
        })),
      setCustomAssetReturn: (symbol, expectedReturn) =>
        set((state) => ({
          customAssetReturns: { ...state.customAssetReturns, [symbol]: expectedReturn },
        })),
      clearCustomAssetReturn: (symbol) =>
        set((state) => {
          const { [symbol]: _, ...rest } = state.customAssetReturns;
          return { customAssetReturns: rest };
        }),
      resetAll: () => set(() => ({ ...defaultState })),
      replaceWithCloudData: (data) =>
        set((state) => {
          const normalizedAccounts =
            data.portfolioAccounts && data.portfolioAccounts.length > 0
              ? data.portfolioAccounts
              : state.portfolioAccounts && state.portfolioAccounts.length > 0
              ? state.portfolioAccounts
              : defaultState.portfolioAccounts;
          return {
            accounts: data.accounts ?? [],
            portfolioAccounts: normalizedAccounts,
            incomes: data.incomes ?? [],
            expenses: data.expenses ?? [],
            stocks: (data.stocks ?? []).map((stock) => ({
              ...stock,
              accountId: stock.accountId ?? normalizedAccounts[0]?.id ?? defaultState.portfolioAccounts[0].id,
            })),
          portfolioHistory: (data.portfolioHistory ?? []).map((snapshot) => ({
            ...snapshot,
            timestamp: snapshot.timestamp ?? Date.now(),
          })),
          goals: data.goals ?? [],
          assumptions: data.assumptions
            ? { ...state.assumptions, ...data.assumptions, currency: "EUR" }
            : { ...state.assumptions, currency: "EUR" },
          customAssetReturns: data.customAssetReturns ?? {},
          cloudSyncToken: Date.now(),
          taxScenarios: Array.isArray(data.taxScenarios)
            ? data.taxScenarios.map((scenario) => normalizeTaxScenario(scenario))
            : state.taxScenarios ?? [],
          documents: Array.isArray(data.documents)
            ? data.documents
                .map((doc) => ({
                  ...doc,
                  uploadedAt: doc.uploadedAt ?? new Date().toISOString(),
                }))
                .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
            : state.documents ?? [],
          mortgageScenarios: Array.isArray(data.mortgageScenarios)
            ? data.mortgageScenarios.map((scenario) => normalizeMortgageScenario(scenario))
            : state.mortgageScenarios ?? [],
          };
        }),
      addTaxScenario: (scenario) =>
        set((state) => ({
          taxScenarios: [...state.taxScenarios, normalizeTaxScenario(scenario)],
        })),
      updateTaxScenario: (id, updates) =>
        set((state) => ({
          taxScenarios: state.taxScenarios.map((scenario) =>
            scenario.id === id ? normalizeTaxScenario({ ...scenario, ...updates, id: scenario.id }) : scenario
          ),
        })),
      removeTaxScenario: (id) =>
        set((state) => ({
          taxScenarios: state.taxScenarios.filter((scenario) => scenario.id !== id),
        })),
      duplicateTaxScenario: (id) =>
        set((state) => {
          const scenario = state.taxScenarios.find((s) => s.id === id);
          if (!scenario) {
            return {} as Partial<FinanceStore>;
          }
          const clone = normalizeTaxScenario({
            ...scenario,
            id: undefined,
            name: `${scenario.name} (Copy)`,
          });
          return { taxScenarios: [...state.taxScenarios, clone] };
        }),
      addDocument: (document) =>
        set((state) => ({
          documents: [...state.documents, document].sort(
            (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
          ),
        })),
      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents
            .map((doc) => (doc.id === id ? { ...doc, ...updates } : doc))
            .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
        })),
      removeDocument: (id) =>
        set((state) => ({
          documents: state.documents.filter((doc) => doc.id !== id),
        })),
      addMortgageScenario: (scenario) =>
        set((state) => ({
          mortgageScenarios: [...state.mortgageScenarios, normalizeMortgageScenario(scenario)],
        })),
      updateMortgageScenario: (id, updates) =>
        set((state) => ({
          mortgageScenarios: state.mortgageScenarios.map((scenario) =>
            scenario.id === id ? normalizeMortgageScenario({ ...scenario, ...updates, id }) : scenario
          ),
        })),
      removeMortgageScenario: (id) =>
        set((state) => ({
          mortgageScenarios: state.mortgageScenarios.filter((scenario) => scenario.id !== id),
        })),
      duplicateMortgageScenario: (id) =>
        set((state) => {
          const scenario = state.mortgageScenarios.find((s) => s.id === id);
          if (!scenario) {
            return {} as Partial<FinanceStore>;
          }
          const clone = normalizeMortgageScenario({
            ...scenario,
            id: undefined,
            name: `${scenario.name} (Copy)`,
          });
          return { mortgageScenarios: [...state.mortgageScenarios, clone] };
        }),
    }),
    {
      name: "finance-app-v1",
      version: 15, // v15 introduces mortgage tracker
      partialize: (state) => state,
      migrate: (persistedState: any, version: number) => {
        if (version < 2) {
          // Clear default accounts for version 2
          persistedState = {
            ...persistedState,
            accounts: [],
          };
        }
        if (version < 3) {
          // Add owner field to all existing stocks (default to Simon)
          const stocks = persistedState.stocks || [];
          persistedState = {
            ...persistedState,
            stocks: stocks.map((stock: any) => ({
              ...stock,
              owner: stock.owner || "simon",
            })),
          };
        }
        if (version < 4) {
          // Clear old portfolio history (new format requires owner field)
          persistedState = {
            ...persistedState,
            portfolioHistory: [],
          };
        }
        if (version < 5) {
          // Add owner field to all existing expenses (default to Simon)
          const expenses = persistedState.expenses || [];
          persistedState = {
            ...persistedState,
            expenses: expenses.map((expense: any) => ({
              ...expense,
              owner: expense.owner || "simon",
            })),
          };
        }
        if (version < 6) {
          // Initialize goals array
          persistedState = {
            ...persistedState,
            goals: [],
          };
        }
        if (version < 7) {
          // Initialize customAssetReturns
          persistedState = {
            ...persistedState,
            customAssetReturns: {},
          };
        }
        if (version < 8) {
          // Add owner field to all existing incomes (default to Simon)
          const incomes = persistedState.incomes || [];
          persistedState = {
            ...persistedState,
            incomes: incomes.map((income: any) => ({
              ...income,
              owner: income.owner || "simon",
            })),
          };
        }
        if (version < 9) {
          // Clear historical portfolio snapshots so charts rebuild with investment-only data
          persistedState = {
            ...persistedState,
            portfolioHistory: [],
          };
        }
        if (version < 10) {
          const defaultExpenseIds = new Set(["exp_rent", "exp_groceries", "exp_misc"]);
          const defaultIncomeIds = new Set(["inc_salary"]);

          const expenses = persistedState.expenses || [];
          const incomes = persistedState.incomes || [];

          persistedState = {
            ...persistedState,
            expenses: expenses.filter((expense: any) => !defaultExpenseIds.has(expense.id)),
            incomes: incomes.filter((income: any) => !defaultIncomeIds.has(income.id)),
          };
        }
        if (version < 11) {
          persistedState = {
            ...persistedState,
            taxScenarios: (persistedState.taxScenarios || []).map((scenario: Partial<GermanTaxScenario>) =>
              normalizeTaxScenario(scenario)
            ),
          };
        }
        if (version < 12) {
          persistedState = {
            ...persistedState,
            documents: [],
          };
        }
        if (version < 13) {
          persistedState = {
            ...persistedState,
            assumptions: {
              ...(persistedState.assumptions || {}),
              currency: "EUR",
            },
          };
        }
        if (version < 14) {
          const existingAccounts = persistedState.portfolioAccounts;
          const normalizedAccounts =
            existingAccounts && existingAccounts.length > 0
              ? existingAccounts
              : defaultState.portfolioAccounts;
          persistedState = {
            ...persistedState,
            portfolioAccounts: normalizedAccounts,
            stocks: (persistedState.stocks || []).map((stock: any) => ({
              ...stock,
              accountId:
                stock.accountId ??
                normalizedAccounts[0]?.id ??
                defaultState.portfolioAccounts[0].id,
            })),
          };
        }
        if (version < 15) {
          persistedState = {
            ...persistedState,
            mortgageScenarios: [],
          };
        }
        return persistedState;
      },
    }
  )
);


