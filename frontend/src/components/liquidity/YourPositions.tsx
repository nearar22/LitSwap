"use client";

import { useReadContract, useReadContracts, useAccount } from "wagmi";
import { CONTRACTS, FACTORY_ABI, PAIR_ABI, ERC20_ABI, TOKENS, type Token } from "@/lib/contracts";
import { formatAmount } from "@/lib/utils";
import { Droplet } from "lucide-react";
import { TokenIcon } from "@/components/TokenIcon";

type Position = {
  pair: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  symbol0: string;
  symbol1: string;
  decimals0: number;
  decimals1: number;
  balance: bigint;
};

function findToken(addr: string): Token | null {
  const norm = addr.toLowerCase();
  if (norm === CONTRACTS.WLTC.toLowerCase()) {
    return TOKENS.find((t) => t.address === "native") ?? null;
  }
  return TOKENS.find((t) => t.address.toLowerCase() === norm) ?? null;
}

export function YourPositions({
  onSelect,
}: {
  onSelect: (tokenA: Token, tokenB: Token) => void;
}) {
  const { address, isConnected } = useAccount();

  const { data: pairsLength } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "allPairsLength",
    query: { enabled: isConnected, refetchInterval: 15000 },
  });

  const pairCount = pairsLength !== undefined ? Number(pairsLength) : 0;

  const { data: pairAddresses } = useReadContracts({
    contracts: Array.from({ length: pairCount }, (_, i) => ({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: "allPairs",
      args: [BigInt(i)],
    })),
    query: { enabled: pairCount > 0 },
  });

  const pairs = (pairAddresses ?? [])
    .map((r) => (r.status === "success" ? (r.result as unknown as `0x${string}`) : null))
    .filter((a): a is `0x${string}` => !!a);

  // Read token0, token1, user balance for each pair in parallel
  const { data: pairData } = useReadContracts({
    contracts: pairs.flatMap((pair) => [
      { address: pair, abi: PAIR_ABI, functionName: "token0" },
      { address: pair, abi: PAIR_ABI, functionName: "token1" },
      { address: pair, abi: PAIR_ABI, functionName: "balanceOf", args: address ? [address] : undefined },
    ]),
    query: { enabled: !!address && pairs.length > 0 },
  });

  // Collect token addresses to fetch metadata
  const tokenAddrs: `0x${string}`[] = [];
  const positions: (Omit<Position, "symbol0" | "symbol1" | "decimals0" | "decimals1"> | null)[] = [];

  if (pairData) {
    for (let i = 0; i < pairs.length; i++) {
      const t0 = pairData[i * 3]?.result as `0x${string}` | undefined;
      const t1 = pairData[i * 3 + 1]?.result as `0x${string}` | undefined;
      const bal = pairData[i * 3 + 2]?.result as bigint | undefined;
      if (!t0 || !t1 || !bal || bal === 0n) {
        positions.push(null);
        continue;
      }
      tokenAddrs.push(t0, t1);
      positions.push({ pair: pairs[i], token0: t0, token1: t1, balance: bal });
    }
  }

  const uniqueTokens = Array.from(new Set(tokenAddrs));

  const { data: tokenMeta } = useReadContracts({
    contracts: uniqueTokens.flatMap((addr) => [
      { address: addr, abi: ERC20_ABI, functionName: "symbol" },
      { address: addr, abi: ERC20_ABI, functionName: "decimals" },
    ]),
    query: { enabled: uniqueTokens.length > 0 },
  });

  const metaMap = new Map<string, { symbol: string; decimals: number }>();
  if (tokenMeta) {
    uniqueTokens.forEach((addr, i) => {
      const sym = tokenMeta[i * 2]?.result as string | undefined;
      const dec = tokenMeta[i * 2 + 1]?.result as number | undefined;
      if (sym && dec !== undefined) {
        metaMap.set(addr.toLowerCase(), { symbol: sym, decimals: Number(dec) });
      }
    });
  }

  const enriched: Position[] = positions
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => {
      const m0 = metaMap.get(p.token0.toLowerCase());
      const m1 = metaMap.get(p.token1.toLowerCase());
      return {
        ...p,
        symbol0: m0?.symbol ?? "?",
        symbol1: m1?.symbol ?? "?",
        decimals0: m0?.decimals ?? 18,
        decimals1: m1?.decimals ?? 18,
      };
    });

  if (!isConnected) return null;
  if (enriched.length === 0) return null;

  return (
    <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 mb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Droplet className="w-3.5 h-3.5 text-purple-400" />
        <span className="text-xs font-medium text-purple-300">Your Positions ({enriched.length})</span>
      </div>
      <div className="space-y-1.5">
        {enriched.map((pos) => {
          const t0 = findToken(pos.token0);
          const t1 = findToken(pos.token1);
          const displaySym0 = t0?.symbol ?? pos.symbol0;
          const displaySym1 = t1?.symbol ?? pos.symbol1;
          return (
            <button
              key={pos.pair}
              onClick={() => {
                if (t0 && t1) onSelect(t0, t1);
              }}
              disabled={!t0 || !t1}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  <TokenIcon symbol={displaySym0} size="sm" bordered />
                  <TokenIcon symbol={displaySym1} size="sm" bordered />
                </div>
                <span className="text-sm font-semibold text-white">
                  {displaySym0} / {displaySym1}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-400">LP</div>
                <div className="text-sm text-white font-medium">{formatAmount(pos.balance, 18, 6)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
