Finances App — ProjectionLab-style personal finance modeling starter.

### Features
- Deterministic projections with monthly timeline
- Accounts: cash, investment, property, loan
- **Stock Portfolio with live prices** (Yahoo Finance API, auto-refresh every 2 min)
- Income and expenses with frequencies and growth
- Simple tax modeling (effective rate)
- Assumptions: start date, horizon, inflation, currency
- Charts: Net Worth and Cash Flow (Recharts)
- Dynamic net worth calculation including live stock portfolio value
- Local persistence (Zustand) and JSON import/export
- Dark/light theme (next-themes + Tailwind)

### Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Project Structure
- `src/types/finance.ts`: Core domain types (accounts, income, expenses, stocks)
- `src/lib/projection.ts`: Projection engine with dynamic stock portfolio support
- `src/lib/stock-prices.ts`: Stock price fetching service with 1-min caching
- `src/store/finance-store.ts`: Zustand store with persistence
- `src/components/charts/*`: Chart components
- `src/app/*`: Pages (Dashboard, Accounts, Portfolio, Income, Expenses, Assumptions, Settings)

### Stock Portfolio
Navigate to **Portfolio** in the sidebar to:
- Add stocks by symbol (e.g., AAPL, GOOGL, TSLA)
- Track shares, cost basis, and purchase date
- View live market prices in EUR (fetched from Yahoo Finance, no API key required)
- See total portfolio value, cost, and gain/loss with % return
- **View latest news** for each stock position (top 3-5 articles)
- Click to expand/collapse news per stock with thumbnails and links
- Auto-refreshes prices and news every 2 minutes
- Portfolio value is dynamically included in your net worth calculation on the Dashboard

### Notes
- This is an MVP baseline: tax modeling and Monte Carlo are simplified/omitted for clarity.
- Stock prices use Yahoo Finance's free API; prices update every 2 minutes with 1-min cache.
- Extend the projection engine to add tax brackets, location-based taxes, or Monte Carlo simulations.

### Tech
- Next.js App Router + TypeScript
- Tailwind CSS v4
- Zustand + next-themes
- Recharts, date-fns, zod

