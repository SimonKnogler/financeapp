"use client";

import { useFinanceStore } from "@/store/finance-store";

export function ImportExport() {
  const state = useFinanceStore();
  const resetAll = useFinanceStore((s) => s.resetAll);

  function handleExport() {
    const dataStr = JSON.stringify(
      {
        accounts: state.accounts,
        incomes: state.incomes,
        expenses: state.expenses,
        stocks: state.stocks,
        assumptions: state.assumptions,
      },
      null,
      2
    );
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finances-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (parsed && typeof parsed === "object") {
          // Overwrite store by clearing and then merging
          resetAll();
          // Using direct set is not exposed; mutate via actions
          // Accounts
          if (Array.isArray(parsed.accounts)) {
            parsed.accounts.forEach((a: any) => {
              const { id, ...rest } = a;
              useFinanceStore.getState().addAccount(rest);
            });
          }
          if (Array.isArray(parsed.incomes)) {
            parsed.incomes.forEach((x: any) => {
              const { id, ...rest } = x;
              useFinanceStore.getState().addIncome(rest);
            });
          }
          if (Array.isArray(parsed.expenses)) {
            parsed.expenses.forEach((x: any) => {
              const { id, ...rest } = x;
              useFinanceStore.getState().addExpense(rest);
            });
          }
          if (Array.isArray(parsed.stocks)) {
            parsed.stocks.forEach((x: any) => {
              const { id, ...rest } = x;
              useFinanceStore.getState().addStock(rest);
            });
          }
          if (parsed.assumptions) {
            useFinanceStore.getState().setAssumptions(parsed.assumptions);
          }
          alert("Import complete.");
        }
      } catch (e) {
        alert("Invalid file.");
      } finally {
        ev.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleExport}
        className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        Export JSON
      </button>
      <label className="rounded-md border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-sm cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800">
        Import JSON
        <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
      </label>
    </div>
  );
}


