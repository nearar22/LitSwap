import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { motion } from "framer-motion";
import { CommandPalette, CommandPaletteTrigger } from "./CommandPalette";

const navItems = [
  { to: "/swap", label: "Swap" },
  { to: "/pools", label: "Pools" },
  { to: "/liquidity", label: "Liquidity" },
  { to: "/wrap", label: "Wrap" },
  { to: "/portfolio", label: "Portfolio" },
];

export function AppShell() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-aurora -z-10" />
      <div className="pointer-events-none absolute inset-0 grid-bg -z-10" />

      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-4 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative h-9 w-9 rounded-xl bg-brand-gradient grid place-items-center ring-glow">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path d="M6 14l6-9 6 9-6 5z" fill="currentColor" className="text-[oklch(0.18_0.04_200)]" />
              </svg>
            </div>
            <div className="leading-none">
              <div className="font-display font-bold tracking-tight text-lg">LitSwap</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">LitVM Testnet</div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-4 glass rounded-full p-1">
            {navItems.map((n) => {
              const active = path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className="relative px-4 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-surface-3"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className={`relative ${active ? "text-foreground" : ""}`}>{n.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <CommandPaletteTrigger />
            <div className="hidden sm:flex items-center gap-2 glass rounded-full px-3 py-1.5 text-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-muted-foreground">Chain</span>
              <span className="font-medium">4441</span>
            </div>
            <ConnectButton
              chainStatus="none"
              showBalance={false}
              accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            />
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <CommandPalette />

      <footer className="border-t border-border/50 mt-20">
        <div className="mx-auto max-w-7xl px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <div>© {new Date().getFullYear()} LitSwap · Uniswap V2 fork on LitVM</div>
          <div className="flex gap-4">
            <a href="https://liteforge.explorer.caldera.xyz" target="_blank" rel="noreferrer" className="hover:text-foreground">Explorer</a>
            <a href="https://liteforge.rpc.caldera.xyz/http" target="_blank" rel="noreferrer" className="hover:text-foreground">RPC</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
