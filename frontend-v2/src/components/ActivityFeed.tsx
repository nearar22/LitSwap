import { useEffect, useMemo, useState } from "react";
import { useReadContract, useReadContracts, usePublicClient } from "wagmi";
import {
  type Address,
  type AbiEvent,
  type Log,
  formatUnits,
  parseAbiItem,
} from "viem";
import { Activity, ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { CONTRACTS, TOKENS, type Token } from "@/config/contracts";
import { FACTORY_ABI, PAIR_ABI } from "@/config/abis";
import { TokenLogo } from "./TokenSelect";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPretty } from "@/lib/swap";

const EXPLORER = "https://liteforge.explorer.caldera.xyz";
const SWAP_EVENT = parseAbiItem(
  "event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)",
) as AbiEvent;
const LOOKBACK_BLOCKS = 5_000n;
const REFRESH_MS = 12_000;

function tokenFor(addr?: Address): Token | undefined {
  if (!addr) return undefined;
  return TOKENS.find(
    (t) =>
      (t.isNative ? CONTRACTS.WLTC : t.address).toString().toLowerCase() ===
      addr.toLowerCase(),
  );
}

type SwapRow = {
  txHash: `0x${string}`;
  pair: Address;
  blockNumber: bigint;
  sender: Address;
  to: Address;
  amount0In: bigint;
  amount1In: bigint;
  amount0Out: bigint;
  amount1Out: bigint;
};

export function ActivityFeed({ limit = 8 }: { limit?: number }) {
  const client = usePublicClient();

  // 1. Resolve all pair addresses (and their token0/token1)
  const len = useReadContract({
    abi: FACTORY_ABI,
    address: CONTRACTS.FACTORY,
    functionName: "allPairsLength",
  });
  const total = Number((len.data as bigint | undefined) ?? 0n);
  const indexes = useMemo(() => Array.from({ length: total }, (_, i) => BigInt(i)), [total]);

  const pairAddrs = useReadContracts({
    contracts: indexes.map((i) => ({
      abi: FACTORY_ABI,
      address: CONTRACTS.FACTORY,
      functionName: "allPairs",
      args: [i] as const,
    })) as never,
    query: { enabled: total > 0 },
  });

  const addrs = useMemo<Address[]>(() => {
    const data = (pairAddrs.data ?? []) as Array<{ status: string; result?: unknown }>;
    return data
      .map((r) => (r.status === "success" ? (r.result as Address) : null))
      .filter(Boolean) as Address[];
  }, [pairAddrs.data]);

  const tokenMeta = useReadContracts({
    contracts: addrs.flatMap((p) => [
      { abi: PAIR_ABI, address: p, functionName: "token0" },
      { abi: PAIR_ABI, address: p, functionName: "token1" },
    ]),
    query: { enabled: addrs.length > 0 },
  });

  const pairTokens = useMemo(() => {
    const m = new Map<Address, { t0?: Token; t1?: Token }>();
    if (!tokenMeta.data) return m;
    addrs.forEach((p, i) => {
      const t0 = tokenMeta.data[i * 2]?.result as Address | undefined;
      const t1 = tokenMeta.data[i * 2 + 1]?.result as Address | undefined;
      m.set(p, { t0: tokenFor(t0), t1: tokenFor(t1) });
    });
    return m;
  }, [tokenMeta.data, addrs]);

  // 2. Periodically fetch Swap logs across all pairs
  const [rows, setRows] = useState<SwapRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!client || addrs.length === 0) return;
    let cancelled = false;

    async function load() {
      try {
        const head = await client!.getBlockNumber();
        const fromBlock = head > LOOKBACK_BLOCKS ? head - LOOKBACK_BLOCKS : 0n;
        const logs = (await client!.getLogs({
          address: addrs,
          event: SWAP_EVENT,
          fromBlock,
          toBlock: head,
        })) as Array<Log<bigint, number, false, typeof SWAP_EVENT>>;
        if (cancelled) return;
        const mapped: SwapRow[] = logs
          .map((l) => {
            const a = l.args as {
              sender?: Address;
              to?: Address;
              amount0In?: bigint;
              amount1In?: bigint;
              amount0Out?: bigint;
              amount1Out?: bigint;
            };
            return {
              txHash: l.transactionHash!,
              pair: l.address as Address,
              blockNumber: l.blockNumber!,
              sender: (a.sender ?? "0x0000000000000000000000000000000000000000") as Address,
              to: (a.to ?? "0x0000000000000000000000000000000000000000") as Address,
              amount0In: a.amount0In ?? 0n,
              amount1In: a.amount1In ?? 0n,
              amount0Out: a.amount0Out ?? 0n,
              amount1Out: a.amount1Out ?? 0n,
            };
          })
          .sort((a, b) => Number(b.blockNumber - a.blockNumber))
          .slice(0, limit);
        setRows(mapped);
        setLoaded(true);
      } catch {
        setLoaded(true);
      }
    }

    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [client, addrs, limit]);

  return (
    <div className="glass-strong rounded-3xl overflow-hidden w-full">
      <div className="flex items-center justify-between p-5 border-b border-border/40">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand" /> Live Activity
          </h2>
          <p className="text-xs text-muted-foreground">Recent swaps across all LitSwap pools</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider rounded-full bg-brand/15 text-brand px-2 py-0.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inset-0 rounded-full bg-brand animate-ping opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-brand" />
          </span>
          Live
        </span>
      </div>

      {!loaded && total > 0 ? (
        <div className="divide-y divide-border/30">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3.5">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<Sparkles className="h-5 w-5" />}
            title="No swaps yet"
            description="Be the first to trade on LitSwap. Your swap will show up live here for everyone to see."
          />
        </div>
      ) : (
        <ul className="divide-y divide-border/30">
          {rows.map((r) => {
            const meta = pairTokens.get(r.pair);
            const t0 = meta?.t0;
            const t1 = meta?.t1;
            // Direction: if amount0In > 0 → swapped t0 → t1
            const in0to1 = r.amount0In > 0n;
            const tokenIn = in0to1 ? t0 : t1;
            const tokenOut = in0to1 ? t1 : t0;
            const amountIn = in0to1 ? r.amount0In : r.amount1In;
            const amountOut = in0to1 ? r.amount1Out : r.amount0Out;
            const inStr =
              tokenIn ? formatPretty(Number(formatUnits(amountIn, tokenIn.decimals)), 4) : "-";
            const outStr =
              tokenOut ? formatPretty(Number(formatUnits(amountOut, tokenOut.decimals)), 4) : "-";
            const short = `${r.sender.slice(0, 6)}…${r.sender.slice(-4)}`;
            return (
              <li
                key={r.txHash}
                className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-2/40 transition-colors"
              >
                <div className="flex -space-x-2 shrink-0">
                  {tokenIn && <TokenLogo token={tokenIn} size={26} />}
                  {tokenOut && <TokenLogo token={tokenOut} size={26} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                    <span className="num">{inStr}</span>
                    <span className="text-muted-foreground">{tokenIn?.symbol ?? "?"}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="num">{outStr}</span>
                    <span className="text-muted-foreground">{tokenOut?.symbol ?? "?"}</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">{short}</div>
                </div>
                <a
                  href={`${EXPLORER}/tx/${r.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-7 w-7 grid place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors"
                  aria-label="View transaction"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
