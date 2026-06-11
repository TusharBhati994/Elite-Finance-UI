import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { calcEMA, calcVWAP, calcBollingerBands, calcRSI, calcMACD, OHLCV, LinePoint } from "../lib/indicators";

export type Position = {
  ticker: string;
  direction: "LONG" | "SHORT";
  qty: number;
  entryPrice: number;

  stopLoss?: number | null;
  targetPrice?: number | null;
};

export type Portfolio = {
  cash: number;
  positions: Position[];
};

export type PnLSnapshot = {
  time: number;
  equity: number;
};

export type Metrics = {
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  change: number;
  percentChange: number;
};

type TradingDataState = {
  activeTicker: string;
  activeInterval: string;
  activePeriod: string;
  chartData: OHLCV[];
  metrics: Metrics | null;
  emaData: LinePoint[];
  rsiData: LinePoint[];
  bollingerBandsData: { upper: LinePoint[]; middle: LinePoint[]; lower: LinePoint[] } | null;
  macdData: { macd: LinePoint[]; signal: LinePoint[]; histogram: { time: number; value: number; color: string }[] } | null;
  vwapData: LinePoint[];
  simulatedPrice: number | null;
  priceFlash: "up" | "down" | "none";
  portfolio: Portfolio;
  pnlHistory: PnLSnapshot[];
  alerts: { targetPrice: number | null; triggered: boolean };
  showEMA: boolean;
  showVWAP: boolean;
  showBollinger: boolean;
  showRSI: boolean;
  showMACD: boolean;
  loading: boolean;
  error: string | null;
  setActiveTicker: (ticker: string) => void;
  setActiveInterval: (interval: string) => void;
  setActivePeriod: (period: string) => void;
  setIndicatorVisibility: (indicator: string, visible: boolean) => void;
  setAlertPrice: (price: number | null) => void;
  executeTrade: (action: "buy" | "sell", qty: number) => void;
  closePosition: (ticker: string) => void;
};

const TradingDataContext = createContext<TradingDataState | undefined>(undefined);

export const TradingDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTicker, setActiveTickerState] = useState("IBM");
  const [activeInterval, setActiveIntervalState] = useState("1m");
  const [activePeriod, setActivePeriodState] = useState("1d");
  const [chartData, setChartData] = useState<OHLCV[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [emaData, setEmaData] = useState<LinePoint[]>([]);
  const [rsiData, setRsiData] = useState<LinePoint[]>([]);
  const [bollingerBandsData, setBollingerBandsData] = useState<{ upper: LinePoint[]; middle: LinePoint[]; lower: LinePoint[] } | null>(null);
  const [macdData, setMacdData] = useState<{ macd: LinePoint[]; signal: LinePoint[]; histogram: { time: number; value: number; color: string }[] } | null>(null);
  const [vwapData, setVwapData] = useState<LinePoint[]>([]);
  const [simulatedPrice, setSimulatedPrice] = useState<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<"up" | "down" | "none">("none");
  const [portfolio, setPortfolio] = useState<Portfolio>({ cash: 100000, positions: [] });
  const [pnlHistory, setPnlHistory] = useState<PnLSnapshot[]>([{ time: Date.now(), equity: 100000 }]);
  const [alerts, setAlerts] = useState<{ targetPrice: number | null; triggered: boolean }>({ targetPrice: null, triggered: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showEMA, setShowEMA] = useState(false);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevPriceRef = useRef<number | null>(null);

  const playChime = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 800;
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      gainNode.gain.setValueAtTime(0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {
      // audio not available
    }
  }, []);

  const processCandles = useCallback((candles: OHLCV[]) => {
    if (candles.length === 0) return;

    let minLow = Infinity;
    let maxHigh = -Infinity;
    let sumVol = 0;

    for (const c of candles) {
      if (c.low < minLow) minLow = c.low;
      if (c.high > maxHigh) maxHigh = c.high;
      sumVol += c.volume ?? 0;
    }

    const latestClose = candles[candles.length - 1].close;
    const firstOpen = candles[0].open;
    const change = latestClose - firstOpen;
    const percentChange = (change / firstOpen) * 100;

    setChartData(candles);
    setMetrics({ price: latestClose, open: firstOpen, high: maxHigh, low: minLow, volume: sumVol, change, percentChange });
    setSimulatedPrice(latestClose);
    prevPriceRef.current = latestClose;

    setEmaData(calcEMA(candles, 20));
    setVwapData(calcVWAP(candles));
    setBollingerBandsData(calcBollingerBands(candles, 20));
    setRsiData(calcRSI(candles, 14));
    setMacdData(calcMACD(candles));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

// Fix for 1d interval + 1d period showing only 1 candle
const effectivePeriod =
  activeInterval === "1d" && activePeriod === "1d"
    ? "1y"
    : activePeriod;

const url = `${apiBase}/api/market/chart?symbol=${encodeURIComponent(activeTicker)}&interval=${activeInterval}&period=${effectivePeriod}`;

const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = (body as any)?.error ?? "Market data temporarily unavailable.";
        setError(msg);
        return;
      }
      const data: { candles: OHLCV[] } = await res.json();
      if (!data.candles || data.candles.length === 0) {
        setError("Market data temporarily unavailable.");
        return;
      }
      processCandles(data.candles);
    } catch {
      setError("Unable to fetch market data. Retrying...");
    } finally {
      setLoading(false);
    }
  }, [activeTicker, activeInterval, activePeriod, processCandles]);

  // Initial load + 60-second polling
  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 60000);
    return () => clearInterval(id);
  }, [fetchData]);

  // Micro-tick simulator — ±0.03% every 2.5 s
  // useEffect(() => {
  //   const id = setInterval(() => {
  //     setSimulatedPrice((prev) => {
  //       if (prev === null) return null;
  //       const delta = prev * (Math.random() * 0.0006 - 0.0003);
  //       const next = prev + delta;
  //       if (next > (prevPriceRef.current ?? prev)) {
  //         setPriceFlash("up");
  //         setTimeout(() => setPriceFlash("none"), 600);
  //       } else {
  //         setPriceFlash("down");
  //         setTimeout(() => setPriceFlash("none"), 600);
  //       }
  //       prevPriceRef.current = next;
  //       // Record equity snapshot for P&L chart
  //       setPortfolio((port) => {
  //         const unrealized = port.positions.reduce((acc, pos) => {
  //           const livePrice = pos.ticker === activeTicker ? next : pos.entryPrice;
  //           return acc + (livePrice - pos.entryPrice) * pos.qty * (pos.direction === "LONG" ? 1 : -1);
  //         }, 0);
  //         const equity = port.cash + unrealized;
  //         setPnlHistory((h) => {
  //           const updated = [...h, { time: Date.now(), equity }];
  //           return updated.length > 240 ? updated.slice(-240) : updated;
  //         });
  //         return port;
  //       });
  //       return next;
  //     });
  //   }, 2500);
  //   return () => clearInterval(id);
  // }, [activeTicker]);

  // Price alert check
  useEffect(() => {
    if (!simulatedPrice || !alerts.targetPrice || alerts.triggered) return;
    const diff = Math.abs(simulatedPrice - alerts.targetPrice);
    if (diff < simulatedPrice * 0.0005 || simulatedPrice >= alerts.targetPrice) {
      toast.success(`Price Alert: ${activeTicker} reached $${alerts.targetPrice.toFixed(2)}`, {
        style: { backgroundColor: "#0c0d14", color: "#10b981", border: "1px solid #10b981" },
      });
      playChime();
      setAlerts((prev) => ({ ...prev, triggered: true }));
    }
  }, [simulatedPrice, alerts.targetPrice, alerts.triggered, activeTicker, playChime]);

  const setActiveTicker = useCallback((t: string) => {
    setActiveTickerState(t);
    setChartData([]);
    setMetrics(null);
    setSimulatedPrice(null);
    prevPriceRef.current = null;
    setError(null);
  }, []);

  const setActiveInterval = useCallback((i: string) => {
    setActiveIntervalState(i);
    setChartData([]);
  }, []);

  const setActivePeriod = useCallback((p: string) => {
    setActivePeriodState(p);
    setChartData([]);
  }, []);

  const setIndicatorVisibility = (indicator: string, visible: boolean) => {
    switch (indicator) {
      case "EMA": setShowEMA(visible); break;
      case "VWAP": setShowVWAP(visible); break;
      case "Bollinger": setShowBollinger(visible); break;
      case "RSI": setShowRSI(visible); break;
      case "MACD": setShowMACD(visible); break;
    }
  };

  const setAlertPrice = (price: number | null) => {
    setAlerts({ targetPrice: price, triggered: false });
  };

  const executeTrade = (action: "buy" | "sell", qty: number) => {
    if (!simulatedPrice || qty <= 0) return;
    setPortfolio((prev) => {
      let newCash = prev.cash;
      let newPositions = [...prev.positions];
      const idx = newPositions.findIndex((p) => p.ticker === activeTicker);
      const cost = qty * simulatedPrice;

      if (action === "buy") {
        if (newCash < cost) { toast.error("Insufficient buying power"); return prev; }
        newCash -= cost;
        if (idx >= 0 && newPositions[idx].direction === "LONG") {
          const pos = newPositions[idx];
          const newQty = pos.qty + qty;
          newPositions[idx] = { ...pos, qty: newQty, entryPrice: ((pos.qty * pos.entryPrice) + cost) / newQty };
        } else if (idx >= 0 && newPositions[idx].direction === "SHORT") {
          const pos = newPositions[idx];
          const pl = (pos.entryPrice - simulatedPrice) * Math.min(qty, pos.qty);
          newCash += cost + pl;
          if (qty >= pos.qty) newPositions.splice(idx, 1);
          else newPositions[idx] = { ...pos, qty: pos.qty - qty };
        } else {
          newPositions.push({ ticker: activeTicker, direction: "LONG", qty, entryPrice: simulatedPrice });
        }
        toast.success(`BOUGHT ${qty} ${activeTicker} @ $${simulatedPrice.toFixed(2)}`);
      } else {
        if (idx >= 0 && newPositions[idx].direction === "LONG") {
          const pos = newPositions[idx];
          newCash += Math.min(qty, pos.qty) * simulatedPrice;
          if (qty >= pos.qty) newPositions.splice(idx, 1);
          else newPositions[idx] = { ...pos, qty: pos.qty - qty };
          if (qty > pos.qty) newPositions.push({ ticker: activeTicker, direction: "SHORT", qty: qty - pos.qty, entryPrice: simulatedPrice });
        } else if (idx >= 0 && newPositions[idx].direction === "SHORT") {
          const pos = newPositions[idx];
          const newQty = pos.qty + qty;
          newCash += cost;
          newPositions[idx] = { ...pos, qty: newQty, entryPrice: ((pos.qty * pos.entryPrice) + cost) / newQty };
        } else {
          newCash += cost;
          newPositions.push({ ticker: activeTicker, direction: "SHORT", qty, entryPrice: simulatedPrice });
        }
        toast.success(`SOLD ${qty} ${activeTicker} @ $${simulatedPrice.toFixed(2)}`);
      }
      return { cash: newCash, positions: newPositions };
    });
  };

  const closePosition = (ticker: string) => {
    if (!simulatedPrice) return;
    setPortfolio((prev) => {
      const pos = prev.positions.find((p) => p.ticker === ticker);
      if (!pos) return prev;
      let newCash = prev.cash;
      if (pos.direction === "LONG") {
        newCash += pos.qty * simulatedPrice;
      } else {
        const pl = (pos.entryPrice - simulatedPrice) * pos.qty;
        newCash += pos.qty * pos.entryPrice + pl;
      }
      toast.info(`Closed ${ticker} position`);
      return { cash: newCash, positions: prev.positions.filter((p) => p.ticker !== ticker) };
    });
  };

  const state: TradingDataState = {
    activeTicker, activeInterval, activePeriod,
    chartData, metrics,
    emaData, rsiData, bollingerBandsData, macdData, vwapData,
    simulatedPrice, priceFlash,
    portfolio, pnlHistory, alerts,
    showEMA, showVWAP, showBollinger, showRSI, showMACD,
    loading, error,
    setActiveTicker, setActiveInterval, setActivePeriod,
    setIndicatorVisibility, setAlertPrice,
    executeTrade, closePosition,
  };

  return <TradingDataContext.Provider value={state}>{children}</TradingDataContext.Provider>;
};

export const useTradingData = () => {
  const ctx = useContext(TradingDataContext);
  if (!ctx) throw new Error("useTradingData must be used within TradingDataProvider");
  return ctx;
};
