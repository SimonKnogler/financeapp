-- Create tables
CREATE TABLE IF NOT EXISTS public.stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  shares DECIMAL NOT NULL,
  cost_basis DECIMAL,
  purchase_date_iso TEXT,
  type TEXT NOT NULL CHECK (type IN ('stock', 'crypto', 'etf', 'cash')),
  owner TEXT NOT NULL CHECK (owner IN ('simon', 'carolina', 'household')),
  goal_id UUID,
  sparplan JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly', 'once')),
  growth_annual DECIMAL DEFAULT 0,
  start_date_iso TEXT,
  end_date_iso TEXT,
  owner TEXT NOT NULL CHECK (owner IN ('simon', 'carolina', 'household')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.incomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'yearly', 'once')),
  growth_annual DECIMAL DEFAULT 0,
  start_date_iso TEXT,
  owner TEXT NOT NULL CHECK (owner IN ('simon', 'carolina')),
  allocations JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount DECIMAL NOT NULL,
  target_date_iso TEXT,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.portfolio_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date_iso TEXT NOT NULL,
  total_value DECIMAL NOT NULL,
  owner TEXT NOT NULL CHECK (owner IN ('total', 'simon', 'carolina')),
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date_iso, owner)
);

CREATE TABLE IF NOT EXISTS public.assumptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  currency TEXT DEFAULT 'EUR',
  inflation_rate DECIMAL DEFAULT 0.02,
  tax_rate DECIMAL DEFAULT 0.26,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.custom_asset_returns (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  expected_return DECIMAL NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, symbol)
);

CREATE TABLE IF NOT EXISTS public.finance_documents (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assumptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_asset_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_documents ENABLE ROW LEVEL SECURITY;

-- Create policies (users can only see their own data)
CREATE POLICY "Users can view their own stocks" ON public.stocks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own stocks" ON public.stocks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own stocks" ON public.stocks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own stocks" ON public.stocks
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own expenses" ON public.expenses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own expenses" ON public.expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own expenses" ON public.expenses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own expenses" ON public.expenses
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own incomes" ON public.incomes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own incomes" ON public.incomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own incomes" ON public.incomes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own incomes" ON public.incomes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own snapshots" ON public.portfolio_snapshots
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own snapshots" ON public.portfolio_snapshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own snapshots" ON public.portfolio_snapshots
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own snapshots" ON public.portfolio_snapshots
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own assumptions" ON public.assumptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own assumptions" ON public.assumptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own assumptions" ON public.assumptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own custom returns" ON public.custom_asset_returns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own custom returns" ON public.custom_asset_returns
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own custom returns" ON public.custom_asset_returns
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own custom returns" ON public.custom_asset_returns
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own finance document" ON public.finance_documents
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_stocks_user_id ON public.stocks(user_id);
CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX idx_incomes_user_id ON public.incomes(user_id);
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_snapshots_user_date ON public.portfolio_snapshots(user_id, date_iso);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers to auto-update updated_at
CREATE TRIGGER update_stocks_updated_at BEFORE UPDATE ON public.stocks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incomes_updated_at BEFORE UPDATE ON public.incomes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assumptions_updated_at BEFORE UPDATE ON public.assumptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_returns_updated_at BEFORE UPDATE ON public.custom_asset_returns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_finance_documents_updated_at BEFORE UPDATE ON public.finance_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

