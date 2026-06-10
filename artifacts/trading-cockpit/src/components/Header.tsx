import React, { useState, useEffect } from "react";
import { useTradingData } from "../context/TradingDataContext";
import { Bell, Activity, Wifi } from "lucide-react";

export default function Header() {
  const { activeTicker, simulatedPrice, priceFlash, metrics, alerts, setAlertPrice, loading, error } = useTradingData();
  const [alertInput, setAlertInput] = useState("");
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSetAlert = () => {
    const parsed = parseFloat(alertInput);
    if (!isNaN(parsed) && parsed > 0) {
      setAlertPrice(parsed);
      setAlertInput("");
    }
  };

  return (
    <header className="h-14 bg-[#0c0d14] border-b border-slate-800/60 flex items-center justify-between px-4 select-none shrink-0" data-testid="header">
      {/* Left */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-500" />
          <span className="font-mono text-xs text-slate-400 font-bold tracking-widest">APEX TERMINAL</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-white tracking-wider" data-testid="text-active-ticker">{activeTicker}</span>
          {loading && (
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          )}
        </div>
      </div>

      {/* Center */}
      <div className="flex items-center gap-4">
        {error ? (
           <div className="text-xs text-rose-500 border border-rose-500/30 bg-rose-500/10 px-2 py-1 rounded">
             {error}
           </div>
        ) : (
          <>
            <div className={`px-4 py-1 border rounded text-xl font-bold font-mono transition-colors duration-150 ${
              priceFlash === "up" ? "bg-emerald-950/50 border-emerald-500 text-emerald-400" :
              priceFlash === "down" ? "bg-rose-950/50 border-rose-500 text-rose-400" :
              "bg-slate-800/50 border-slate-700 text-slate-100"
            }`} data-testid="text-live-price">
              ${simulatedPrice ? simulatedPrice.toFixed(2) : "---.--"}
            </div>
            
            {metrics && (
              <div className={`text-sm font-mono font-bold ${metrics.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {metrics.change >= 0 ? "+" : ""}{metrics.change.toFixed(2)} ({metrics.change >= 0 ? "+" : ""}{metrics.percentChange.toFixed(2)}%)
              </div>
            )}
          </>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {alerts.targetPrice ? (
            <div className="flex items-center gap-2 text-xs font-mono text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded" data-testid="badge-alert-active">
              <Bell className="w-3 h-3" />
              <span>${alerts.targetPrice.toFixed(2)}</span>
              <button onClick={() => setAlertPrice(null)} className="ml-1 hover:text-amber-400" data-testid="button-clear-alert">✕</button>
            </div>
          ) : (
            <div className="flex items-center">
              <input
                type="number"
                value={alertInput}
                onChange={(e) => setAlertInput(e.target.value)}
                placeholder="Alert price..."
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs px-2 py-1 w-24 rounded-l focus:outline-none focus:border-emerald-500 font-mono"
                data-testid="input-alert-price"
              />
              <button 
                onClick={handleSetAlert}
                className="bg-slate-800 border border-slate-700 border-l-0 px-2 py-1 rounded-r hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition-colors"
                data-testid="button-set-alert"
              >
                <Bell className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
        <div className="w-[1px] h-6 bg-slate-800/60"></div>
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Wifi className={`w-3 h-3 ${loading ? 'text-amber-500' : error ? 'text-rose-500' : 'text-emerald-500'}`} />
          {time}
        </div>
      </div>
    </header>
  );
}
