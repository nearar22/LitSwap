import { useEffect, useState } from "react";
import { TOKENS, type Token, tokenForAddress } from "@/config/contracts";
import { ChevronDown, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useReadContracts } from "wagmi";
import { ERC20_ABI } from "@/config/abis";
import { formatUnits, type Address } from "viem";
import { useBalance } from "wagmi";
import { TOKEN_ICON } from "./tokenIcons";

function tokenColor(symbol: string) {
  const map: Record<string, string> = {
    zkLTC: "from-[oklch(0.86_0.17_165)] to-[oklch(0.72_0.18_220)]",
    WLTC: "from-[oklch(0.7_0.15_220)] to-[oklch(0.55_0.2_240)]",
    USDC: "from-[oklch(0.7_0.15_240)] to-[oklch(0.55_0.18_240)]",
    USDT: "from-[oklch(0.78_0.15_155)] to-[oklch(0.6_0.18_155)]",
    WBTC: "from-[oklch(0.78_0.18_55)] to-[oklch(0.6_0.2_40)]",
    DAI: "from-[oklch(0.83_0.16_80)] to-[oklch(0.7_0.18_60)]",
    WETH: "from-[oklch(0.7_0.05_280)] to-[oklch(0.5_0.06_280)]",
  };
  return map[symbol] ?? "from-muted to-surface-3";
}

/**
 * Token logo. Uses bundled inline SVGs (no network). Falls back to a coloured
 * gradient + first letter for any token that doesn't have a registered icon.
 * Wrapped tokens (W-prefixed, except WLTC) get a tiny "W" badge in the corner.
 */
export function TokenLogo({ token, size = 32 }: { token: Token; size?: number }) {
  const Icon = TOKEN_ICON[token.symbol];
  const showWrappedBadge =
    !token.isNative && /^W[A-Z]/.test(token.symbol) && token.symbol !== "WLTC";
  const dim = { width: size, height: size };

  if (!Icon) {
    return (
      <div
        className={`relative rounded-full bg-gradient-to-br ${tokenColor(token.symbol)} grid place-items-center text-[oklch(0.15_0.03_240)] font-bold shadow-md shrink-0`}
        style={{ ...dim, fontSize: size * 0.38 }}
      >
        {token.symbol.slice(0, 1)}
        {showWrappedBadge && <WrappedBadge size={size} />}
      </div>
    );
  }

  return (
    <div
      className="relative rounded-full shrink-0 overflow-hidden shadow-md"
      style={dim}
      title={token.symbol}
    >
      <Icon size={size} />
      {showWrappedBadge && <WrappedBadge size={size} />}
    </div>
  );
}

function WrappedBadge({ size }: { size: number }) {
  // Show only for tokens >= 18px to keep things readable.
  if (size < 18) return null;
  const badge = Math.max(10, Math.round(size * 0.42));
  return (
    <span
      className="absolute -bottom-0.5 -right-0.5 grid place-items-center rounded-full bg-brand text-[oklch(0.18_0.04_200)] font-bold shadow ring-2 ring-[var(--color-card)]"
      style={{ width: badge, height: badge, fontSize: badge * 0.62, lineHeight: 1 }}
      aria-label="Wrapped token"
    >
      W
    </span>
  );
}

export function TokenSelectorButton({
  token,
  onClick,
  placeholder = "Select",
}: {
  token: Token | null;
  onClick: () => void;
  placeholder?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 transition-all hover:scale-[1.02] ${
        token
          ? "bg-surface-3 hover:bg-surface-3/80"
          : "bg-brand-gradient text-[oklch(0.18_0.04_200)] hover:brightness-110"
      }`}
    >
      {token ? (
        <>
          <TokenLogo token={token} size={26} />
          <span className="font-semibold">{token.symbol}</span>
        </>
      ) : (
        <span className="px-2 font-semibold">{placeholder}</span>
      )}
      <ChevronDown className="h-4 w-4 opacity-70" />
    </button>
  );
}

export function TokenSelectModal({
  open,
  onClose,
  onSelect,
  exclude,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (t: Token) => void;
  exclude?: Token | null;
}) {
  const [q, setQ] = useState("");
  const { address } = useAccount();
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const filtered = TOKENS.filter(
    (t) =>
      (!exclude || tokenKey(t) !== tokenKey(exclude)) &&
      (t.symbol.toLowerCase().includes(q.toLowerCase()) ||
        t.name.toLowerCase().includes(q.toLowerCase())),
  );

  const erc20s = filtered.filter((t) => !t.isNative) as Token[];
  const balances = useReadContracts({
    contracts: erc20s.map((t) => ({
      abi: ERC20_ABI,
      address: t.address as Address,
      functionName: "balanceOf",
      args: address ? [address] : undefined,
    })),
    query: { enabled: open && !!address },
  });
  const nativeBal = useBalance({ address, query: { enabled: open && !!address } });

  function balOf(t: Token): string {
    if (t.isNative) {
      const v = nativeBal.data?.value;
      return v ? formatUnits(v, 18) : "0";
    }
    const idx = erc20s.findIndex((x) => x.address === t.address);
    const r = balances.data?.[idx];
    if (r?.status === "success") return formatUnits(r.result as bigint, t.decimals);
    return "0";
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md grid place-items-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-md rounded-3xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="text-lg font-semibold">Select a token</h3>
              <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full hover:bg-surface-3">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5">
              <div className="flex items-center gap-2 bg-surface rounded-2xl px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name or symbol"
                  className="bg-transparent outline-none w-full placeholder:text-muted-foreground"
                />
              </div>
            </div>
            <div className="mt-4 max-h-[420px] overflow-y-auto">
              {filtered.map((t) => (
                <button
                  key={tokenKey(t)}
                  onClick={() => {
                    onSelect(t);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-2 transition-colors"
                >
                  <TokenLogo token={t} size={36} />
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold">{t.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate">{t.name}</div>
                  </div>
                  {address && (
                    <div className="num text-sm text-muted-foreground tabular-nums">
                      {Number(balOf(t)).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                    </div>
                  )}
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-5 pb-5">
                  <div className="rounded-2xl border border-dashed border-border/60 bg-surface/40 py-8 px-4 text-center">
                    <div className="mx-auto mb-2 h-10 w-10 rounded-xl bg-surface-3 grid place-items-center">
                      <Search className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-sm font-medium">No tokens match</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Try a different symbol or name.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const tokenKey = (t: Token) => `${t.symbol}-${t.address}`;
export { tokenForAddress };
