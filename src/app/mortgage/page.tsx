"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFinanceStore } from "@/store/finance-store";
import { calculateMortgageProjection, buildMortgageCsv } from "@/lib/mortgage";
import { formatCurrency } from "@/lib/privacy";
import type { MortgageScenario, MortgageRateAdjustment } from "@/types/finance";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { Plus, Copy, Trash2, Download, Percent } from "lucide-react";

function generateClientId(prefix: string) {
  if (typeof window !== "undefined" && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function scenarioLabel(index: number) {
  return `Financing ${index}`;
}

function formatDateLabel(value: string) {
  if (!value) return "";
  const d = new Date(value);
  return `${d.getMonth() + 1}/${d.getFullYear()}`;
}

export default function MortgagePage() {
  const mortgageScenarios = useFinanceStore((state) => state.mortgageScenarios);
  const addMortgageScenario = useFinanceStore((state) => state.addMortgageScenario);
  const updateMortgageScenario = useFinanceStore((state) => state.updateMortgageScenario);
  const removeMortgageScenario = useFinanceStore((state) => state.removeMortgageScenario);
  const duplicateMortgageScenario = useFinanceStore((state) => state.duplicateMortgageScenario);
  const privacyMode = useFinanceStore((state) => state.privacyMode);

  const [activeId, setActiveId] = useState<string | null>(mortgageScenarios[0]?.id ?? null);
  const previousLength = useRef(mortgageScenarios.length);

  useEffect(() => {
    if (mortgageScenarios.length === 0) {
      setActiveId(null);
    } else if (!activeId) {
      setActiveId(mortgageScenarios[0].id);
    }
  }, [mortgageScenarios, activeId]);

  useEffect(() => {
    if (mortgageScenarios.length > previousLength.current) {
      setActiveId(mortgageScenarios[mortgageScenarios.length - 1]?.id ?? null);
    }
    previousLength.current = mortgageScenarios.length;
  }, [mortgageScenarios]);

  const activeScenario =
    mortgageScenarios.find((scenario) => scenario.id === activeId) ?? mortgageScenarios[0] ?? null;

  const projection = useMemo(
    () => (activeScenario ? calculateMortgageProjection(activeScenario) : null),
    [activeScenario]
  );

  const handleScenarioField = (field: keyof MortgageScenario, value: number | string) => {
    if (!activeScenario) return;
    const updates: Partial<MortgageScenario> = { [field]: value } as Partial<MortgageScenario>;
    if (field === "purchasePrice" || field === "downPayment") {
      const purchase =
        field === "purchasePrice" ? Number(value) : activeScenario.purchasePrice;
      const down = field === "downPayment" ? Number(value) : activeScenario.downPayment;
      updates.loanAmount = Math.max(purchase - down, 0);
    }
    updateMortgageScenario(activeScenario.id, updates);
  };

  const handleRateAdjustmentChange = (
    index: number,
    patch: Partial<MortgageRateAdjustment>
  ) => {
    if (!activeScenario) return;
    const adjustments = [...(activeScenario.rateAdjustments ?? [])];
    const current = adjustments[index];
    if (!current) return;
    adjustments[index] = { ...current, ...patch };
    updateMortgageScenario(activeScenario.id, { rateAdjustments: adjustments });
  };

  const handleAddRateAdjustment = () => {
    if (!activeScenario) return;
    const adjustments = [...(activeScenario.rateAdjustments ?? [])];
    adjustments.push({
      id: generateClientId("rate"),
      year: adjustments.length + activeScenario.fixationYears + 1,
      ratePercent: activeScenario.interestRate,
    });
    updateMortgageScenario(activeScenario.id, { rateAdjustments: adjustments });
  };

  const handleRemoveRateAdjustment = (id: string) => {
    if (!activeScenario) return;
    const adjustments = (activeScenario.rateAdjustments ?? []).filter((adj) => adj.id !== id);
    updateMortgageScenario(activeScenario.id, { rateAdjustments: adjustments });
  };

  const handleAddScenario = () => {
    const newIndex = mortgageScenarios.length + 1;
    addMortgageScenario({
      id: generateClientId("mort"),
      name: scenarioLabel(newIndex),
    });
  };

  const handleDuplicateScenario = (id: string) => {
    duplicateMortgageScenario(id);
  };

  const handleDeleteScenario = (id: string) => {
    if (!confirm("Finanzierung wirklich löschen?")) return;
    removeMortgageScenario(id);
    if (activeId === id) {
      setActiveId(null);
    }
  };

  const handleDownloadCsv = () => {
    if (!activeScenario || !projection) return;
    const csv = buildMortgageCsv(projection.schedule, activeScenario.name);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeScenario.name.replace(/\s+/g, "_").toLowerCase()}_schedule.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Baufinanzierung</h1>
          <p className="text-sm text-zinc-500">
            Vergleiche Szenarien für Darlehen, Tilgung und Zinsänderungen.
          </p>
        </div>
        <button
          onClick={handleAddScenario}
          className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium shadow-sm hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          Neues Szenario
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-3">
          {mortgageScenarios.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 p-4 text-sm text-zinc-500 dark:border-zinc-700">
              Noch keine Szenarien. Lege eines über „Neues Szenario“ an.
            </div>
          ) : (
            mortgageScenarios.map((scenario, index) => (
              <button
                key={scenario.id}
                onClick={() => setActiveId(scenario.id)}
                className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                  scenario.id === activeScenario?.id
                    ? "border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20"
                    : "border-zinc-200 hover:border-blue-200 dark:border-zinc-700 dark:hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{scenario.name || scenarioLabel(index + 1)}</div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDuplicateScenario(scenario.id);
                      }}
                      className="rounded p-1 hover:text-blue-500"
                      title="Duplizieren"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteScenario(scenario.id);
                      }}
                      className="rounded p-1 hover:text-red-500"
                      title="Löschen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  Darlehen:{" "}
                  {formatCurrency(scenario.loanAmount, "EUR", privacyMode)}
                </div>
              </button>
            ))
          )}
        </aside>

        <div className="space-y-6">
          {activeScenario ? (
            <>
              <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-100">
                  Szenario bearbeiten
                </h2>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm">
                    <span className="text-zinc-500">Name</span>
                    <input
                      type="text"
                      value={activeScenario.name}
                      onChange={(e) => handleScenarioField("name", e.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-zinc-500">Startdatum</span>
                    <input
                      type="date"
                      value={activeScenario.startDateISO ?? ""}
                      onChange={(e) => handleScenarioField("startDateISO", e.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-zinc-500">Kaufpreis</span>
                    <input
                      type="number"
                      value={activeScenario.purchasePrice}
                      onChange={(e) => handleScenarioField("purchasePrice", Number(e.target.value))}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-zinc-500">Eigenkapital</span>
                    <input
                      type="number"
                      value={activeScenario.downPayment}
                      onChange={(e) => handleScenarioField("downPayment", Number(e.target.value))}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <div>
                    <div className="text-xs uppercase text-zinc-500">Darlehenssumme</div>
                    <div className="text-xl font-semibold">
                      {formatCurrency(activeScenario.loanAmount, "EUR", privacyMode)}
                    </div>
                  </div>
                  <label className="text-sm">
                    <span className="text-zinc-500">Sollzins (p.a.)</span>
                    <input
                      type="number"
                      step="0.01"
                      value={activeScenario.interestRate}
                      onChange={(e) => handleScenarioField("interestRate", Number(e.target.value))}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-zinc-500">Tilgungsart</span>
                    <select
                      value={activeScenario.paymentType}
                      onChange={(e) => handleScenarioField("paymentType", e.target.value)}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    >
                      <option value="annuity">Annuität (fixe Rate)</option>
                      <option value="custom">Variable Rate</option>
                    </select>
                  </label>
                  {activeScenario.paymentType === "annuity" ? (
                    <label className="text-sm">
                      <span className="text-zinc-500">Anfängliche Tilgung (%)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={activeScenario.initialRepaymentPercent ?? 2}
                        onChange={(e) =>
                          handleScenarioField("initialRepaymentPercent", Number(e.target.value))
                        }
                        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                  ) : (
                    <label className="text-sm">
                      <span className="text-zinc-500">Monatsrate</span>
                      <input
                        type="number"
                        value={activeScenario.monthlyPayment ?? 0}
                        onChange={(e) =>
                          handleScenarioField("monthlyPayment", Number(e.target.value))
                        }
                        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                      />
                    </label>
                  )}
                  <label className="text-sm">
                    <span className="text-zinc-500">Laufzeit (Jahre)</span>
                    <input
                      type="number"
                      value={activeScenario.termYears}
                      onChange={(e) => handleScenarioField("termYears", Number(e.target.value))}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-zinc-500">Zinsbindung (Jahre)</span>
                    <input
                      type="number"
                      value={activeScenario.fixationYears}
                      onChange={(e) => handleScenarioField("fixationYears", Number(e.target.value))}
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-zinc-500">Sondertilgung (jährlich)</span>
                    <input
                      type="number"
                      value={activeScenario.extraPaymentAnnual ?? 0}
                      onChange={(e) =>
                        handleScenarioField("extraPaymentAnnual", Number(e.target.value))
                      }
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="text-zinc-500">Sondertilgung (monatlich)</span>
                    <input
                      type="number"
                      value={activeScenario.extraPaymentMonthly ?? 0}
                      onChange={(e) =>
                        handleScenarioField("extraPaymentMonthly", Number(e.target.value))
                      }
                      className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                    />
                  </label>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-100">
                      Variable Zinssätze
                    </div>
                    <button
                      type="button"
                      onClick={handleAddRateAdjustment}
                      className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                      <Percent className="h-3.5 w-3.5" />
                      Anpassung
                    </button>
                  </div>
                  {(activeScenario.rateAdjustments ?? []).length === 0 ? (
                    <div className="text-xs text-zinc-500">
                      Keine zusätzlichen Zinsschritte hinterlegt.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(activeScenario.rateAdjustments ?? []).map((adj, index) => (
                        <div
                          key={adj.id}
                          className="flex flex-wrap items-center gap-2 rounded-md border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
                        >
                          <span>ab Jahr</span>
                          <input
                            type="number"
                            min={1}
                            value={adj.year}
                            onChange={(e) =>
                              handleRateAdjustmentChange(index, { year: Number(e.target.value) })
                            }
                            className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          />
                          <span>Rate</span>
                          <input
                            type="number"
                            step="0.01"
                            value={adj.ratePercent}
                            onChange={(e) =>
                              handleRateAdjustmentChange(index, {
                                ratePercent: Number(e.target.value),
                              })
                            }
                            className="w-24 rounded border border-zinc-300 px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                          />
                          <span>%</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRateAdjustment(adj.id)}
                            className="ml-auto text-xs text-red-500 hover:underline"
                          >
                            Entfernen
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {projection && (
                <>
                  <section className="grid gap-4 md:grid-cols-4">
                    <MetricCard
                      label="Monatsrate"
                      value={formatCurrency(projection.metrics.monthlyPayment, "EUR", privacyMode)}
                      helper={
                        activeScenario.paymentType === "annuity"
                          ? "aus Zins + Tilgung"
                          : "benutzerdefiniert"
                      }
                    />
                    <MetricCard
                      label="Gesamtzinsen"
                      value={formatCurrency(projection.metrics.totalInterest, "EUR", privacyMode)}
                      helper="über komplette Laufzeit"
                    />
                    <MetricCard
                      label="Restschuld nach Bindung"
                      value={formatCurrency(
                        projection.metrics.balanceAfterFixation,
                        "EUR",
                        privacyMode
                      )}
                      helper={`${activeScenario.fixationYears} Jahre`}
                    />
                    <MetricCard
                      label="Voraussichtliche Laufzeit"
                      value={
                        projection.metrics.payoffMonth
                          ? `${(projection.metrics.payoffMonth / 12).toFixed(1)} Jahre`
                          : `${activeScenario.termYears} Jahre`
                      }
                      helper={
                        projection.metrics.payoffDate
                          ? `Fertig: ${projection.metrics.payoffDate}`
                          : "innerhalb Laufzeit"
                      }
                    />
                  </section>

                  <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-zinc-700 dark:text-zinc-100">
                          Tilgungsverlauf
                        </div>
                        <p className="text-xs text-zinc-500">
                          Restschuldverlauf inkl. Zins- und Tilgungsanteil
                        </p>
                      </div>
                      <button
                        onClick={handleDownloadCsv}
                        className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                      >
                        <Download className="h-4 w-4" />
                        CSV
                      </button>
                    </div>
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={projection.schedule}>
                          <defs>
                            <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                          <XAxis
                            dataKey="date"
                            tickFormatter={formatDateLabel}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(value) =>
                              privacyMode ? "•••" : `${(value / 1000).toFixed(0)}k`
                            }
                          />
                          <Tooltip
                            formatter={(value: number) =>
                              privacyMode ? "•••" : formatCurrency(value, "EUR", false)
                            }
                            labelFormatter={(label) => formatDateLabel(label as string)}
                          />
                          <Area
                            type="monotone"
                            dataKey="balance"
                            stroke="#2563eb"
                            fill="url(#balanceGradient)"
                            name="Restschuld"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-6 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={projection.yearly}>
                          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                          <XAxis dataKey="year" />
                          <YAxis
                            tickFormatter={(value) =>
                              privacyMode ? "•••" : `${(value / 1000).toFixed(0)}k`
                            }
                          />
                          <Tooltip
                            formatter={(value: number, name) => [
                              privacyMode ? "•••" : formatCurrency(value, "EUR", false),
                              name === "interestPaid" ? "Zinsen" : "Tilgung",
                            ]}
                          />
                          <Bar dataKey="interestPaid" stackId="a" fill="#fb7185" name="Zinsen" />
                          <Bar dataKey="principalPaid" stackId="a" fill="#34d399" name="Tilgung" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                    <div className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-100">
                      Jahresübersicht
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-xs uppercase tracking-wide text-zinc-500">
                          <tr>
                            <th className="px-3 py-2 text-left">Jahr</th>
                            <th className="px-3 py-2 text-right">Zinsen</th>
                            <th className="px-3 py-2 text-right">Tilgung</th>
                            <th className="px-3 py-2 text-right">Sondertilgung</th>
                            <th className="px-3 py-2 text-right">Restschuld</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {projection.yearly.map((year) => (
                            <tr key={year.year}>
                              <td className="px-3 py-2">{year.year}</td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(year.interestPaid, "EUR", privacyMode)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(year.principalPaid, "EUR", privacyMode)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(year.extraPaid, "EUR", privacyMode)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(year.balance, "EUR", privacyMode)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
              Kein Szenario ausgewählt. Bitte lege eines an.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  helper?: string;
}

function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {helper && <div className="text-xs text-zinc-500 mt-1">{helper}</div>}
    </div>
  );
}

