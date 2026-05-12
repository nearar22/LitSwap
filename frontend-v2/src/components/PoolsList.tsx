import { useReadContract, useReadContracts } from "wagmi";
import { CONTRACTS, TOKENS } from "@/config/contracts";
import { FACTORY_ABI, PAIR_ABI } from "@/config/abis";
import { type Address, formatUnits } from "viem";
import { TokenLogo } from "./TokenSelect";
import { useMemo } from "react";
import { Droplets, ExternalLink, Plus } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

function findToken(addr: Address) {
  return TOKENS.find(
    (t) => (t.isNative ? CONTRACTS.WLTC : t.address).toString().toLowerCase() === addr.toLowerCase(),
  );
}

export function PoolsList() {
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

  const addrs = ((pairAddrs.data ?? []) as Array<{ status: string; result?: unknown }>)
    .map((r) => (r.status === "success" ? (r.result as Address) : null))
    .filter(Boolean) as Address[];

  const meta = useReadContracts({
    contracts: addrs.flatMap((p) => [
      { abi: PAIR_ABI, address: p, functionName: "token0" },
      { abi: PAIR_ABI, address: p, functionName: "token1" },
      { abi: PAIR_ABI, address: p, functionName: "getReserves" },
    ]),
    query: { enabled: addrs.length > 0 },
  });

  const pairs = useMemo(() => {
    if (!meta.data) return [];
    return addrs.map((p, i) => {
      const t0 = meta.data[i * 3]?.result as Address | undefined;
      const t1 = meta.data[i * 3 + 1]?.result as Address | undefined;
      const r = meta.data[i * 3 + 2]?.result as readonly [bigint, bigint, number] | undefined;
      return {
        address: p,
        token0: t0 ? findToken(t0) : undefined,
        token1: t1 ? findToken(t1) : undefined,
        reserve0: r?.[0] ?? 0n,
        reserve1: r?.[1] ?? 0n,
      };
    });
  }, [meta.data, addrs]);

  const loading = len.isLoading || pairAddrs.isLoading || meta.isLoading;

  return (
    <div className="glass-strong rounded-3xl overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border/50">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Droplets className="h-4 w-4 text-brand" /> All Pools
          </h2>
          <p className="text-xs text-muted-foreground">{total} pair{total === 1 ? "" : "s"} on the LitSwap factory</p>
        </div>
      </div>

      {loading ? (
        <div>
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div className="col-span-5">Pair</div>
            <div className="col-span-3 text-right">Reserve A</div>
            <div className="col-span-3 text-right">Reserve B</div>
            <div className="col-span-1" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="grid grid-cols-12 items-center px-5 py-4 border-t border-border/30">
              <div className="col-span-5 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-7 w-7 rounded-full" />
                </div>
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-2.5 w-40" />
                </div>
              </div>
              <div className="col-span-3 flex justify-end"><Skeleton className="h-3.5 w-20" /></div>
              <div className="col-span-3 flex justify-end"><Skeleton className="h-3.5 w-20" /></div>
              <div className="col-span-1 flex justify-end"><Skeleton className="h-7 w-7 rounded-lg" /></div>
            </div>
          ))}
        </div>
      ) : pairs.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={<Droplets className="h-6 w-6" />}
            title="No pools yet"
            description="Be the first to seed liquidity on LitSwap. Add a pair and start earning the 0.30% swap fee."
            action={
              <Link
                to="/liquidity"
                className="inline-flex items-center gap-2 rounded-full bg-brand-gradient text-[oklch(0.18_0.04_200)] font-semibold px-5 py-2.5 text-sm hover:opacity-95 transition-opacity"
              >
                <Plus className="h-4 w-4" /> Add Liquidity
              </Link>
            }
          />
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          <div className="grid grid-cols-12 px-5 py-3 text-[11px] uppercase tracking-wider text-muted-foreground">
            <div className="col-span-5">Pair</div>
            <div className="col-span-3 text-right">Reserve A</div>
            <div className="col-span-3 text-right">Reserve B</div>
            <div className="col-span-1" />
          </div>
          {pairs.map((p) => (
            <div key={p.address} className="grid grid-cols-12 items-center px-5 py-4 hover:bg-surface-2/50 transition-colors">
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="flex -space-x-2">
                  {p.token0 && <TokenLogo token={p.token0} size={28} />}
                  {p.token1 && <TokenLogo token={p.token1} size={28} />}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">
                    {p.token0?.symbol ?? "?"} / {p.token1?.symbol ?? "?"}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{p.address}</div>
                </div>
              </div>
              <div className="col-span-3 text-right num text-sm">
                {p.token0 ? Number(formatUnits(p.reserve0, p.token0.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : "-"}
              </div>
              <div className="col-span-3 text-right num text-sm">
                {p.token1 ? Number(formatUnits(p.reserve1, p.token1.decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 }) : "-"}
              </div>
              <a
                href={`https://liteforge.explorer.caldera.xyz/address/${p.address}`}
                target="_blank"
                rel="noreferrer"
                className="col-span-1 justify-self-end h-8 w-8 grid place-items-center rounded-lg hover:bg-surface-3 text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
