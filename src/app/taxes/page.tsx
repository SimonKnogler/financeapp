"use client";

import { useState } from "react";
import { calculateGermanTax, estimateSocialContributions, type GermanTaxInput, type TaxClass } from "@/lib/tax/germany";
import { formatCurrency } from "@/lib/privacy";
import { useFinanceStore } from "@/store/finance-store";
import { Calculator, Plus, Trash2, Copy } from "lucide-react";

interface TaxScenario {
  id: string;
  name: string;
  input: GermanTaxInput;
}

export default function TaxesPage() {
  const privacyMode = useFinanceStore((s) => s.privacyMode);

  const [scenarios, setScenarios] = useState<TaxScenario[]>([
    {
      id: "default",
      name: "Default Scenario",
      input: {
        taxClass: 1,
        grossSalary: 60000,
        solidarityEnabled: true,
        churchTaxEnabled: false,
      },
    },
  ]);

  const [activeScenarioId, setActiveScenarioId] = useState("default");
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0];

  const updateScenarioInput = (input: Partial<GermanTaxInput>) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === activeScenarioId ? { ...s, input: { ...s.input, ...input } } : s))
    );
  };

  const updateScenarioName = (name: string) => {
    setScenarios((prev) => prev.map((s) => (s.id === activeScenarioId ? { ...s, name } : s)));
  };

  const addScenario = () => {
    const newId = `scenario_${Date.now()}`;
    setScenarios((prev) => [
      ...prev,
      {
        id: newId,
        name: `Scenario ${prev.length + 1}`,
        input: {
          taxClass: 1,
          grossSalary: 60000,
          solidarityEnabled: true,
          churchTaxEnabled: false,
        },
      },
    ]);
    setActiveScenarioId(newId);
  };

  const duplicateScenario = () => {
    const newId = `scenario_${Date.now()}`;
    setScenarios((prev) => [
      ...prev,
      {
        id: newId,
        name: `${activeScenario.name} (Copy)`,
        input: { ...activeScenario.input },
      },
    ]);
    setActiveScenarioId(newId);
  };

  const deleteScenario = () => {
    if (scenarios.length === 1) return;
    const index = scenarios.findIndex((s) => s.id === activeScenarioId);
    const nextIndex = index > 0 ? index - 1 : 1;
    setScenarios((prev) => prev.filter((s) => s.id !== activeScenarioId));
    setActiveScenarioId(scenarios[nextIndex].id);
  };

  const autoCalculateSocial = () => {
    const gross = activeScenario.input.grossSalary ?? 0;
    if (gross > 0) {
      const contrib = estimateSocialContributions(gross);
      updateScenarioInput({
        pensionContribution: contrib.pensionContribution,
        healthContribution: contrib.healthContribution,
        unemploymentContribution: contrib.unemploymentContribution,
        careContribution: contrib.careContribution,
      });
    }
  };

  const result = calculateGermanTax(activeScenario.input);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">German Tax Calculator</h1>
        <div className="flex gap-2">
          <button
            onClick={duplicateScenario}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
          >
            <Copy size={16} />
            Duplicate
          </button>
          <button
            onClick={addScenario}
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-blue-500 text-white hover:bg-blue-600"
          >
            <Plus size={16} />
            New Scenario
          </button>
        </div>
      </div>

      {/* Scenario Tabs */}
      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
        {scenarios.map((scenario) => (
          <button
            key={scenario.id}
            onClick={() => setActiveScenarioId(scenario.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeScenarioId === scenario.id
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
            }`}
          >
            {scenario.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Panel */}
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={activeScenario.name}
                onChange={(e) => updateScenarioName(e.target.value)}
                className="text-lg font-semibold bg-transparent border-none outline-none"
              />
              {scenarios.length > 1 && (
                <button
                  onClick={deleteScenario}
                  className="text-red-500 hover:text-red-600 p-1"
                  title="Delete scenario"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Tax Class & Year */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Tax Class</label>
                <select
                  value={activeScenario.input.taxClass ?? 1}
                  onChange={(e) => updateScenarioInput({ taxClass: parseInt(e.target.value) as TaxClass })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                >
                  <option value={1}>Class I (Single)</option>
                  <option value={2}>Class II (Single parent)</option>
                  <option value={3}>Class III (Married, higher earner)</option>
                  <option value={4}>Class IV (Married, equal)</option>
                  <option value={5}>Class V (Married, lower earner)</option>
                  <option value={6}>Class VI (Second job)</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Year</label>
                <input
                  type="number"
                  value={activeScenario.input.year ?? new Date().getFullYear()}
                  onChange={(e) => updateScenarioInput({ year: parseInt(e.target.value) || new Date().getFullYear() })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                />
              </div>
            </div>

            {/* Married Splitting */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={activeScenario.input.marriedSplitting ?? false}
                onChange={(e) => updateScenarioInput({ marriedSplitting: e.target.checked })}
                className="rounded"
              />
              <span className="text-sm">Married Splitting (Ehegattensplitting)</span>
            </label>

            {/* Income */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Income</div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Gross Salary (yearly)</label>
                <input
                  type="number"
                  value={activeScenario.input.grossSalary ?? 0}
                  onChange={(e) => updateScenarioInput({ grossSalary: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                  placeholder="60000"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Bonus (optional)</label>
                <input
                  type="number"
                  value={activeScenario.input.bonus ?? 0}
                  onChange={(e) => updateScenarioInput({ bonus: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Self-Employed Income (optional)</label>
                <input
                  type="number"
                  value={activeScenario.input.selfEmployedIncome ?? 0}
                  onChange={(e) => updateScenarioInput({ selfEmployedIncome: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Capital Gains (optional)</label>
                <input
                  type="number"
                  value={activeScenario.input.capitalGains ?? 0}
                  onChange={(e) => updateScenarioInput({ capitalGains: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Dividends (optional)</label>
                <input
                  type="number"
                  value={activeScenario.input.dividends ?? 0}
                  onChange={(e) => updateScenarioInput({ dividends: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Deductions</div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Work-Related Expenses (Werbungskosten)</label>
                <input
                  type="number"
                  value={activeScenario.input.workRelatedExpenses ?? 1230}
                  onChange={(e) => updateScenarioInput({ workRelatedExpenses: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                  placeholder="1230 (flat rate)"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Special Expenses (Sonderausgaben)</label>
                <input
                  type="number"
                  value={activeScenario.input.specialExpenses ?? 0}
                  onChange={(e) => updateScenarioInput({ specialExpenses: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Surcharges */}
            <div className="space-y-3">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Surcharges</div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeScenario.input.solidarityEnabled ?? true}
                  onChange={(e) => updateScenarioInput({ solidarityEnabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Solidarity Surcharge (Solidaritätszuschlag)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeScenario.input.churchTaxEnabled ?? false}
                  onChange={(e) => updateScenarioInput({ churchTaxEnabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm">Church Tax (Kirchensteuer)</span>
              </label>
              {activeScenario.input.churchTaxEnabled && (
                <div>
                  <label className="text-sm text-zinc-600 dark:text-zinc-400">Church Tax Rate</label>
                  <select
                    value={(activeScenario.input.churchTaxRate ?? 0.09) * 100}
                    onChange={(e) => updateScenarioInput({ churchTaxRate: parseFloat(e.target.value) / 100 })}
                    className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                  >
                    <option value={9}>9% (most states)</option>
                    <option value={8}>8% (BY, BW)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Social Contributions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Social Contributions (optional)</div>
                <button
                  onClick={autoCalculateSocial}
                  className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                >
                  <Calculator size={12} />
                  Auto-calculate
                </button>
              </div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Pension (Rentenversicherung)</label>
                <input
                  type="number"
                  value={activeScenario.input.pensionContribution ?? 0}
                  onChange={(e) => updateScenarioInput({ pensionContribution: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Health (Krankenversicherung)</label>
                <input
                  type="number"
                  value={activeScenario.input.healthContribution ?? 0}
                  onChange={(e) => updateScenarioInput({ healthContribution: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Unemployment (Arbeitslosenversicherung)</label>
                <input
                  type="number"
                  value={activeScenario.input.unemploymentContribution ?? 0}
                  onChange={(e) => updateScenarioInput({ unemploymentContribution: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="text-sm text-zinc-600 dark:text-zinc-400">Care (Pflegeversicherung)</label>
                <input
                  type="number"
                  value={activeScenario.input.careContribution ?? 0}
                  onChange={(e) => updateScenarioInput({ careContribution: parseFloat(e.target.value) || 0 })}
                  className="w-full mt-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-transparent px-2 py-1.5"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-4">
            <div className="text-lg font-semibold">Tax Calculation Results</div>

            {/* Net Income */}
            <div className="rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4">
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-1">Net Income (Yearly)</div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(result.netIncome, "EUR", privacyMode)}
              </div>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                {formatCurrency(result.netIncome / 12, "EUR", privacyMode)}/month
              </div>
            </div>

            {/* Tax Breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Gross Income</span>
                <span className="font-medium">{formatCurrency(result.totalGrossIncome, "EUR", privacyMode)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Deductions</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  -{formatCurrency(result.totalDeductions, "EUR", privacyMode)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t border-zinc-200 dark:border-zinc-700 pt-2">
                <span>Taxable Income</span>
                <span>{formatCurrency(result.taxableIncome, "EUR", privacyMode)}</span>
              </div>
            </div>

            {/* Tax Components */}
            <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Income Tax</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  -{formatCurrency(result.incomeTax, "EUR", privacyMode)}
                </span>
              </div>
              {result.solidarityTax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Solidarity Surcharge</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{formatCurrency(result.solidarityTax, "EUR", privacyMode)}
                  </span>
                </div>
              )}
              {result.churchTax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600 dark:text-zinc-400">Church Tax</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -{formatCurrency(result.churchTax, "EUR", privacyMode)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-medium border-t border-zinc-200 dark:border-zinc-700 pt-2">
                <span>Total Tax</span>
                <span className="text-red-600 dark:text-red-400">
                  -{formatCurrency(result.totalTax, "EUR", privacyMode)}
                </span>
              </div>
            </div>

            {/* Social Contributions */}
            {result.totalSocialContributions > 0 && (
              <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <div className="flex justify-between text-sm font-medium">
                  <span>Social Contributions</span>
                  <span className="text-red-600 dark:text-red-400">
                    -{formatCurrency(result.totalSocialContributions, "EUR", privacyMode)}
                  </span>
                </div>
              </div>
            )}

            {/* Tax Rates */}
            <div className="grid grid-cols-2 gap-4 border-t border-zinc-200 dark:border-zinc-700 pt-4">
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Effective Tax Rate</div>
                <div className="text-xl font-semibold">{privacyMode ? "••.•%" : `${result.effectiveTaxRate.toFixed(1)}%`}</div>
              </div>
              <div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">Marginal Tax Rate</div>
                <div className="text-xl font-semibold">{privacyMode ? "••.•%" : `${result.marginalTaxRate.toFixed(1)}%`}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scenario Comparison */}
      {scenarios.length > 1 && (
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
          <div className="text-lg font-semibold mb-4">Scenario Comparison</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left p-2 font-medium">Scenario</th>
                  <th className="text-right p-2 font-medium">Gross Income</th>
                  <th className="text-right p-2 font-medium">Total Tax</th>
                  <th className="text-right p-2 font-medium">Net Income</th>
                  <th className="text-right p-2 font-medium">Effective Rate</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario) => {
                  const res = calculateGermanTax(scenario.input);
                  return (
                    <tr
                      key={scenario.id}
                      className={`border-b border-zinc-100 dark:border-zinc-800 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${
                        scenario.id === activeScenarioId ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                      onClick={() => setActiveScenarioId(scenario.id)}
                    >
                      <td className="p-2">{scenario.name}</td>
                      <td className="p-2 text-right">{formatCurrency(res.totalGrossIncome, "EUR", privacyMode)}</td>
                      <td className="p-2 text-right text-red-600 dark:text-red-400">
                        {formatCurrency(res.totalTax, "EUR", privacyMode)}
                      </td>
                      <td className="p-2 text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(res.netIncome, "EUR", privacyMode)}
                      </td>
                      <td className="p-2 text-right">{privacyMode ? "••.•%" : `${res.effectiveTaxRate.toFixed(1)}%`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
