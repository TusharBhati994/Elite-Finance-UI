import React from "react";
import { useTradingData } from "../context/TradingDataContext";

function MetricRow({ label, value, valueClass = "text-slate-200" }: { label: string, value: string | React.ReactNode, valueClass?: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-800/30 last:border-0">
      <span className="text-xs text-slate-500 font-mono">{label}</span>
      <span className={`text-sm font-mono font-bold ${valueClass}`}>{value}</span>
    </div>
  );
}

export default function MetricsSidebar() {
  const { simulatedPrice, priceFlash, metrics, activeInterval, chartData, error } = useTradingData();

  const formatVol = (vol: number) => {
    if (vol >= 1e6) return (vol / 1e6).toFixed(2) + "M";
    if (vol >= 1e3) return (vol / 1e3).toFixed(2) + "K";
    return vol.toString();
  };

  return (
    <aside className="w-64 bg-[#0c0d14] border-l border-slate-800/60 p-4 flex flex-col shrink-0 overflow-y-auto" data-testid="metrics-sidebar">
      <h2 className="text-xs font-bold text-slate-500 tracking-wider mb-4">MARKET DATA</h2>
      
      <div className="bg-slate-900/50 border border-slate-800/60 rounded p-3 mb-6">
        <div className="text-xs text-slate-500 font-mono mb-1">LATEST PRICE</div>
        <div className={`text-2xl font-mono font-bold transition-colors ${
          priceFlash === "up" ? "text-emerald-400" :
          priceFlash === "down" ? "text-rose-400" :
          "text-slate-100"
        }`}>
          ${simulatedPrice ? simulatedPrice.toFixed(2) : "---.--"}
        </div>
      </div>

      <div className="flex flex-col gap-1 mb-8">
        <MetricRow label="OPEN" value={metrics ? `$${metrics.open.toFixed(2)}` : "---"} />
        <MetricRow label="HIGH" value={metrics ? `$${metrics.high.toFixed(2)}` : "---"} valueClass="text-emerald-400" />
        <MetricRow label="LOW" value={metrics ? `$${metrics.low.toFixed(2)}` : "---"} valueClass="text-rose-400" />
        <MetricRow label="VOLUME" value={metrics ? formatVol(metrics.volume) : "---"} />
        <MetricRow 
          label="CHANGE" 
          value={metrics ? `${metrics.change >= 0 ? "+" : ""}${metrics.change.toFixed(2)}` : "---"} 
          valueClass={metrics && metrics.change >= 0 ? "text-emerald-400" : metrics && metrics.change < 0 ? "text-rose-400" : ""} 
        />
        <MetricRow 
          label="% CHANGE" 
          value={metrics ? `${metrics.percentChange >= 0 ? "+" : ""}${metrics.percentChange.toFixed(2)}%` : "---"} 
          valueClass={metrics && metrics.percentChange >= 0 ? "text-emerald-400" : metrics && metrics.percentChange < 0 ? "text-rose-400" : ""} 
        />
        <MetricRow 
          label="DAY RANGE" 
          value={metrics ? `${metrics.low.toFixed(2)} — ${metrics.high.toFixed(2)}` : "---"} 
          valueClass="text-slate-400 text-xs" 
        />
      </div>

      <h2 className="text-xs font-bold text-slate-500 tracking-wider mb-4">SESSION SUMMARY</h2>
      <div className="bg-slate-900/50 border border-slate-800/60 rounded p-3 flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 font-mono">STATUS</span>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${error ? "bg-rose-500" : "bg-emerald-500"}`}></div>
            <span className="text-xs text-slate-300 font-mono">{error ? "ERROR" : "LIVE"}</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 font-mono">CANDLES</span>
          <span className="text-xs text-slate-300 font-mono">{chartData.length}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-slate-500 font-mono">INTERVAL</span>
          <span className="text-xs text-slate-300 font-mono">{activeInterval}</span>
        </div>
      </div>

    </aside>
  );
}
