import React from "react";
import { TradingDataProvider } from "./context/TradingDataContext";
import Header from "./components/Header";
import Watchlist from "./components/Watchlist";
import TradingViewChart from "./components/TradingViewChart";
import MetricsSidebar from "./components/MetricsSidebar";
import PaperTrading from "./components/PaperTrading";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  return (
    <TooltipProvider>
      <TradingDataProvider>
        <div className="h-screen w-screen bg-[#0c0d14] overflow-hidden flex flex-col select-none text-slate-200 font-sans">
          <Header />
          <div className="flex flex-1 overflow-hidden min-h-0">
            <Watchlist />
            <main className="flex-1 flex flex-col overflow-hidden min-w-0">
              <TradingViewChart />
              <PaperTrading />
            </main>
            <MetricsSidebar />
          </div>
        </div>
        <Toaster position="top-right" theme="dark" />
      </TradingDataProvider>
    </TooltipProvider>
  );
}

export default App;
