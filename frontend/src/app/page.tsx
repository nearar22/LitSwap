import { SwapCard } from "@/components/swap/SwapCard";
import { StatsBar } from "@/components/StatsBar";
import { TrendingUp, Zap, Shield, Coins } from "lucide-react";

const FEATURES = [
  { icon: Zap, title: "Lightning Fast", desc: "Sub-second finality on LitVM's ZK rollup" },
  { icon: Shield, title: "Non-Custodial", desc: "You always own your keys and funds" },
  { icon: Coins, title: "Sub-cent Fees", desc: "~$0.01 per swap, paid in zkLTC" },
  { icon: TrendingUp, title: "Deep Liquidity", desc: "Concentrated AMM with efficient capital" },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      <StatsBar />

      <SwapCard />

      <div className="mt-16">
        <h2 className="text-center text-2xl font-bold text-gradient mb-8">Why LitSwap?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-xl p-4 text-center glass-hover">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 flex items-center justify-center mx-auto mb-3">
                <Icon className="w-5 h-5 text-purple-400" />
              </div>
              <div className="font-semibold text-white text-sm mb-1">{title}</div>
              <div className="text-xs text-slate-400">{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
