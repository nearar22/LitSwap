import { useState, type ReactNode } from "react";
import { Copy, ExternalLink, Check, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CONTRACTS, type Token } from "@/config/contracts";
import { TokenLogo } from "./TokenSelect";

const EXPLORER = "https://liteforge.explorer.caldera.xyz";

/**
 * Click/hover trigger that reveals token metadata: address, decimals, copy, explorer.
 * Wrap any element to make it the trigger, or use `<TokenInfoPopover.Trigger />` for a default `i` button.
 */
export function TokenInfoPopover({
  token,
  children,
  align = "right",
}: {
  token: Token;
  children?: ReactNode;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const addr = token.isNative ? CONTRACTS.WLTC : (token.address as `0x${string}`);
  const short = `${addr.slice(0, 6)}…${addr.slice(-4)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={(e) => {
          // close when focus leaves the popover container
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
            setTimeout(() => setOpen(false), 120);
          }
        }}
        className="inline-flex items-center"
      >
        {children ?? (
          <span className="h-5 w-5 grid place-items-center rounded-full bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors">
            <Info className="h-3 w-3" />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.14 }}
            className={`absolute z-50 top-full mt-2 ${
              align === "right" ? "right-0" : "left-0"
            } w-72 glass-strong rounded-2xl p-4 shadow-2xl`}
          >
            <div className="flex items-center gap-3 mb-3">
              <TokenLogo token={token} size={36} />
              <div className="min-w-0">
                <div className="font-semibold text-sm">{token.symbol}</div>
                <div className="text-xs text-muted-foreground truncate">{token.name}</div>
              </div>
              {token.isNative && (
                <span className="ml-auto text-[10px] uppercase tracking-wider rounded-full bg-brand/15 text-brand px-2 py-0.5 font-semibold">
                  Native
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Row label="Address">
                <code className="num text-xs text-foreground/90">{short}</code>
              </Row>
              <Row label="Decimals">
                <span className="num text-xs">{token.decimals}</span>
              </Row>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-surface hover:bg-surface-2 px-3 py-2 text-xs font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-brand" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </>
                )}
              </button>
              <a
                href={`${EXPLORER}/address/${addr}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-surface hover:bg-surface-2 px-3 py-2 text-xs font-medium transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Explorer
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface/60 px-3 py-2">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}
