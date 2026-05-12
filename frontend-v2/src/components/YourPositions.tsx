import { useMemo } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { type Address, formatUnits } from "viem";
import { Wallet, Droplets } from "lucide-react";
import { CONTRACTS, TOKENS, type Token } from "@/config/contracts";
import { FACTORY_ABI, PAIR_ABI } from "@/config/abis";
import { TokenLogo } from "./TokenSelect";
import { formatPretty } from "@/lib/swap";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

function tokenFor(addr?: Address): Token | undefined {
  if (!addr) return undefined;
  return TOKENS.find(
    (t) =>
      (t.isNative ? CONTRACTS.WLTC : t.address).toString().toLowerCase() ===
      addr.toLowerCase(),
  );
}

export function YourPositions({
  onSelect,
  className = "w-full max-w-[480px]",
}: {
  onSelect?: (a: Token, b: Token) => void;
  className?: string;
}) {
  const { address, isConnected } = useAccount();

  const total = useReadContract({
    abi: FACTORY_ABI,
    address: CONTRACTS.FACTORY,
    functionName: "allPairsLength",
  });
  const totalN = Number((total.data as bigint | undefined) ?? 0n);

  const indexes = useMemo(
    () => Array.from({ length: totalN }, (_, i) => BigInt(i)),
    [totalN],
  );

  const pairAddrs = useReadContracts({
    contracts: indexes.map((i) => ({
      abi: FACTORY_ABI,
      address: CONTRACTS.FACTORY,
      functionName: "allPairs",
      args: [i] as const,
    })) as never,
    query: { enabled: totalN > 0 },
  });

  const addrs = ((pairAddrs.data ?? []) as Array<{
    status: "success" | "failure";
    result?: unknown;
  }>)
    .map((r) => (r.status === "success" ? (r.result as Address) : null))
    .filter(Boolean) as Address[];

  // Per pair: token0, token1, balanceOf(user), totalSupply, reserves
  const calls = useReadContracts({
    contracts: addrs.flatMap((p) => [
      { abi: PAIR_ABI, address: p, functionName: "token0" },
      { abi: PAIR_ABI, address: p, functionName: "token1" },
      { abi: PAIR_ABI, address: p, functionName: "balanceOf", args: [address!] },
      { abi: PAIR_ABI, address: p, functionName: "totalSupply" },
      { abi: PAIR_ABI, address: p, functionName: "getReserves" },
    ]),
    query: { enabled: !!address && addrs.length > 0, refetchInterval: 10_000 },
  });

  const positions = useMemo(() => {
    if (!calls.data) return [];
    return addrs
      .map((p, i) => {
        const t0 = calls.data[i * 5]?.result as Address | undefined;
        const t1 = calls.data[i * 5 + 1]?.result as Address | undefined;
        const bal = (calls.data[i * 5 + 2]?.result as bigint | undefined) ?? 0n;
        const supply = (calls.data[i * 5 + 3]?.result as bigint | undefined) ?? 0n;
        const reserves = calls.data[i * 5 + 4]?.result as
          | readonly [bigint, bigint, number]
          | undefined;
        return {
          pair: p,
          token0: tokenFor(t0),
          token1: tokenFor(t1),
          balance: bal,
          totalSupply: supply,
          reserve0: reserves?.[0] ?? 0n,
          reserve1: reserves?.[1] ?? 0n,
        };
      })
      .filter((x) => x.balance > 0n && x.token0 && x.token1);
  }, [calls.data, addrs]);

  const loading =
    total.isLoading || pairAddrs.isLoading || (addrs.length > 0 && calls.isLoading);

  if (!isConnected) return null;

  return (
    <div className={`glass-strong rounded-3xl p-5 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="h-4 w-4 text-brand" />
        <h3 className="text-sm font-semibold">Your Positions</h3>
        {positions.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {positions.length} pool{positions.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-surface/60">
              <div className="flex -space-x-2">
                <Skeleton className="h-7 w-7 rounded-full" />
                <Skeleton className="h-7 w-7 rounded-full" />
              </div>
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-2.5 w-32" />
              </div>
              <div className="space-y-1.5 items-end flex flex-col">
                <Skeleton className="h-2.5 w-14" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : positions.length === 0 ? (
        <EmptyState
          className="py-8"
          icon={<Droplets className="h-5 w-5" />}
          title="No positions yet"
          description="Add liquidity below to earn the 0.30% swap fee on every trade in your pool."
        />
      ) : (
        <div className="space-y-2">
          {positions.map((p) => {
            const share =
              p.totalSupply > 0n
                ? Number((p.balance * 10_000n) / p.totalSupply) / 100
                : 0;
            return (
              <button
                key={p.pair}
                onClick={() => onSelect?.(p.token0!, p.token1!)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-surface hover:bg-surface-2 transition-colors text-left"
              >
                <div className="flex -space-x-2">
                  <TokenLogo token={p.token0!} size={28} />
                  <TokenLogo token={p.token1!} size={28} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">
                    {p.token0!.symbol} / {p.token1!.symbol}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Pool share: <span className="num">{share.toFixed(4)}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">LP balance</div>
                  <div className="text-xs num font-medium">
                    {formatPretty(Number(formatUnits(p.balance, 18)), 6)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
