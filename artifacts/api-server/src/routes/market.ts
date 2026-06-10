import { Router } from "express";
import YahooFinance from "yahoo-finance2";
import NodeCache from "node-cache";

const yahooFinance = new YahooFinance();

const router = Router();
const cache = new NodeCache({ stdTTL: 60, checkperiod: 30 });

const VALID_INTERVALS = ["1m", "2m", "5m", "15m", "30m", "60m", "1d"] as const;
const VALID_PERIODS = ["1d", "5d", "1mo", "3mo", "6mo", "1y"] as const;

type Interval = (typeof VALID_INTERVALS)[number];
type Period = (typeof VALID_PERIODS)[number];

const PERIOD_DAYS: Record<Period, number> = {
  "1d": 1,
  "5d": 5,
  "1mo": 30,
  "3mo": 90,
  "6mo": 180,
  "1y": 365,
};

async function fetchWithRetry(
  symbol: string,
  interval: Interval,
  period: Period,
  retries = 3
): Promise<{ time: number; open: number; high: number; low: number; close: number; volume: number }[]> {
  let lastErr: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const now = new Date();
      const days = PERIOD_DAYS[period];
      const period1 = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const result = await yahooFinance.chart(symbol, {
        period1,
        period2: now,
        interval,
      });

      const quotes = result?.quotes ?? [];

      const candles = quotes
        .filter(
          (q): q is typeof q & { open: number; high: number; low: number; close: number } =>
            q.open != null && q.high != null && q.low != null && q.close != null
        )
        .map((q) => ({
          time: Math.floor(new Date(q.date).getTime() / 1000),
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume ?? 0,
        }));

      return candles;
    } catch (err) {
      lastErr = err;
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
      }
    }
  }

  throw lastErr;
}

router.get("/market/chart", async (req, res) => {
  const symbol = (req.query.symbol as string | undefined)?.toUpperCase();
  const interval = (req.query.interval as string | undefined) ?? "1m";
  const period = (req.query.period as string | undefined) ?? "1d";

  if (!symbol) {
    res.status(400).json({ error: "symbol is required" });
    return;
  }
  if (!VALID_INTERVALS.includes(interval as Interval)) {
    res.status(400).json({ error: `interval must be one of: ${VALID_INTERVALS.join(", ")}` });
    return;
  }
  if (!VALID_PERIODS.includes(period as Period)) {
    res.status(400).json({ error: `period must be one of: ${VALID_PERIODS.join(", ")}` });
    return;
  }

  const cacheKey = `${symbol}:${interval}:${period}`;
  const cached = cache.get<{ candles: object[] }>(cacheKey);
  if (cached) {
    req.log.info({ symbol, interval, period, cacheHit: true }, "market chart cache hit");
    res.json(cached);
    return;
  }

  req.log.info({ symbol, interval, period, cacheHit: false }, "market chart fetch start");

  try {
    const candles = await fetchWithRetry(symbol, interval as Interval, period as Period);

    if (candles.length === 0) {
      req.log.warn({ symbol, interval, period }, "market chart returned empty candles");
      res.status(404).json({ error: "No market data available for this symbol and timeframe" });
      return;
    }

    const payload = { candles };
    cache.set(cacheKey, payload);

    req.log.info({ symbol, interval, period, count: candles.length }, "market chart fetch success");
    res.json(payload);
  } catch (err) {
    req.log.error({ symbol, interval, period, err }, "market chart fetch failed after retries");
    res.status(502).json({ error: "Unable to fetch market data. Please try again." });
  }
});

export default router;
