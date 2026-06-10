import React from "react";
import { useTradingData } from "../context/TradingDataContext";

const TICKERS = ["AAPL", "TSLA", "MSFT", "AMZN", "IBM", "NVDA", "META", "GOOGL"];

export default function Watchlist() {
  const { activeTicker, setActiveTicker, simulatedPrice, metrics } = useTradingData();

  return (
    <aside className="w-56 bg-[#0c0d14] border-r border-slate-800/60 flex flex-col shrink-0" data-testid="watchlist">
      <div className="p-3 border-b border-slate-800/60">
        <h2 className="text-xs font-bold text-slate-500 tracking-wider">WATCHLIST</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {TICKERS.map((ticker) => {
          const isActive = ticker === activeTicker;
          
          return (
            <button
              key={ticker}
              onClick={() => setActiveTicker(ticker)}
              data-testid={`button-watchlist-${ticker}`}
              className={`w-full flex items-center justify-between p-3 border-b border-slate-800/30 transition-colors hover:bg-slate-800/20 ${
                isActive ? "bg-slate-800/40 border-l-2 border-l-emerald-500" : "border-l-2 border-l-transparent"
              }`}
            >
              <div className="flex flex-col items-start">
                <span className={`font-mono font-bold ${isActive ? "text-white" : "text-slate-300"}`}>
                  {ticker}
                </span>
              </div>
              
              {isActive && simulatedPrice && metrics ? (
                <div className="flex flex-col items-end">
                  <span className="font-mono text-sm text-slate-200">${simulatedPrice.toFixed(2)}</span>
                  <span className={`font-mono text-xs ${metrics.percentChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {metrics.percentChange >= 0 ? "+" : ""}{metrics.percentChange.toFixed(2)}%
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-end text-slate-600 font-mono text-xs">
                  <span>---.--</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
