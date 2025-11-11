import { create } from "zustand";
import { persist } from "zustand/middleware";
import { addMonths, startOfMonth } from "date-fns";
import { Assumptions, Account, ExpenseItem, FinanceState, IncomeItem, StockHolding } from "@/types/finance";

function firstOfCurrentMonthISO(): string {
  const d = startOfMonth(new Date());
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  return `${y}-${m}-01`;
}

function generateId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
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
}

const defaultState: FinanceState & { customAssetReturns: Record<string, number> } = {
  accounts: [],
  incomes: [
    {
      id: "inc_salary",
      name: "Salary",
      amount: 5000,
      frequency: "monthly",
      startDateISO: firstOfCurrentMonthISO(),
      growthAnnual: 0.03,
      owner: "simon",
    },
  ],
  expenses: [
    {
      id: "exp_rent",
      name: "Rent",
      amount: 1500,
      frequency: "monthly",
      startDateISO: firstOfCurrentMonthISO(),
      growthAnnual: 0,
      owner: "simon",
    },
    {
      id: "exp_groceries",
      name: "Groceries",
      amount: 600,
      frequency: "monthly",
      startDateISO: firstOfCurrentMonthISO(),
      growthAnnual: 0.02,
      owner: "simon",
    },
    {
      id: "exp_misc",
      name: "Miscellaneous",
      amount: 400,
      frequency: "monthly",
      startDateISO: firstOfCurrentMonthISO(),
      growthAnnual: 0.02,
      owner: "simon",
    },
  ],
  stocks: [], // Both stocks and crypto stored here
  portfolioHistory: [],
  goals: [],
  assumptions: {
    startDateISO: firstOfCurrentMonthISO(),
    projectionYears: 30,
    inflationAnnual: 0.02,
    taxRateEffective: 0.25,
    currency: "USD",
  },
  customAssetReturns: {}, // Persisted custom returns for projection calculations
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
        set((state) => ({
          stocks: [...state.stocks, { ...input, id: generateId("stock") }],
        })),
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
    }),
    {
      name: "finance-app-v1",
      version: 9, // v9 clears legacy portfolio history for new investment-only charts
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
        return persistedState;
      },
    }
  )
);


