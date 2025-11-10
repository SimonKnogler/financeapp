import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types
export type Database = {
  stocks: {
    id: string;
    user_id: string;
    symbol: string;
    shares: number;
    cost_basis?: number;
    purchase_date_iso?: string;
    type: 'stock' | 'crypto' | 'etf' | 'cash';
    owner: 'simon' | 'carolina' | 'household';
    goal_id?: string;
    sparplan?: any;
    created_at: string;
    updated_at: string;
  };
  expenses: {
    id: string;
    user_id: string;
    name: string;
    amount: number;
    frequency: 'monthly' | 'yearly' | 'once';
    growth_annual: number;
    start_date_iso?: string;
    end_date_iso?: string;
    owner: 'simon' | 'carolina' | 'household';
    created_at: string;
    updated_at: string;
  };
  incomes: {
    id: string;
    user_id: string;
    name: string;
    amount: number;
    frequency: 'monthly' | 'yearly' | 'once';
    growth_annual: number;
    start_date_iso?: string;
    owner: 'simon' | 'carolina';
    allocations?: any;
    created_at: string;
    updated_at: string;
  };
  goals: {
    id: string;
    user_id: string;
    name: string;
    target_amount: number;
    target_date_iso?: string;
    color: string;
    created_at: string;
    updated_at: string;
  };
  portfolio_snapshots: {
    id: string;
    user_id: string;
    date_iso: string;
    total_value: number;
    owner: 'total' | 'simon' | 'carolina';
    timestamp: number;
    created_at: string;
  };
  assumptions: {
    user_id: string;
    currency: string;
    inflation_rate: number;
    tax_rate: number;
    updated_at: string;
  };
};

