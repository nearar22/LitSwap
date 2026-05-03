"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Zap, Droplet } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Swap" },
  { href: "/liquidity", label: "Liquidity" },
  { href: "/pools", label: "Pools" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/5 glass">
      <div className="container mx-auto px-4 max-w-6xl h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/logo.svg" alt="LitSwap Logo" className="w-9 h-9 drop-shadow-lg group-hover:drop-shadow-[0_0_12px_rgba(168,85,247,0.6)] transition-all duration-300" />
            <span className="font-bold text-xl text-gradient">LitSwap</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  pathname === link.href
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://testnet.litvm.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/20 hover:bg-sky-500/20 hover:border-sky-400/40 transition-all group"
          >
            <Droplet className="w-3.5 h-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
            <span className="text-xs text-sky-300 font-medium">Faucet</span>
          </a>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">LiteForge</span>
          </div>
          <ConnectButton
            showBalance={false}
            chainStatus="icon"
            accountStatus="avatar"
          />
        </div>
      </div>
    </header>
  );
}
