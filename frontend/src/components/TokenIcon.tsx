import { cn } from "@/lib/utils";

export const TOKEN_META: Record<string, { bg: string; ring: string; label: string }> = {
  zkLTC: { bg: "from-sky-400 to-blue-500",      ring: "ring-sky-400/40",     label: "Ł" },
  WLTC:  { bg: "from-sky-500 to-blue-600",      ring: "ring-sky-500/40",     label: "Ł" },
  USDC:  { bg: "from-blue-500 to-indigo-600",   ring: "ring-blue-400/40",    label: "$" },
  USDT:  { bg: "from-emerald-400 to-green-600", ring: "ring-emerald-400/40", label: "₮" },
  WBTC:  { bg: "from-orange-400 to-amber-500",  ring: "ring-orange-400/40",  label: "₿" },
  DAI:   { bg: "from-yellow-400 to-amber-500",  ring: "ring-yellow-400/40",  label: "◈" },
  WETH:  { bg: "from-slate-400 to-slate-700",   ring: "ring-slate-300/40",   label: "Ξ" },
};

type Size = "xs" | "sm" | "md" | "lg";

const SIZE_CLASSES: Record<Size, string> = {
  xs: "w-5 h-5 text-[9px]",
  sm: "w-6 h-6 text-[11px]",
  md: "w-7 h-7 text-[12px]",
  lg: "w-9 h-9 text-[15px]",
};

export function TokenIcon({
  symbol,
  size = "sm",
  bordered = false,
  ringed = false,
}: {
  symbol: string;
  size?: Size;
  bordered?: boolean;
  ringed?: boolean;
}) {
  const meta = TOKEN_META[symbol] ?? {
    bg: "from-purple-500 to-pink-500",
    ring: "ring-purple-400/40",
    label: symbol.charAt(0).toUpperCase(),
  };
  return (
    <div
      className={cn(
        "rounded-full bg-gradient-to-br flex items-center justify-center font-black text-white flex-shrink-0 shadow-sm",
        SIZE_CLASSES[size],
        meta.bg,
        bordered && "border-2 border-black",
        ringed && `ring-2 ${meta.ring}`
      )}
    >
      {meta.label}
    </div>
  );
}
