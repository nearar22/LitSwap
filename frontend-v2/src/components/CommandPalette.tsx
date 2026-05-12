import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRightLeft,
  Plus,
  Minus,
  Droplets,
  ExternalLink,
  Copy,
  Search,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Globe,
  Briefcase,
} from "lucide-react";
import { CONTRACTS, TOKENS, type Token } from "@/config/contracts";
import { TokenLogo } from "./TokenSelect";
import { toast } from "sonner";

const EXPLORER = "https://liteforge.explorer.caldera.xyz";
const FAUCET = "https://liteforge.bridge.caldera.xyz";

type Item = {
  id: string;
  label: string;
  hint?: string;
  group: "Navigate" | "Actions" | "Tokens" | "Resources";
  keywords?: string;
  icon: React.ReactNode;
  onSelect: () => void;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Global hotkey: ⌘K / Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isToggle) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  function go(to: string) {
    navigate({ to });
    setOpen(false);
  }

  async function copyAddr(t: Token) {
    const addr = t.isNative ? CONTRACTS.WLTC : t.address;
    try {
      await navigator.clipboard.writeText(addr);
      toast.success(`Copied ${t.symbol} address`);
    } catch {
      toast.error("Clipboard blocked");
    }
    setOpen(false);
  }

  function openExplorer(addr: string) {
    window.open(`${EXPLORER}/address/${addr}`, "_blank", "noopener");
    setOpen(false);
  }

  const items = useMemo<Item[]>(() => {
    const nav: Item[] = [
      { id: "go-swap", group: "Navigate", label: "Swap", hint: "Go to swap page", icon: <ArrowRightLeft className="h-4 w-4" />, onSelect: () => go("/swap") },
      { id: "go-pools", group: "Navigate", label: "Pools", hint: "Browse all pools", icon: <Droplets className="h-4 w-4" />, onSelect: () => go("/pools") },
      { id: "go-liq-add", group: "Navigate", label: "Add Liquidity", icon: <Plus className="h-4 w-4" />, onSelect: () => go("/liquidity") },
      { id: "go-liq-remove", group: "Navigate", label: "Remove Liquidity", icon: <Minus className="h-4 w-4" />, onSelect: () => go("/liquidity") },
      { id: "go-wrap", group: "Navigate", label: "Wrap / Unwrap zkLTC", hint: "Convert between zkLTC and WLTC", icon: <ArrowRightLeft className="h-4 w-4" />, keywords: "wrap unwrap wltc", onSelect: () => go("/wrap") },
      { id: "go-portfolio", group: "Navigate", label: "Portfolio", hint: "Your balances and LP positions", icon: <Briefcase className="h-4 w-4" />, keywords: "portfolio balances positions holdings", onSelect: () => go("/portfolio") },
    ];

    const actions: Item[] = [
      {
        id: "act-faucet",
        group: "Actions",
        label: "Open LitVM Faucet",
        hint: "Get testnet zkLTC",
        icon: <Sparkles className="h-4 w-4" />,
        onSelect: () => {
          window.open(FAUCET, "_blank", "noopener");
          setOpen(false);
        },
      },
      {
        id: "act-copy-factory",
        group: "Actions",
        label: "Copy Factory address",
        hint: CONTRACTS.FACTORY,
        icon: <Copy className="h-4 w-4" />,
        keywords: "factory contract",
        onSelect: async () => {
          await navigator.clipboard.writeText(CONTRACTS.FACTORY).catch(() => {});
          toast.success("Copied Factory address");
          setOpen(false);
        },
      },
      {
        id: "act-copy-router",
        group: "Actions",
        label: "Copy Router address",
        hint: CONTRACTS.ROUTER,
        icon: <Copy className="h-4 w-4" />,
        keywords: "router contract",
        onSelect: async () => {
          await navigator.clipboard.writeText(CONTRACTS.ROUTER).catch(() => {});
          toast.success("Copied Router address");
          setOpen(false);
        },
      },
    ];

    const tokenItems: Item[] = TOKENS.flatMap((t) => {
      const addr = t.isNative ? CONTRACTS.WLTC : (t.address as `0x${string}`);
      return [
        {
          id: `tok-copy-${t.symbol}`,
          group: "Tokens" as const,
          label: `Copy ${t.symbol} address`,
          hint: `${addr.slice(0, 10)}…${addr.slice(-6)}`,
          icon: <TokenLogo token={t} size={20} />,
          keywords: `${t.symbol} ${t.name} ${addr}`,
          onSelect: () => copyAddr(t),
        },
        {
          id: `tok-explorer-${t.symbol}`,
          group: "Tokens" as const,
          label: `View ${t.symbol} on Explorer`,
          icon: <ExternalLink className="h-4 w-4" />,
          keywords: `${t.symbol} ${t.name} explorer`,
          onSelect: () => openExplorer(addr),
        },
      ];
    });

    const resources: Item[] = [
      {
        id: "res-explorer",
        group: "Resources",
        label: "Open Block Explorer",
        icon: <Globe className="h-4 w-4" />,
        onSelect: () => {
          window.open(EXPLORER, "_blank", "noopener");
          setOpen(false);
        },
      },
      {
        id: "res-rpc",
        group: "Resources",
        label: "Copy RPC URL",
        hint: "liteforge.rpc.caldera.xyz",
        icon: <Copy className="h-4 w-4" />,
        onSelect: async () => {
          await navigator.clipboard
            .writeText("https://liteforge.rpc.caldera.xyz/http")
            .catch(() => {});
          toast.success("Copied RPC URL");
          setOpen(false);
        },
      },
    ];

    return [...nav, ...actions, ...tokenItems, ...resources];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) =>
      `${it.label} ${it.hint ?? ""} ${it.keywords ?? ""}`.toLowerCase().includes(term),
    );
  }, [q, items]);

  const grouped = useMemo(() => {
    const map = new Map<Item["group"], Item[]>();
    for (const it of filtered) {
      const arr = map.get(it.group) ?? [];
      arr.push(it);
      map.set(it.group, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[active]?.onSelect();
    }
  }

  // Scroll active row into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-md flex items-start justify-center pt-[12vh] px-4"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Search */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border/40">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type a command, token, or action…"
                className="bg-transparent outline-none flex-1 text-[15px] placeholder:text-muted-foreground"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground border border-border/50">
                ESC
              </kbd>
            </div>

            {/* List */}
            <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
              {filtered.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                  No results for <span className="text-foreground font-medium">"{q}"</span>
                </div>
              )}

              {grouped.map(([group, list]) => (
                <div key={group} className="px-2 mb-2">
                  <div className="px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80">
                    {group}
                  </div>
                  {list.map((it) => {
                    const idx = filtered.indexOf(it);
                    const isActive = idx === active;
                    return (
                      <button
                        key={it.id}
                        data-idx={idx}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => it.onSelect()}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
                          isActive ? "bg-surface-2" : "hover:bg-surface/60"
                        }`}
                      >
                        <span
                          className={`h-8 w-8 grid place-items-center rounded-lg ${
                            isActive ? "bg-brand/15 text-brand" : "bg-surface text-muted-foreground"
                          }`}
                        >
                          {it.icon}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">{it.label}</span>
                          {it.hint && (
                            <span className="block text-[11px] text-muted-foreground truncate font-mono">
                              {it.hint}
                            </span>
                          )}
                        </span>
                        {isActive && (
                          <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/40 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded bg-surface px-1.5 py-0.5 border border-border/50">
                    <ArrowUp className="h-2.5 w-2.5 inline" />
                  </kbd>
                  <kbd className="rounded bg-surface px-1.5 py-0.5 border border-border/50">
                    <ArrowDown className="h-2.5 w-2.5 inline" />
                  </kbd>
                  navigate
                </span>
                <span className="inline-flex items-center gap-1">
                  <kbd className="rounded bg-surface px-1.5 py-0.5 border border-border/50">
                    <CornerDownLeft className="h-2.5 w-2.5 inline" />
                  </kbd>
                  select
                </span>
              </div>
              <span>{filtered.length} result{filtered.length === 1 ? "" : "s"}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Small button to open the palette; render in header. */
export function CommandPaletteTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
      className="hidden md:inline-flex items-center gap-2 h-9 px-3 rounded-full glass hover:bg-surface/70 transition-colors text-xs text-muted-foreground"
      aria-label="Open command palette"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Search…</span>
      <kbd className="ml-2 rounded bg-surface px-1.5 py-0.5 text-[10px] font-mono border border-border/50">
        ⌘K
      </kbd>
    </button>
  );
}
