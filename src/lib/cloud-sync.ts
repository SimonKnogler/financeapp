import { supabase } from './supabase';
import type { FinanceState } from '@/types/finance';

export async function uploadToCloud(data: FinanceState & { customAssetReturns: Record<string, number> }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Clear existing data for this user
  await Promise.all([
    supabase.from('stocks').delete().eq('user_id', user.id),
    supabase.from('expenses').delete().eq('user_id', user.id),
    supabase.from('incomes').delete().eq('user_id', user.id),
    supabase.from('goals').delete().eq('user_id', user.id),
    supabase.from('portfolio_snapshots').delete().eq('user_id', user.id),
    supabase.from('custom_asset_returns').delete().eq('user_id', user.id),
  ]);

  // Upload stocks
  if (data.stocks.length > 0) {
    const stocksData = data.stocks.map(stock => ({
      id: stock.id,
      user_id: user.id,
      symbol: stock.symbol,
      shares: stock.shares,
      cost_basis: stock.costBasis,
      purchase_date_iso: stock.purchaseDateISO,
      type: stock.type || 'stock',
      owner: stock.owner,
      goal_id: stock.goalId,
      sparplan: stock.sparplan,
    }));
    const { error } = await supabase.from('stocks').insert(stocksData);
    if (error) throw error;
  }

  // Upload expenses
  if (data.expenses.length > 0) {
    const expensesData = data.expenses.map(exp => ({
      id: exp.id,
      user_id: user.id,
      name: exp.name,
      amount: exp.amount,
      frequency: exp.frequency,
      growth_annual: exp.growthAnnual,
      start_date_iso: exp.startDateISO,
      end_date_iso: exp.endDateISO,
      owner: exp.owner,
    }));
    const { error } = await supabase.from('expenses').insert(expensesData);
    if (error) throw error;
  }

  // Upload incomes
  if (data.incomes.length > 0) {
    const incomesData = data.incomes.map(inc => ({
      id: inc.id,
      user_id: user.id,
      name: inc.name,
      amount: inc.amount,
      frequency: inc.frequency,
      growth_annual: inc.growthAnnual,
      start_date_iso: inc.startDateISO,
      owner: inc.owner,
      allocations: inc.allocations,
    }));
    const { error } = await supabase.from('incomes').insert(incomesData);
    if (error) throw error;
  }

  // Upload goals
  if (data.goals.length > 0) {
    const goalsData = data.goals.map(goal => ({
      id: goal.id,
      user_id: user.id,
      name: goal.name,
      target_amount: goal.targetAmount,
      target_date_iso: goal.targetDateISO,
      color: goal.color,
    }));
    const { error } = await supabase.from('goals').insert(goalsData);
    if (error) throw error;
  }

  // Upload portfolio snapshots
  if (data.portfolioHistory.length > 0) {
    const snapshotsData = data.portfolioHistory.map(snap => ({
      user_id: user.id,
      date_iso: snap.dateISO,
      total_value: snap.totalValue,
      owner: snap.owner,
      timestamp: snap.timestamp,
    }));
    const { error } = await supabase.from('portfolio_snapshots').insert(snapshotsData);
    if (error) throw error;
  }

  // Upload assumptions
  const { error: assumptionsError } = await supabase.from('assumptions').upsert({
    user_id: user.id,
    currency: data.assumptions.currency,
    inflation_rate: data.assumptions.inflationRate,
    tax_rate: data.assumptions.taxRate,
  });
  if (assumptionsError) throw assumptionsError;

  // Upload custom asset returns
  const customReturnsEntries = Object.entries(data.customAssetReturns);
  if (customReturnsEntries.length > 0) {
    const customReturnsData = customReturnsEntries.map(([symbol, expectedReturn]) => ({
      user_id: user.id,
      symbol,
      expected_return: expectedReturn,
    }));
    const { error } = await supabase.from('custom_asset_returns').upsert(customReturnsData);
    if (error) throw error;
  }

  return { success: true };
}

export async function downloadFromCloud(): Promise<FinanceState & { customAssetReturns: Record<string, number> }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch all data
  const [
    { data: stocks, error: stocksError },
    { data: expenses, error: expensesError },
    { data: incomes, error: incomesError },
    { data: goals, error: goalsError },
    { data: snapshots, error: snapshotsError },
    { data: assumptions, error: assumptionsError },
    { data: customReturns, error: customReturnsError },
  ] = await Promise.all([
    supabase.from('stocks').select('*').eq('user_id', user.id),
    supabase.from('expenses').select('*').eq('user_id', user.id),
    supabase.from('incomes').select('*').eq('user_id', user.id),
    supabase.from('goals').select('*').eq('user_id', user.id),
    supabase.from('portfolio_snapshots').select('*').eq('user_id', user.id),
    supabase.from('assumptions').select('*').eq('user_id', user.id).single(),
    supabase.from('custom_asset_returns').select('*').eq('user_id', user.id),
  ]);

  if (stocksError) throw stocksError;
  if (expensesError) throw expensesError;
  if (incomesError) throw incomesError;
  if (goalsError) throw goalsError;
  if (snapshotsError) throw snapshotsError;
  if (customReturnsError) throw customReturnsError;

  // Transform data back to app format
  return {
    accounts: [],
    stocks: (stocks || []).map(s => ({
      id: s.id,
      symbol: s.symbol,
      shares: s.shares,
      costBasis: s.cost_basis,
      purchaseDateISO: s.purchase_date_iso,
      type: s.type,
      owner: s.owner,
      goalId: s.goal_id,
      sparplan: s.sparplan,
    })),
    expenses: (expenses || []).map(e => ({
      id: e.id,
      name: e.name,
      amount: e.amount,
      frequency: e.frequency,
      growthAnnual: e.growth_annual,
      startDateISO: e.start_date_iso,
      endDateISO: e.end_date_iso,
      owner: e.owner,
    })),
    incomes: (incomes || []).map(i => ({
      id: i.id,
      name: i.name,
      amount: i.amount,
      frequency: i.frequency,
      growthAnnual: i.growth_annual,
      startDateISO: i.start_date_iso,
      owner: i.owner,
      allocations: i.allocations,
    })),
    goals: (goals || []).map(g => ({
      id: g.id,
      name: g.name,
      targetAmount: g.target_amount,
      targetDateISO: g.target_date_iso,
      color: g.color,
    })),
    portfolioHistory: (snapshots || []).map(s => ({
      dateISO: s.date_iso,
      totalValue: s.total_value,
      owner: s.owner,
      timestamp: s.timestamp,
    })),
    assumptions: assumptions ? {
      startDateISO: new Date().toISOString().split('T')[0],
      horizonYears: 30,
      currency: assumptions.currency,
      inflationRate: assumptions.inflation_rate,
      taxRate: assumptions.tax_rate,
    } : {
      startDateISO: new Date().toISOString().split('T')[0],
      horizonYears: 30,
      currency: 'EUR',
      inflationRate: 0.02,
      taxRate: 0.26,
    },
    customAssetReturns: (customReturns || []).reduce((acc, cr) => {
      acc[cr.symbol] = cr.expected_return;
      return acc;
    }, {} as Record<string, number>),
  };
}

export async function getLastSyncTime(): Promise<Date | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('assumptions')
    .select('updated_at')
    .eq('user_id', user.id)
    .single();

  return data?.updated_at ? new Date(data.updated_at) : null;
}

