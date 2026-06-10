import React, { useMemo } from "react";
import { PnLSnapshot } from "../context/TradingDataContext";

const INITIAL_EQUITY = 100_000;

interface Props {
  history: PnLSnapshot[];
}

export default function PnLChart({ history }: Props) {
  const W = 260;
  const H = 90;
  const PAD = { top: 8, right: 8, bottom: 18, left: 8 };

  const points = useMemo(() => {
    if (history.length < 2) return null;
    const minE = Math.min(...history.map((h) => h.equity));
    const maxE = Math.max(...history.map((h) => h.equity));
    const range = maxE - minE || 1;
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    return history.map((snap, i) => ({
      x: PAD.left + (i / (history.length - 1)) * innerW,
      y: PAD.top + innerH - ((snap.equity - minE) / range) * innerH,
      equity: snap.equity,
    }));
  }, [history]);

  const current = history[history.length - 1]?.equity ?? INITIAL_EQUITY;
  const pnl = current - INITIAL_EQUITY;
  const isUp = pnl >= 0;
  const color = isUp ? "#10b981" : "#f43f5e";
  const fillId = "pnl-fill";

  if (!points || points.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600 text-xs font-mono gap-1">
        <span className="text-lg">📈</span>
        <span>P&L chart populates on first tick</span>
      </div>
    );
  }

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const lastPt = points[points.length - 1];
  const firstPt = points[0];
  const areaD =
    `${pathD} L${lastPt.x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} L${firstPt.x.toFixed(1)},${(H - PAD.bottom).toFixed(1)} Z`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-baseline justify-between mb-1 px-1">
        <span className="text-xs text-slate-500 font-mono tracking-wider">EQUITY CURVE</span>
        <span className={`text-xs font-mono font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
          {isUp ? "+" : ""}${pnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <svg width={W} height={H} className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.01" />
          </linearGradient>
        </defs>
        {/* Baseline at initial equity */}
        <line
          x1={PAD.left} x2={W - PAD.right}
          y1={H - PAD.bottom} y2={H - PAD.bottom}
          stroke="#1e293b" strokeWidth="1"
        />
        {/* Zero-basis dashed line */}
        <line
          x1={PAD.left} x2={W - PAD.right}
          y1={(() => {
            const minE = Math.min(...history.map((h) => h.equity));
            const maxE = Math.max(...history.map((h) => h.equity));
            const range = maxE - minE || 1;
            const innerH = H - PAD.top - PAD.bottom;
            return PAD.top + innerH - ((INITIAL_EQUITY - minE) / range) * innerH;
          })()}
          y2={(() => {
            const minE = Math.min(...history.map((h) => h.equity));
            const maxE = Math.max(...history.map((h) => h.equity));
            const range = maxE - minE || 1;
            const innerH = H - PAD.top - PAD.bottom;
            return PAD.top + innerH - ((INITIAL_EQUITY - minE) / range) * innerH;
          })()}
          stroke="#334155" strokeWidth="1" strokeDasharray="3 3"
        />
        {/* Area fill */}
        <path d={areaD} fill={`url(#${fillId})`} />
        {/* Line */}
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Live dot */}
        <circle cx={lastPt.x} cy={lastPt.y} r="2.5" fill={color} />
        {/* Labels */}
        <text x={PAD.left} y={H - 4} fontSize="9" fill="#475569" fontFamily="monospace">
          $100K
        </text>
        <text x={W - PAD.right} y={H - 4} fontSize="9" fill="#475569" fontFamily="monospace" textAnchor="end">
          ${(current / 1000).toFixed(1)}K
        </text>
      </svg>
    </div>
  );
}
