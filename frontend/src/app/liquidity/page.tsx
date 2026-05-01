import { LiquidityCard } from "@/components/liquidity/LiquidityCard";
import { Droplets } from "lucide-react";

export default function LiquidityPage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
          <Droplets className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-purple-300 font-medium">Liquidity Pools</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Provide Liquidity</h1>
        <p className="text-slate-400 max-w-md mx-auto text-sm">
          Deposit token pairs to earn 0.3% on every swap. LP tokens represent your share of the pool.
        </p>
      </div>
      <LiquidityCard />
    </div>
  );
}
