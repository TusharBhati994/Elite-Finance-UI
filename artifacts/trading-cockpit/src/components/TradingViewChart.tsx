import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  ColorType,
  CrosshairMode,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  IChartApi,
  ISeriesApi,
  LineStyle,
} from "lightweight-charts";
import { useTradingData } from "../context/TradingDataContext";
import { Settings2 } from "lucide-react";

export default function TradingViewChart() {
  const { 
    chartData, activeInterval, setActiveInterval, 
    emaData, vwapData, bollingerBandsData, rsiData, macdData,
    showEMA, showVWAP, showBollinger, showRSI, showMACD, setIndicatorVisibility,
    alerts
  } = useTradingData();

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<any, any> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<any, any> | null>(null);
  const vwapSeriesRef = useRef<ISeriesApi<any, any> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<any, any> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<any, any> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<any, any> | null>(null);
  const alertLineRef = useRef<any>(null);

  const rsiChartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<any, any> | null>(null);

  const macdChartRef = useRef<IChartApi | null>(null);
  const macdSeriesRef = useRef<ISeriesApi<any, any> | null>(null);
  const signalSeriesRef = useRef<ISeriesApi<any, any> | null>(null);
  const histSeriesRef = useRef<ISeriesApi<any, any> | null>(null);

  const [studiesOpen, setStudiesOpen] = useState(false);

  // Initialize main chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: '#090d16' }, textColor: '#94a3b8' },
      grid: { vertLines: { color: '#131a2b' }, horzLines: { color: '#131a2b' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#1e293b' },
      timeScale: { borderColor: '#1e293b', timeVisible: true, secondsVisible: false },
    });
    
    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });
    candleSeriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Update main chart data
  useEffect(() => {
    if (candleSeriesRef.current && chartData.length > 0) {
      candleSeriesRef.current.setData(chartData as any);
    }
  }, [chartData]);

  // Indicator Management
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    // EMA
    if (showEMA && !emaSeriesRef.current) {
      emaSeriesRef.current = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 2 });
    } else if (!showEMA && emaSeriesRef.current) {
      chart.removeSeries(emaSeriesRef.current);
      emaSeriesRef.current = null;
    }
    if (showEMA && emaSeriesRef.current && emaData.length > 0) {
      emaSeriesRef.current.setData(emaData as any);
    }

    // VWAP
    if (showVWAP && !vwapSeriesRef.current) {
      vwapSeriesRef.current = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 2, lineStyle: LineStyle.Dashed });
    } else if (!showVWAP && vwapSeriesRef.current) {
      chart.removeSeries(vwapSeriesRef.current);
      vwapSeriesRef.current = null;
    }
    if (showVWAP && vwapSeriesRef.current && vwapData.length > 0) {
      vwapSeriesRef.current.setData(vwapData as any);
    }

    // Bollinger
    if (showBollinger && !bbUpperRef.current) {
      bbUpperRef.current = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1 });
      bbMiddleRef.current = chart.addSeries(LineSeries, { color: '#64748b', lineWidth: 1 });
      bbLowerRef.current = chart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 1 });
    } else if (!showBollinger && bbUpperRef.current) {
      chart.removeSeries(bbUpperRef.current);
      chart.removeSeries(bbMiddleRef.current!);
      chart.removeSeries(bbLowerRef.current!);
      bbUpperRef.current = null;
      bbMiddleRef.current = null;
      bbLowerRef.current = null;
    }
    if (showBollinger && bollingerBandsData) {
      bbUpperRef.current?.setData(bollingerBandsData.upper as any);
      bbMiddleRef.current?.setData(bollingerBandsData.middle as any);
      bbLowerRef.current?.setData(bollingerBandsData.lower as any);
    }

    // Alert Price Line
    if (candleSeriesRef.current) {
        if (alertLineRef.current) {
            candleSeriesRef.current.removePriceLine(alertLineRef.current);
            alertLineRef.current = null;
        }
        if (alerts.targetPrice) {
            alertLineRef.current = candleSeriesRef.current.createPriceLine({
                price: alerts.targetPrice,
                color: '#f59e0b',
                lineWidth: 1,
                lineStyle: 1,
                axisLabelVisible: true,
                title: 'ALERT',
            });
        }
    }

  }, [showEMA, showVWAP, showBollinger, emaData, vwapData, bollingerBandsData, alerts.targetPrice]);

  // Sub-panes Init and Resize
  useEffect(() => {
    let rsiResize: () => void;
    let macdResize: () => void;

    if (showRSI && rsiContainerRef.current && !rsiChartRef.current) {
      const rsiChart = createChart(rsiContainerRef.current, {
        layout: { background: { type: ColorType.Solid, color: '#090d16' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: '#131a2b' }, horzLines: { color: '#131a2b' } },
        timeScale: { borderColor: '#1e293b', timeVisible: true, secondsVisible: false },
        rightPriceScale: { borderColor: '#1e293b' },
      });
      rsiChartRef.current = rsiChart;
      rsiSeriesRef.current = rsiChart.addSeries(LineSeries, { color: '#a78bfa', lineWidth: 2 });
      
      rsiSeriesRef.current.createPriceLine({ price: 70, color: '#f43f5e', lineWidth: 1, lineStyle: 2 });
      rsiSeriesRef.current.createPriceLine({ price: 30, color: '#10b981', lineWidth: 1, lineStyle: 2 });

      rsiResize = () => rsiChart.applyOptions({ width: rsiContainerRef.current!.clientWidth, height: rsiContainerRef.current!.clientHeight });
      window.addEventListener('resize', rsiResize);
      rsiResize();
    } else if (!showRSI && rsiChartRef.current) {
      rsiChartRef.current.remove();
      rsiChartRef.current = null;
      rsiSeriesRef.current = null;
    }

    if (showMACD && macdContainerRef.current && !macdChartRef.current) {
      const macdChart = createChart(macdContainerRef.current, {
        layout: { background: { type: ColorType.Solid, color: '#090d16' }, textColor: '#94a3b8' },
        grid: { vertLines: { color: '#131a2b' }, horzLines: { color: '#131a2b' } },
        timeScale: { borderColor: '#1e293b', timeVisible: true, secondsVisible: false },
        rightPriceScale: { borderColor: '#1e293b' },
      });
      macdChartRef.current = macdChart;
      histSeriesRef.current = macdChart.addSeries(HistogramSeries, {});
      macdSeriesRef.current = macdChart.addSeries(LineSeries, { color: '#3b82f6', lineWidth: 2 });
      signalSeriesRef.current = macdChart.addSeries(LineSeries, { color: '#f97316', lineWidth: 2 });

      macdResize = () => macdChart.applyOptions({ width: macdContainerRef.current!.clientWidth, height: macdContainerRef.current!.clientHeight });
      window.addEventListener('resize', macdResize);
      macdResize();
    } else if (!showMACD && macdChartRef.current) {
      macdChartRef.current.remove();
      macdChartRef.current = null;
      histSeriesRef.current = null;
      macdSeriesRef.current = null;
      signalSeriesRef.current = null;
    }

    return () => {
      if (rsiResize) window.removeEventListener('resize', rsiResize);
      if (macdResize) window.removeEventListener('resize', macdResize);
    };
  }, [showRSI, showMACD]);

  // Sync Sub-pane data
  useEffect(() => {
    if (showRSI && rsiSeriesRef.current && rsiData.length > 0) {
      rsiSeriesRef.current.setData(rsiData as any);
    }
    if (showMACD && macdData && histSeriesRef.current && macdSeriesRef.current && signalSeriesRef.current) {
      macdSeriesRef.current.setData(macdData.macd as any);
      signalSeriesRef.current.setData(macdData.signal as any);
      histSeriesRef.current.setData(macdData.histogram as any);
    }
  }, [showRSI, showMACD, rsiData, macdData]);


  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Toolbar */}
      <div className="h-10 bg-[#080b12] border-b border-slate-800/60 flex items-center justify-between px-3 z-10 shrink-0">
        <div className="flex items-center gap-1">
          {["1min", "5min", "15min", "60min"].map(int => (
            <button
              key={int}
              onClick={() => setActiveInterval(int)}
              className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
                activeInterval === int 
                  ? "bg-slate-800 text-emerald-400 border border-emerald-500/50" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              {int.replace("min", "m")}
            </button>
          ))}
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setStudiesOpen(!studiesOpen)}
            className="flex items-center gap-2 px-3 py-1 text-xs font-mono text-slate-300 hover:bg-slate-800/50 rounded transition-colors"
          >
            <Settings2 className="w-3 h-3" />
            Studies
          </button>
          
          {studiesOpen && (
            <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-800 rounded shadow-xl p-2 w-48 z-50">
              <label className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded cursor-pointer text-xs font-mono text-slate-300">
                <input type="checkbox" checked={showEMA} onChange={e => setIndicatorVisibility("EMA", e.target.checked)} className="accent-emerald-500" /> EMA 20
              </label>
              <label className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded cursor-pointer text-xs font-mono text-slate-300">
                <input type="checkbox" checked={showVWAP} onChange={e => setIndicatorVisibility("VWAP", e.target.checked)} className="accent-emerald-500" /> VWAP
              </label>
              <label className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded cursor-pointer text-xs font-mono text-slate-300">
                <input type="checkbox" checked={showBollinger} onChange={e => setIndicatorVisibility("Bollinger", e.target.checked)} className="accent-emerald-500" /> Bollinger Bands
              </label>
              <div className="h-px bg-slate-800 my-1"></div>
              <label className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded cursor-pointer text-xs font-mono text-slate-300">
                <input type="checkbox" checked={showRSI} onChange={e => setIndicatorVisibility("RSI", e.target.checked)} className="accent-emerald-500" /> RSI 14
              </label>
              <label className="flex items-center gap-2 p-1.5 hover:bg-slate-800 rounded cursor-pointer text-xs font-mono text-slate-300">
                <input type="checkbox" checked={showMACD} onChange={e => setIndicatorVisibility("MACD", e.target.checked)} className="accent-emerald-500" /> MACD
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Chart Panes */}
      <div className="flex-1 flex flex-col min-h-0">
        <div ref={chartContainerRef} className="flex-1 min-h-0" />
        
        {showRSI && (
          <div className="h-28 border-t border-slate-800/60 shrink-0 flex flex-col">
            <div className="text-[10px] font-mono text-slate-500 px-2 py-0.5 bg-[#090d16] absolute z-10 pointer-events-none">RSI (14)</div>
            <div ref={rsiContainerRef} className="flex-1" />
          </div>
        )}
        
        {showMACD && (
          <div className="h-32 border-t border-slate-800/60 shrink-0 flex flex-col">
            <div className="text-[10px] font-mono text-slate-500 px-2 py-0.5 bg-[#090d16] absolute z-10 pointer-events-none">MACD (12, 26, 9)</div>
            <div ref={macdContainerRef} className="flex-1" />
          </div>
        )}
      </div>
    </div>
  );
}
