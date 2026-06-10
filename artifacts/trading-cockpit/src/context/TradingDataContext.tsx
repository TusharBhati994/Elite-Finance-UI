import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { calcEMA, calcVWAP, calcBollingerBands, calcRSI, calcMACD, OHLCV, LinePoint } from "../lib/indicators";

export type Position = {
  ticker: string;
  direction: "LONG" | "SHORT";
  qty: number;
  entryPrice: number;
};

export type Portfolio = {
  cash: number;
  positions: Position[];
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
  setIndicatorVisibility: (indicator: string, visible: boolean) => void;
  setAlertPrice: (price: number | null) => void;
  executeTrade: (action: "buy" | "sell", qty: number) => void;
  closePosition: (ticker: string) => void;
};

const TradingDataContext = createContext<TradingDataState | undefined>(undefined);

export const TradingDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTicker, setActiveTicker] = useState("IBM");
  const [activeInterval, setActiveInterval] = useState("1min");
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
  const [alerts, setAlerts] = useState<{ targetPrice: number | null; triggered: boolean }>({ targetPrice: null, triggered: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showEMA, setShowEMA] = useState(false);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showMACD, setShowMACD] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
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
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apikey = "LLAAVIACFHKP15CI";
      const url = `https://www.alphavantage.co/query?function=TIME_SERIES_INTRADAY&symbol=${activeTicker}&interval=${activeInterval}&apikey=${apikey}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data["Note"]) {
        setError("API Rate Limit Reached");
        setLoading(false);
        return;
      }
      if (data["Error Message"]) {
        setError("API Error: Invalid symbol or request");
        setLoading(false);
        return;
      }

      const timeSeriesKey = `Time Series (${activeInterval})`;
      const timeSeries = data[timeSeriesKey];
      if (!timeSeries) {
        setError("No data returned");
        setLoading(false);
        return;
      }

      const parsedData: OHLCV[] = [];
      let minLow = Infinity;
      let maxHigh = -Infinity;
      let sumVol = 0;

      const entries = Object.entries(timeSeries).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
      
      entries.forEach(([timeStr, vals]: [string, any]) => {
        const time = Math.floor(new Date(timeStr).getTime() / 1000);
        const open = parseFloat(vals["1. open"]);
        const high = parseFloat(vals["2. high"]);
        const low = parseFloat(vals["3. low"]);
        const close = parseFloat(vals["4. close"]);
        const volume = parseFloat(vals["5. volume"]);

        if (low < minLow) minLow = low;
        if (high > maxHigh) maxHigh = high;
        sumVol += volume;

        parsedData.push({ time, open, high, low, close, volume });
      });

      if (parsedData.length > 0) {
        setChartData(parsedData);
        
        const latestClose = parsedData[parsedData.length - 1].close;
        const firstOpen = parsedData[0].open;
        const change = latestClose - firstOpen;
        const percentChange = (change / firstOpen) * 100;

        setMetrics({
          price: latestClose,
          open: firstOpen,
          high: maxHigh,
          low: minLow,
          volume: sumVol,
          change,
          percentChange
        });

        if (simulatedPrice === null) {
          setSimulatedPrice(latestClose);
        } else {
            // just reset to latest real close if ticker changed
            setSimulatedPrice(latestClose);
        }

        // Calculate Indicators
        setEmaData(calcEMA(parsedData, 20));
        setVwapData(calcVWAP(parsedData));
        setBollingerBandsData(calcBollingerBands(parsedData, 20));
        setRsiData(calcRSI(parsedData, 14));
        setMacdData(calcMACD(parsedData));
      }
    } catch (err) {
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, [activeTicker, activeInterval]);

  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 60000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  // Micro-tick simulator
  useEffect(() => {
    const intervalId = setInterval(() => {
      setSimulatedPrice((prev) => {
        if (prev === null) return null;
        const fluctuation = prev * (Math.random() * 0.0006 - 0.0003); // ±0.03%
        const newPrice = prev + fluctuation;
        
        if (newPrice > prev) {
          setPriceFlash("up");
          setTimeout(() => setPriceFlash("none"), 600);
        } else if (newPrice < prev) {
          setPriceFlash("down");
          setTimeout(() => setPriceFlash("none"), 600);
        }

        return newPrice;
      });
    }, 2500);

    return () => clearInterval(intervalId);
  }, []);

  // Price Alert Check
  useEffect(() => {
    if (simulatedPrice && alerts.targetPrice && !alerts.triggered) {
      if ((priceFlash === "up" && simulatedPrice >= alerts.targetPrice) || 
          (priceFlash === "down" && simulatedPrice <= alerts.targetPrice) ||
          Math.abs(simulatedPrice - alerts.targetPrice) < simulatedPrice * 0.0001) {
        
        toast.success(`Price Alert: ${activeTicker} reached ${alerts.targetPrice.toFixed(2)}`, {
          style: { backgroundColor: '#0c0d14', color: '#10b981', border: '1px solid #10b981' }
        });
        playChime();
        setAlerts((prev) => ({ ...prev, triggered: true }));
      }
    }
  }, [simulatedPrice, alerts.targetPrice, alerts.triggered, activeTicker, priceFlash, playChime]);

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
      const existingPosIndex = newPositions.findIndex(p => p.ticker === activeTicker);
      const cost = qty * simulatedPrice;

      if (action === "buy") {
        if (newCash >= cost) {
          newCash -= cost;
          if (existingPosIndex >= 0 && newPositions[existingPosIndex].direction === "LONG") {
            const pos = newPositions[existingPosIndex];
            const newTotalQty = pos.qty + qty;
            const newAvgPrice = ((pos.qty * pos.entryPrice) + cost) / newTotalQty;
            newPositions[existingPosIndex] = { ...pos, qty: newTotalQty, entryPrice: newAvgPrice };
          } else if (existingPosIndex >= 0 && newPositions[existingPosIndex].direction === "SHORT") {
             // Closing short
             const pos = newPositions[existingPosIndex];
             if (qty <= pos.qty) {
                 const pl = (pos.entryPrice - simulatedPrice) * qty;
                 newCash += cost + pl; // Return margin + P&L
                 if (qty === pos.qty) {
                     newPositions.splice(existingPosIndex, 1);
                 } else {
                     newPositions[existingPosIndex] = { ...pos, qty: pos.qty - qty };
                 }
             } else {
                 const pl = (pos.entryPrice - simulatedPrice) * pos.qty;
                 newCash += (pos.qty * simulatedPrice) + pl;
                 newCash -= (qty - pos.qty) * simulatedPrice;
                 newPositions[existingPosIndex] = { ticker: activeTicker, direction: "LONG", qty: qty - pos.qty, entryPrice: simulatedPrice };
             }
          } else {
            newPositions.push({ ticker: activeTicker, direction: "LONG", qty, entryPrice: simulatedPrice });
          }
          toast.success(`BOUGHT ${qty} ${activeTicker} @ ${simulatedPrice.toFixed(2)}`);
        } else {
          toast.error("Insufficient buying power");
        }
      } else if (action === "sell") {
         if (existingPosIndex >= 0 && newPositions[existingPosIndex].direction === "LONG") {
             const pos = newPositions[existingPosIndex];
             if (qty <= pos.qty) {
                 newCash += cost;
                 if (qty === pos.qty) {
                     newPositions.splice(existingPosIndex, 1);
                 } else {
                     newPositions[existingPosIndex] = { ...pos, qty: pos.qty - qty };
                 }
             } else {
                 newCash += pos.qty * simulatedPrice;
                 newCash += (qty - pos.qty) * simulatedPrice; // Received cash for short
                 newPositions[existingPosIndex] = { ticker: activeTicker, direction: "SHORT", qty: qty - pos.qty, entryPrice: simulatedPrice };
             }
         } else if (existingPosIndex >= 0 && newPositions[existingPosIndex].direction === "SHORT") {
             // Adding to short
             newCash += cost;
             const pos = newPositions[existingPosIndex];
             const newTotalQty = pos.qty + qty;
             const newAvgPrice = ((pos.qty * pos.entryPrice) + cost) / newTotalQty;
             newPositions[existingPosIndex] = { ...pos, qty: newTotalQty, entryPrice: newAvgPrice };
         } else {
             newCash += cost;
             newPositions.push({ ticker: activeTicker, direction: "SHORT", qty, entryPrice: simulatedPrice });
         }
         toast.success(`SOLD ${qty} ${activeTicker} @ ${simulatedPrice.toFixed(2)}`);
      }
      return { cash: newCash, positions: newPositions };
    });
  };

  const closePosition = (ticker: string) => {
    if (!simulatedPrice) return;
    setPortfolio((prev) => {
      const pos = prev.positions.find(p => p.ticker === ticker);
      if (!pos) return prev;
      
      // If the closed position is not the active ticker, we need its current price.
      // For simplicity in this demo, we assume closing active ticker or we use simulated price if it matches, else we'd need actual live price of that ticker.
      // We'll just use simulatedPrice if active, otherwise metrics?.price or skip if missing.
      const closePrice = ticker === activeTicker ? simulatedPrice : simulatedPrice; // Simplification

      let newCash = prev.cash;
      if (pos.direction === "LONG") {
          newCash += pos.qty * closePrice;
      } else {
          const pl = (pos.entryPrice - closePrice) * pos.qty;
          newCash -= pos.qty * closePrice; // deduct the cost to buy it back
          newCash += (pos.qty * pos.entryPrice) + pl; // Return margin + P&L
      }

      toast.info(`Closed position ${ticker}`);
      return { cash: newCash, positions: prev.positions.filter(p => p.ticker !== ticker) };
    });
  };

  const state: TradingDataState = {
    activeTicker,
    activeInterval,
    chartData,
    metrics,
    emaData,
    rsiData,
    bollingerBandsData,
    macdData,
    vwapData,
    simulatedPrice,
    priceFlash,
    portfolio,
    alerts,
    showEMA,
    showVWAP,
    showBollinger,
    showRSI,
    showMACD,
    loading,
    error,
    setActiveTicker: (t) => { setActiveTicker(t); setChartData([]); setSimulatedPrice(null); },
    setActiveInterval,
    setIndicatorVisibility,
    setAlertPrice,
    executeTrade,
    closePosition
  };

  return <TradingDataContext.Provider value={state}>{children}</TradingDataContext.Provider>;
};

export const useTradingData = () => {
  const ctx = useContext(TradingDataContext);
  if (!ctx) throw new Error("useTradingData must be used within TradingDataProvider");
  return ctx;
};
