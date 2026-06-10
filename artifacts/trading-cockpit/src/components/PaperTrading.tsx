import React, { useState } from "react";
import { useTradingData } from "../context/TradingDataContext";
import PnLChart from "./PnLChart";

export default function PaperTrading() {
  const { portfolio, pnlHistory, activeTicker, simulatedPrice, executeTrade, closePosition } = useTradingData();
  const [qty, setQty] = useState<string>("100");
  const [stopLoss, setStopLoss] = useState("");
const [targetPrice, setTargetPrice] = useState("");

  const totalPnL = portfolio.positions.reduce((acc, pos) => {
    // simplistic pnl, uses simulatedPrice if active ticker, else 0 change
    const currentPrice = pos.ticker === activeTicker && simulatedPrice ? simulatedPrice : pos.entryPrice;
    const pl = (currentPrice - pos.entryPrice) * pos.qty * (pos.direction === "LONG" ? 1 : -1);
    return acc + pl;
  }, 0);

  const handleTrade = (action: "buy" | "sell") => {
    const q = parseInt(qty);
    if (!isNaN(q) && q > 0) {
      executeTrade(action, q);
    }
  };

  return (
    <div className="h-44 bg-[#080b12] border-t border-slate-800/60 flex shrink-0" data-testid="paper-trading-panel">
      {/* Account Ledger */}
      <div className="w-64 p-4 border-r border-slate-800/60 flex flex-col justify-center">
        <h3 className="text-xs font-bold text-slate-500 tracking-wider mb-4">VIRTUAL ACCOUNT</h3>
        <div className="mb-3">
          <div className="text-xs text-slate-400 font-mono mb-1">CASH AVAILABLE</div>
          <div className={`text-xl font-mono font-bold ${portfolio.cash > 0 ? "text-emerald-400" : "text-rose-400"}`}>
            ${portfolio.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400 font-mono mb-1">UNREALIZED P&L</div>
          <div className={`text-sm font-mono font-bold ${totalPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {totalPnL >= 0 ? "+" : ""}${totalPnL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Order Entry */}
     <div className="w-64 p-4 border-r border-slate-800/60 flex flex-col justify-start">
         <div className="flex items-center justify-between mb-4">
           <span className="text-sm font-bold text-slate-300 font-mono">{activeTicker}</span>
           <span className="text-sm font-bold text-slate-300 font-mono">${simulatedPrice?.toFixed(2) || "---.--"}</span>
         </div>
         <div className="mb-4">

  <input
    type="number"
    placeholder="Stop Loss"
    value={stopLoss}
    onChange={(e) => setStopLoss(e.target.value)}
    className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded mb-2"
  />

  <input
    type="number"
    placeholder="Target Price"
    value={targetPrice}
    onChange={(e) => setTargetPrice(e.target.value)}
    className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded mb-2"
  />

  <div className="flex items-center gap-2">
    <label className="text-xs text-slate-500 font-mono">QTY</label>

    <input
      type="number"
      value={qty}
      onChange={(e) => setQty(e.target.value)}
      className="flex-1 bg-slate-900 border border-slate-700 text-slate-200 px-2 py-1 rounded"
    />
  </div>

</div>
         <div className="flex gap-2">
           <button 
             onClick={() => handleTrade("buy")}
             className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 rounded transition-colors text-sm"
             data-testid="button-buy"
           >
             BUY
           </button>
           <button 
             onClick={() => handleTrade("sell")}
             className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-1.5 rounded transition-colors text-sm"
             data-testid="button-sell"
           >
             SELL
           </button>
         </div>
      </div>

      {/* P&L Equity Curve Chart */}
      <div className="w-72 p-3 border-r border-slate-800/60 flex flex-col justify-center">
        <PnLChart history={pnlHistory} />
      </div>

      {/* Open Positions */}
      <div className="flex-1 p-0 overflow-y-auto">
        <table className="w-full text-left font-mono text-sm border-collapse">
          <thead className="sticky top-0 bg-[#080b12] shadow-[0_1px_0_0_#1e293b]">
            <tr>
              <th className="px-4 py-2 text-xs text-slate-500 font-medium tracking-wider">TICKER</th>
              <th className="px-4 py-2 text-xs text-slate-500 font-medium tracking-wider">SIDE</th>
              <th className="px-4 py-2 text-xs text-slate-500 font-medium tracking-wider text-right">QTY</th>
              <th className="px-4 py-2 text-xs text-slate-500 font-medium tracking-wider text-right">ENTRY</th>
              <th className="px-4 py-2 text-xs text-slate-500 font-medium tracking-wider text-right">LIVE</th>
              <th className="px-4 py-2 text-xs text-slate-500 font-medium tracking-wider text-right">P&L</th>
              <th className="px-4 py-2 text-xs text-slate-500 font-medium tracking-wider text-center">CLOSE</th>
            </tr>
          </thead>
          <tbody>
            {portfolio.positions.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500 text-sm">
                  No open positions
                </td>
              </tr>
            ) : (
              portfolio.positions.map((pos, idx) => {
                const livePrice = pos.ticker === activeTicker && simulatedPrice ? simulatedPrice : pos.entryPrice;
                const pl = (livePrice - pos.entryPrice) * pos.qty * (pos.direction === "LONG" ? 1 : -1);
                
                return (
                  <tr key={`${pos.ticker}-${idx}`} className="border-b border-slate-800/30 hover:bg-slate-800/20">
                    <td className="px-4 py-2 font-bold text-slate-300">{pos.ticker}</td>
                    <td className={`px-4 py-2 font-bold ${pos.direction === "LONG" ? "text-emerald-500" : "text-rose-500"}`}>{pos.direction}</td>
                    <td className="px-4 py-2 text-right text-slate-300">{pos.qty}</td>
                    <td className="px-4 py-2 text-right text-slate-400">${pos.entryPrice.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right text-slate-300">${livePrice.toFixed(2)}</td>
                    <td className={`px-4 py-2 text-right font-bold ${pl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {pl >= 0 ? "+" : ""}{pl.toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button 
                        onClick={() => closePosition(pos.ticker)}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs transition-colors"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
