import { useMemo } from "react";
import { useAccount, useBalance, useReadContracts } from "wagmi";
import { formatUnits, type Address } from "viem";
import { Coins, ExternalLink } from "lucide-react";
import { CONTRACTS, TOKENS, type Token } from "@/config/contracts";
import { ERC20_ABI } from "@/config/abis";
import { TokenLogo } from "./TokenSelect";
import { TokenInfoPopover } from "./TokenInfoPopover";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPretty } from "@/lib/swap";

const EXPLORER = "https://liteforge.explorer.caldera.xyz";

export function TokenBalances() {
  const { address, isConnected } = useAccount();

  // Native balance (zkLTC)
  const native = useBalance({
    address,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  // ERC-20 balances
  const erc20s = useMemo(() => TOKENS.filter((t) => !t.isNative) as Token[], []);
  const calls = useReadContracts({
    contracts: erc20s.map((t) => ({
      abi: ERC20_ABI,
      address: t.address as Address,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
    })),
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const rows = useMemo(() => {
    return TOKENS.map((t) => {
      if (t.isNative) {
        const v = native.data?.value ?? 0n;
        return { token: t, raw: v };
      }
      const idx = erc20s.findIndex((x) => x.address === t.address);
      const r = calls.data?.[idx];
      const raw = r?.status === "success" ? (r.result as bigint) : 0n;
      return { token: t, raw };
    }).sort((a, b) => {
      // sort by balance desc, keeping zeros last
      if (a.raw === b.raw) return 0;
      return a.raw > b.raw ? -1 : 1;
    });
  }, [native.data, calls.data, erc20s]);

  const loading = native.isLoading || calls.isLoading;
  const totalHolding = rows.filter((r) => r.raw > 0n).length;

  if (!isConnected) {
    return (
      <EmptyState
        icon={<Coins className="h-5 w-5" />}
        title="Connect your wallet"
        description="Connect a wallet to see your token balances and LP positions on LitSwap."
      />
    );
  }

  return (
    <div className="glass-strong rounded-3xl overflow-hidden">
      <div className="flex items-center justify-between p-5 border-b border-border/40">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Coins className="h-4 w-4 text-brand" /> Token Balances
          </h2>
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Fetching…"
              : `${totalHolding} of ${rows.length} tokens held`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="divide-y divide-border/30">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border/30">
          {rows.map(({ token, raw }) => {
            const amount = Number(formatUnits(raw, token.decimals));
            const addr = token.isNative ? CONTRACTS.WLTC : (token.address as Address);
            const zero = raw === 0n;
            return (
              <li
                key={token.symbol}
                className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                  zero ? "opacity-55" : "hover:bg-surface-2/40"
                }`}
              >
                <TokenLogo token={token} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm">{token.symbol}</span>
                    {token.isNative && (
                      <span className="text-[10px] uppercase tracking-wider rounded-full bg-brand/15 text-brand px-1.5 py-0.5 font-semibold">
                        Native
                      </span>
                    )}
                    <TokenInfoPopover token={token} />
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">{token.name}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="num text-sm font-semibold tabular-nums">
                    {zero ? "0" : formatPretty(amount, 6)}
                  </div>
                  <a
                    href={`${EXPLORER}/address/${addr}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Explorer <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
