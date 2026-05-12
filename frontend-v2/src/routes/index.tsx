import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Zap, Droplets, ShieldCheck, Activity } from "lucide-react";
import { SwapCard } from "@/components/SwapCard";
import { ActivityFeed } from "@/components/ActivityFeed";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "LitSwap · DEX on LitVM Testnet" },
      { name: "description", content: "Sub-second swaps and concentrated liquidity on LitVM, the ZK rollup powered by Litecoin. Trade zkLTC, USDC, USDT, WBTC, DAI and more." },
    ],
  }),
});

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-2xl px-5 py-4">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold num">{value}</div>
    </div>
  );
}

function Index() {
  return (
    <div>
      <section className="relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-10 pb-16 grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 glass rounded-full px-3 py-1 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              Live on LitVM Testnet · Chain 4441
            </div>
            <h1 className="mt-5 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              Trade at the speed of <span className="text-gradient-brand">light</span>.
            </h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl">
              LitSwap is a Uniswap V2-style exchange built on LitVM.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/swap"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl bg-brand-gradient text-[oklch(0.18_0.04_200)] font-bold hover:brightness-110 transition-all"
              >
                Launch App <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/pools"
                className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl glass hover:bg-surface-3 font-semibold transition-colors"
              >
                Explore Pools
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 max-w-md">
              <Stat label="Block Time" value="~1s" />
              <Stat label="Trade Fee" value="0.30%" />
              <Stat label="Tokens" value="7" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="justify-self-center lg:justify-self-end w-full max-w-[460px]"
          >
            <SwapCard />
          </motion.div>
        </div>
      </section>

      {/* Live Activity */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-12">
        <ActivityFeed limit={8} />
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 pb-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Zap, title: "Sub-second finality", desc: "Trades settle in ~1s thanks to LitVM's ZK rollup architecture." },
            { icon: ShieldCheck, title: "Litecoin security", desc: "Inherits the trust model of one of the longest-running blockchains." },
            { icon: Droplets, title: "V2 liquidity", desc: "Battle-tested constant-product pools, fork of Uniswap V2." },
            { icon: Activity, title: "On-chain quotes", desc: "Live router quotes, no off-chain orderbook, no middlemen." },
          ].map((f) => (
            <div key={f.title} className="glass rounded-2xl p-5">
              <div className="h-10 w-10 rounded-xl bg-surface-3 grid place-items-center text-brand">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-semibold">{f.title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
