# APEX Terminal

A real-time institutional trading cockpit — live candlestick charts, 5 technical indicators, paper trading, and smart price alerts, all in a full-screen dark terminal aesthetic.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/trading-cockpit run dev` — run the frontend (port 20596)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Tailwind CSS + `lightweight-charts` v5
- API: Express 5 + `yahoo-finance2` v3 + `node-cache`
- Build: esbuild (API), Vite (frontend)

## Where things live

- `artifacts/api-server/` — Express API server
  - `src/routes/market.ts` — Yahoo Finance data endpoint with 60s cache + retry
- `artifacts/trading-cockpit/` — React frontend
  - `src/context/TradingDataContext.tsx` — global state, data fetching, micro-tick simulator, paper trading
  - `src/lib/indicators.ts` — EMA, VWAP, Bollinger Bands, RSI, MACD math
  - `src/components/TradingViewChart.tsx` — lightweight-charts integration with sub-panes

## Architecture decisions

- Data flows: Yahoo Finance → API server (cached) → React context → UI. No direct browser-to-external-API calls.
- `yahoo-finance2` v3 requires `new YahooFinance()` instantiation (not a default singleton like v2).
- lightweight-charts v5 uses `chart.addSeries(SeriesType, opts)` — not the v4 `addXxxSeries()` shortcuts.
- The micro-tick simulator runs every 2.5s in the frontend to animate price between 60s API polls.
- In-memory cache (`node-cache`) keyed by `symbol:interval:period` with 60s TTL keeps Yahoo Finance load minimal.

## Product

- Full-screen trading terminal: watchlist sidebar, candlestick chart, metrics sidebar, paper trading panel
- Intervals: 1m, 2m, 5m, 15m, 30m, 60m, 1d — Periods: 1d, 5d, 1mo, 3mo, 6mo, 1y
- Overlay indicators: EMA 20, VWAP, Bollinger Bands — Sub-pane indicators: RSI 14, MACD
- Price alerts with browser chime and toast notification; alert line drawn on chart
- $100,000 virtual paper trading account with live P&L tracking

## Gotchas

- `yahoo-finance2` v3 — must call `new YahooFinance()` before using (see `.agents/memory/yahoo-finance2-v3.md`)
- `lightweight-charts` v5 — `lineWidth` only accepts integers (1, 2, 3, 4), not floats
- Vite build requires `PORT` and `BASE_PATH` env vars — use workflow or artifact.toml, not raw `pnpm build`
