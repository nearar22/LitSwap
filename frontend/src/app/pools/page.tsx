"use client";

import { useReadContract } from "wagmi";
import { BarChart3, ExternalLink, ArrowRight } from "lucide-react";
import Link from "next/link";
import { CONTRACTS, FACTORY_ABI, PAIR_ABI, ERC20_ABI } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";
import { TokenIcon } from "@/components/TokenIcon";

function PoolRow({ pairAddress }: { pairAddress: string }) {
  const { data: token0 } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: PAIR_ABI,
    functionName: "token0",
  });
  const { data: token1 } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: PAIR_ABI,
    functionName: "token1",
  });
  const { data: reserves } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: PAIR_ABI,
    functionName: "getReserves",
    query: { refetchInterval: 15000 },
  });
  const { data: totalSupply } = useReadContract({
    address: pairAddress as `0x${string}`,
    abi: PAIR_ABI,
    functionName: "totalSupply",
  });
  const { data: sym0 } = useReadContract({
    address: token0 as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: !!token0 },
  });
  const { data: sym1 } = useReadContract({
    address: token1 as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "symbol",
    query: { enabled: !!token1 },
  });
  const { data: dec0 } = useReadContract({
    address: token0 as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!token0 },
  });
  const { data: dec1 } = useReadContract({
    address: token1 as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "decimals",
    query: { enabled: !!token1 },
  });

  if (!token0 || !token1) {
    return (
      <div className="glass rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-white/5 rounded w-1/3 mb-2" />
        <div className="h-3 bg-white/5 rounded w-1/2" />
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-4 glass-hover flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2">
          <TokenIcon symbol={(sym0 as string) ?? "?"} size="md" bordered />
          <TokenIcon symbol={(sym1 as string) ?? "?"} size="md" bordered />
        </div>
        <div>
          <div className="font-semibold text-white text-sm">
            {(sym0 as string) ?? "..."} / {(sym1 as string) ?? "..."}
          </div>
          <div className="text-xs text-slate-400">0.3% fee tier</div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-8 text-sm">
        <div className="text-right">
          <div className="text-slate-400 text-xs mb-0.5">Reserve {(sym0 as string) ?? "A"}</div>
          <div className="text-white font-medium">{reserves && dec0 !== undefined ? formatAmount(reserves[0], Number(dec0), 4) : "—"}</div>
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-xs mb-0.5">Reserve {(sym1 as string) ?? "B"}</div>
          <div className="text-white font-medium">{reserves && dec1 !== undefined ? formatAmount(reserves[1], Number(dec1), 4) : "—"}</div>
        </div>
        <div className="text-right">
          <div className="text-slate-400 text-xs mb-0.5">LP Supply</div>
          <div className="text-white font-medium">{totalSupply ? formatAmount(totalSupply, 18, 6) : "—"}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <a
          href={`https://liteforge.explorer.caldera.xyz/address/${pairAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="View on explorer"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
        <Link
          href="/liquidity"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium transition-colors"
        >
          Add <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

export default function PoolsPage() {
  const factoryDeployed =
    CONTRACTS.FACTORY !== "0x0000000000000000000000000000000000000000";

  const { data: pairsLength, isLoading, error } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "allPairsLength",
    query: { refetchInterval: 30000, enabled: factoryDeployed, retry: 1 },
  });

  const pairCount = pairsLength !== undefined ? Number(pairsLength) : 0;
  const showLoading = factoryDeployed && isLoading && !error && pairsLength === undefined;

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-4">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-purple-300 font-medium">All Pools</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Liquidity Pools</h1>
        <p className="text-slate-400 text-sm">All active pools on LitSwap. Earn fees by providing liquidity.</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{pairCount}</div>
          <div className="text-xs text-slate-400 mt-1">Total Pools</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">0.3%</div>
          <div className="text-xs text-slate-400 mt-1">Fee Tier</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">Live</div>
          <div className="text-xs text-slate-400 mt-1">LiteForge Testnet</div>
        </div>
      </div>

      {showLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-4 animate-pulse h-16" />
          ))}
        </div>
      ) : pairCount === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No pools yet</h3>
          <p className="text-slate-400 text-sm mb-6">Be the first to create a liquidity pool on LitSwap.</p>
          <Link
            href="/liquidity"
            className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm"
          >
            Create First Pool <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from({ length: pairCount }, (_, i) => i).map((i) => (
            <PairLoader key={i} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function PairLoader({ index }: { index: number }) {
  const { data: pairAddress } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "allPairs",
    args: [BigInt(index)],
  });

  if (!pairAddress) return <div className="glass rounded-xl p-4 h-16 animate-pulse" />;
  return <PoolRow pairAddress={pairAddress as string} />;
}
