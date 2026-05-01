"use client";

import { useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { type Token, TOKENS } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { TokenIcon as SharedTokenIcon } from "@/components/TokenIcon";

interface TokenSelectorProps {
  selected: Token | null;
  onSelect: (token: Token) => void;
  exclude?: Token | null;
  label: string;
}

export function TokenSelector({ selected, onSelect, exclude, label }: TokenSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = TOKENS.filter(
    (t) =>
      t.address !== exclude?.address &&
      (t.symbol.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-2xl font-semibold text-sm transition-all flex-shrink-0",
          selected
            ? "bg-white/[0.08] hover:bg-white/[0.12] text-white border border-white/10"
            : "bg-purple-600 hover:bg-purple-500 text-white px-3"
        )}
      >
        {selected ? (
          <>
            <TokenIcon token={selected} />
            <span className="ml-0.5">{selected.symbol}</span>
          </>
        ) : (
          <span>{label}</span>
        )}
        <ChevronDown className="w-3.5 h-3.5 opacity-60 ml-0.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative glass rounded-2xl w-full max-w-sm p-4 shadow-2xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Select token</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or symbol"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl input-dark text-sm"
              />
            </div>

            <div className="flex flex-col gap-1 max-h-72 overflow-y-auto scrollbar-hide">
              {filtered.map((token) => (
                <button
                  key={token.address}
                  onClick={() => {
                    onSelect(token);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all glass-hover",
                    selected?.address === token.address && "bg-purple-500/20 border border-purple-500/30"
                  )}
                >
                  <TokenIcon token={token} size="lg" />
                  <div>
                    <div className="font-semibold text-white text-sm">{token.symbol}</div>
                    <div className="text-xs text-slate-400">{token.name}</div>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center text-slate-500 py-8 text-sm">No tokens found</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function TokenIcon({ token, size = "sm" }: { token: Token; size?: "sm" | "lg" }) {
  return <SharedTokenIcon symbol={token.symbol} size={size} ringed={size === "lg"} />;
}
