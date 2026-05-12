import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import { ArrowDownUp, Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CONTRACTS, TOKENS } from "@/config/contracts";
import { WLTC_ABI } from "@/config/abis";
import { TokenLogo } from "./TokenSelect";
import { TokenInfoPopover } from "./TokenInfoPopover";
import { formatPretty } from "@/lib/swap";
import { txPending, txSuccess, txError } from "@/lib/tx-toast";

type Mode = "wrap" | "unwrap";

const NATIVE = TOKENS.find((t) => t.isNative)!;
const WLTC = TOKENS.find((t) => t.symbol === "WLTC") ?? {
  symbol: "WLTC",
  name: "Wrapped zkLTC",
  address: CONTRACTS.WLTC,
  decimals: 18,
  isNative: false as const,
};

export function WrapCard() {
  const { address, isConnected } = useAccount();
  const [mode, setMode] = useState<Mode>("wrap");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  // Balances
  const nativeBal = useBalance({ address, query: { enabled: !!address, refetchInterval: 8_000 } });
  const wltcBal = useReadContract({
    abi: WLTC_ABI,
    address: CONTRACTS.WLTC,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8_000 },
  });

  const fromToken = mode === "wrap" ? NATIVE : WLTC;
  const toToken = mode === "wrap" ? WLTC : NATIVE;

  const fromBalance =
    mode === "wrap"
      ? (nativeBal.data?.value ?? 0n)
      : ((wltcBal.data as bigint | undefined) ?? 0n);
  const toBalance =
    mode === "wrap"
      ? ((wltcBal.data as bigint | undefined) ?? 0n)
      : (nativeBal.data?.value ?? 0n);

  const parsed = useMemo(() => {
    if (!amount || isNaN(Number(amount))) return 0n;
    try {
      return parseUnits(amount as `${number}`, 18);
    } catch {
      return 0n;
    }
  }, [amount]);

  const insufficient = isConnected && parsed > 0n && parsed > fromBalance;

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Fire loading toast when a tx hash appears
  useEffect(() => {
    if (txHash && pending) txPending(mode, `${pending}ping…`);
  }, [txHash, pending, mode]);

  // Success + reset on confirmation
  useEffect(() => {
    if (confirmed) {
      if (pending) {
        txSuccess(mode, `${pending} successful`, txHash);
        setPending(null);
      }
      setAmount("");
      reset();
      nativeBal.refetch();
      wltcBal.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  function flip() {
    setMode((m) => (m === "wrap" ? "unwrap" : "wrap"));
    setAmount("");
  }

  function setPct(pct: number) {
    if (!fromBalance) return;
    // Leave a tiny dust for gas when wrapping the full native balance.
    const reserveGas = mode === "wrap" && pct === 100 ? parseUnits("0.01", 18) : 0n;
    const cap = fromBalance > reserveGas ? fromBalance - reserveGas : 0n;
    const v = (cap * BigInt(pct)) / 100n;
    setAmount(formatUnits(v, 18));
  }

  function submit() {
    if (parsed === 0n) return;
    const label = mode === "wrap" ? "Wrap" : "Unwrap";
    setPending(label);
    const onError = {
      onError: (e: unknown) => {
        txError(mode, `${label} failed`, e);
        setPending(null);
      },
    };
    if (mode === "wrap") {
      writeContract(
        {
          abi: WLTC_ABI,
          address: CONTRACTS.WLTC,
          functionName: "deposit",
          value: parsed,
        },
        onError,
      );
    } else {
      writeContract(
        {
          abi: WLTC_ABI,
          address: CONTRACTS.WLTC,
          functionName: "withdraw",
          args: [parsed],
        },
        onError,
      );
    }
  }

  const disabled = parsed === 0n || insufficient || isPending || confirming;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-3xl w-full max-w-[480px] p-5 shadow-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold">{mode === "wrap" ? "Wrap" : "Unwrap"}</h2>
          <p className="text-xs text-muted-foreground">
            {mode === "wrap" ? "Convert zkLTC to WLTC (1:1)" : "Convert WLTC back to zkLTC (1:1)"}
          </p>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-wider rounded-full bg-brand/15 text-brand px-2.5 py-1">
          1 : 1
        </div>
      </div>

      {/* From */}
      <div className="bg-surface rounded-2xl p-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>You {mode === "wrap" ? "wrap" : "unwrap"}</span>
          {isConnected && (
            <button
              type="button"
              onClick={() => setPct(100)}
              className="hover:text-foreground transition-colors"
            >
              Balance:{" "}
              <span className="num text-foreground/80">
                {formatPretty(Number(formatUnits(fromBalance, 18)), 6)}
              </span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <input
            inputMode="decimal"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
            className="num bg-transparent outline-none flex-1 text-3xl font-semibold placeholder:text-muted-foreground/50 min-w-0"
          />
          <div className="flex items-center gap-1.5 shrink-0 bg-surface-3 rounded-full pl-1.5 pr-3 py-1.5">
            <TokenLogo token={fromToken} size={26} />
            <span className="font-semibold">{fromToken.symbol}</span>
            <TokenInfoPopover token={fromToken} />
          </div>
        </div>
        {/* Percent shortcuts */}
        {isConnected && fromBalance > 0n && (
          <div className="mt-3 flex gap-1.5">
            {[25, 50, 75, 100].map((p) => (
              <button
                key={p}
                onClick={() => setPct(p)}
                className="text-[11px] px-2 py-1 rounded-md bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {p === 100 ? "MAX" : `${p}%`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Flip */}
      <div className="relative h-0">
        <button
          onClick={flip}
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-surface-3 border-4 border-card grid place-items-center hover:bg-surface-2 hover:rotate-180 transition-all duration-300"
          aria-label="Flip"
        >
          <ArrowDownUp className="h-4 w-4" />
        </button>
      </div>

      {/* To */}
      <div className="bg-surface rounded-2xl p-4 mt-1">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>You receive</span>
          {isConnected && (
            <span>
              Balance:{" "}
              <span className="num text-foreground/80">
                {formatPretty(Number(formatUnits(toBalance, 18)), 6)}
              </span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="num flex-1 text-3xl font-semibold min-w-0 truncate">
            {parsed > 0n ? amount : <span className="text-muted-foreground/50">0.0</span>}
          </div>
          <div className="flex items-center gap-1.5 shrink-0 bg-surface-3 rounded-full pl-1.5 pr-3 py-1.5">
            <TokenLogo token={toToken} size={26} />
            <span className="font-semibold">{toToken.symbol}</span>
            <TokenInfoPopover token={toToken} />
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-4">
        {!isConnected ? (
          <div className="grid place-items-center [&>div]:w-full">
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={openConnectModal}
                  className="w-full h-14 rounded-2xl bg-brand-gradient text-[oklch(0.18_0.04_200)] font-bold text-base hover:brightness-110 transition-all"
                >
                  Connect Wallet
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        ) : (
          <button
            onClick={submit}
            disabled={disabled}
            className="w-full h-14 rounded-2xl bg-brand-gradient text-[oklch(0.18_0.04_200)] font-bold text-base hover:brightness-110 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {(isPending || confirming) && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirming
              ? `${mode === "wrap" ? "Wrapping" : "Unwrapping"}…`
              : isPending
              ? "Confirm in wallet…"
              : insufficient
              ? `Insufficient ${fromToken.symbol}`
              : parsed === 0n
              ? "Enter an amount"
              : mode === "wrap"
              ? "Wrap zkLTC"
              : "Unwrap WLTC"}
            {!isPending && !confirming && parsed > 0n && !insufficient && <Zap className="h-4 w-4" />}
          </button>
        )}
      </div>

      <p className="mt-3 text-[11px] text-muted-foreground text-center">
        WLTC is the ERC-20 wrapper of zkLTC used by liquidity pools. Wrap is reversible 1:1 at any time.
      </p>
    </motion.div>
  );
}
