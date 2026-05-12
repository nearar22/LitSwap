import { useEffect, useMemo, useState } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatUnits, parseUnits, type Address, maxUint256 } from "viem";
import { ArrowDownUp, Settings2, Loader2, Zap, Info } from "lucide-react";
import { motion } from "framer-motion";
import { TOKENS, type Token, CONTRACTS } from "@/config/contracts";
import { ERC20_ABI, ROUTER_ABI } from "@/config/abis";
import { TokenSelectorButton, TokenSelectModal, TokenLogo } from "./TokenSelect";
import { TokenInfoPopover } from "./TokenInfoPopover";
import { applySlippage, calcPriceImpact, deadlineMinutes, formatPretty } from "@/lib/swap";
import { FACTORY_ABI, PAIR_ABI } from "@/config/abis";
import { useBestRoute } from "@/lib/useBestRoute";
import { txPending, txSuccess, txError } from "@/lib/tx-toast";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const SLIPPAGE_OPTIONS = [10, 50, 100]; // bps

export function SwapCard() {
  const { address, isConnected } = useAccount();

  const [tokenIn, setTokenIn] = useState<Token>(TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token>(TOKENS[2]);
  const [amountIn, setAmountIn] = useState("");
  const [openSel, setOpenSel] = useState<"in" | "out" | null>(null);
  const [slippage, setSlippage] = useState(50);
  const [showSettings, setShowSettings] = useState(false);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  const parsedIn = useMemo(() => {
    if (!amountIn || isNaN(Number(amountIn))) return 0n;
    try {
      return parseUnits(amountIn as `${number}`, tokenIn.decimals);
    } catch {
      return 0n;
    }
  }, [amountIn, tokenIn.decimals]);

  // Best route across direct + via-WLTC
  const {
    route: bestRoute,
    isFetching: routeFetching,
    noLiquidity: routeNoLiquidity,
  } = useBestRoute(tokenIn, tokenOut, parsedIn);
  const path = useMemo<Address[]>(
    () => bestRoute?.path ?? [],
    [bestRoute],
  );
  const amountOut = bestRoute?.amountOut ?? 0n;
  const isMultiHop = bestRoute?.isMultiHop ?? false;

  // First hop pair (for price impact)
  const firstPair = useReadContract({
    abi: FACTORY_ABI,
    address: CONTRACTS.FACTORY,
    functionName: "getPair",
    args: [path[0], path[1] ?? path[0]],
    query: { enabled: path.length >= 2 },
  });
  const firstPairAddr = firstPair.data as Address | undefined;
  const firstPairOk = !!firstPairAddr && firstPairAddr !== "0x0000000000000000000000000000000000000000";
  const firstReserves = useReadContract({
    abi: PAIR_ABI,
    address: firstPairOk ? firstPairAddr : undefined,
    functionName: "getReserves",
    query: { enabled: firstPairOk, refetchInterval: 10_000 },
  });
  const firstToken0 = useReadContract({
    abi: PAIR_ABI,
    address: firstPairOk ? firstPairAddr : undefined,
    functionName: "token0",
    query: { enabled: firstPairOk },
  });

  const priceImpact = useMemo(() => {
    if (!firstReserves.data || !firstToken0.data || parsedIn === 0n) return 0;
    const [r0, r1] = firstReserves.data as readonly [bigint, bigint, number];
    const inIs0 = (firstToken0.data as Address).toLowerCase() === path[0].toLowerCase();
    const rIn = inIs0 ? r0 : r1;
    const rOut = inIs0 ? r1 : r0;
    return calcPriceImpact(parsedIn, rIn, rOut);
  }, [firstReserves.data, firstToken0.data, parsedIn, path]);

  const minOut = useMemo(() => applySlippage(amountOut, slippage), [amountOut, slippage]);

  // Balances
  const nativeBal = useBalance({ address, query: { enabled: !!address } });
  const erc20In = useReadContract({
    abi: ERC20_ABI,
    address: tokenIn.isNative ? undefined : (tokenIn.address as Address),
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !tokenIn.isNative },
  });
  const balanceIn = tokenIn.isNative ? nativeBal.data?.value ?? 0n : (erc20In.data as bigint | undefined) ?? 0n;

  // Allowance (skip if native)
  const allowance = useReadContract({
    abi: ERC20_ABI,
    address: tokenIn.isNative ? undefined : (tokenIn.address as Address),
    functionName: "allowance",
    args: address ? [address, CONTRACTS.ROUTER] : undefined,
    query: { enabled: !!address && !tokenIn.isNative },
  });
  const needsApproval = !tokenIn.isNative && parsedIn > 0n && ((allowance.data as bigint | undefined) ?? 0n) < parsedIn;

  // Tx
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Pending toast on tx submission
  useEffect(() => {
    if (txHash && pendingLabel) txPending("swap", `${pendingLabel}…`);
  }, [txHash, pendingLabel]);

  // Success toast + reset on confirm
  useEffect(() => {
    if (confirmed) {
      if (pendingLabel) {
        txSuccess("swap", `${pendingLabel} successful!`, txHash);
        setPendingLabel(null);
      }
      setAmountIn("");
      reset();
      nativeBal.refetch();
      erc20In.refetch();
      allowance.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  function flip() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn("");
  }

  function setMax() {
    if (!balanceIn) return;
    // leave a bit for gas if native
    const v = tokenIn.isNative && balanceIn > parseUnits("0.005", 18)
      ? balanceIn - parseUnits("0.005", 18)
      : balanceIn;
    setAmountIn(formatUnits(v, tokenIn.decimals));
  }

  function approve() {
    if (tokenIn.isNative) return;
    const label = `Approve ${tokenIn.symbol}`;
    setPendingLabel(label);
    writeContract(
      {
        abi: ERC20_ABI,
        address: tokenIn.address as Address,
        functionName: "approve",
        args: [CONTRACTS.ROUTER, maxUint256],
      },
      {
        onError: (e) => {
          txError("swap", `${label} failed`, e);
          setPendingLabel(null);
        },
      },
    );
  }

  function swap() {
    if (!address || parsedIn === 0n || amountOut === 0n) return;
    const dl = deadlineMinutes(20);
    const label = `Swap ${tokenIn.symbol} → ${tokenOut.symbol}`;
    setPendingLabel(label);
    const onError = {
      onError: (e: unknown) => {
        txError("swap", `${label} failed`, e);
        setPendingLabel(null);
      },
    };
    if (tokenIn.isNative) {
      writeContract(
        {
          abi: ROUTER_ABI,
          address: CONTRACTS.ROUTER,
          functionName: "swapExactLTCForTokens",
          args: [minOut, path, address, dl],
          value: parsedIn,
        },
        onError,
      );
    } else if (tokenOut.isNative) {
      writeContract(
        {
          abi: ROUTER_ABI,
          address: CONTRACTS.ROUTER,
          functionName: "swapExactTokensForLTC",
          args: [parsedIn, minOut, path, address, dl],
        },
        onError,
      );
    } else {
      writeContract(
        {
          abi: ROUTER_ABI,
          address: CONTRACTS.ROUTER,
          functionName: "swapExactTokensForTokens",
          args: [parsedIn, minOut, path, address, dl],
        },
        onError,
      );
    }
  }

  const insufficient = isConnected && parsedIn > 0n && parsedIn > balanceIn;
  const noLiquidity = parsedIn > 0n && routeNoLiquidity;
  const impactSeverity: "ok" | "warn" | "danger" =
    priceImpact >= 5 ? "danger" : priceImpact >= 2 ? "warn" : "ok";

  const rate =
    parsedIn > 0n && amountOut > 0n
      ? Number(formatUnits(amountOut, tokenOut.decimals)) /
        Number(formatUnits(parsedIn, tokenIn.decimals))
      : 0;

  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-aurora -z-10 rounded-[40px]" />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-4 sm:p-5 w-full max-w-[460px]"
      >
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h2 className="text-lg font-semibold">Swap</h2>
            <p className="text-xs text-muted-foreground">Trade tokens on LitVM</p>
          </div>
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="h-9 w-9 grid place-items-center rounded-full hover:bg-surface-3 transition-colors"
          >
            <Settings2 className="h-4 w-4" />
          </button>
        </div>

        {showSettings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-surface rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Slippage tolerance</span>
                <span className="text-xs num">{(slippage / 100).toFixed(2)}%</span>
              </div>
              <div className="flex gap-2">
                {SLIPPAGE_OPTIONS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSlippage(b)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      slippage === b ? "bg-brand-gradient text-[oklch(0.18_0.04_200)]" : "bg-surface-3 hover:bg-surface-3/70"
                    }`}
                  >
                    {(b / 100).toFixed(2)}%
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* From */}
        <div className="bg-surface rounded-2xl p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>You pay</span>
            {isConnected && (
              <button onClick={setMax} className="hover:text-foreground transition-colors">
                Balance: <span className="num">{formatPretty(Number(formatUnits(balanceIn, tokenIn.decimals)), 4)}</span>
                <span className="ml-1.5 text-brand">MAX</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <input
              inputMode="decimal"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value.replace(/[^0-9.]/g, ""))}
              className="num bg-transparent outline-none flex-1 text-3xl font-semibold placeholder:text-muted-foreground/50 min-w-0"
            />
            <div className="flex items-center gap-1.5">
              <TokenSelectorButton token={tokenIn} onClick={() => setOpenSel("in")} />
              <TokenInfoPopover token={tokenIn} />
            </div>
          </div>
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
          <div className="text-xs text-muted-foreground mb-2">You receive</div>
          <div className="flex items-center gap-3">
            <div className="num flex-1 text-3xl font-semibold min-w-0 truncate">
              {routeFetching && parsedIn > 0n ? (
                <span className="text-muted-foreground/60">-</span>
              ) : amountOut > 0n ? (
                formatPretty(Number(formatUnits(amountOut, tokenOut.decimals)), 6)
              ) : (
                <span className="text-muted-foreground/50">0.0</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <TokenSelectorButton token={tokenOut} onClick={() => setOpenSel("out")} />
              <TokenInfoPopover token={tokenOut} />
            </div>
          </div>
        </div>

        {/* Info */}
        {amountOut > 0n && (
          <div className="mt-3 px-1 text-xs text-muted-foreground space-y-1.5">
            <div className="flex justify-between">
              <span>Rate</span>
              <span className="num text-foreground/80">
                1 {tokenIn.symbol} ≈ {formatPretty(rate, 6)} {tokenOut.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Min received</span>
              <span className="num text-foreground/80">
                {formatPretty(Number(formatUnits(minOut, tokenOut.decimals)), 6)} {tokenOut.symbol}
              </span>
            </div>
            {priceImpact > 0 && (
              <div className="flex justify-between">
                <span>Price impact</span>
                <span
                  className={`num font-medium ${
                    impactSeverity === "danger"
                      ? "text-red-400"
                      : impactSeverity === "warn"
                      ? "text-yellow-400"
                      : "text-emerald-400"
                  }`}
                >
                  {priceImpact.toFixed(2)}%
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="flex items-center gap-1.5">
                Route
                {isMultiHop && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-brand/15 text-brand font-semibold uppercase tracking-wider">
                    via WLTC
                  </span>
                )}
              </span>
              <span className="num text-foreground/80 flex items-center gap-1">
                {path.map((p, i) => {
                  const t = TOKENS.find((tk) => (tk.isNative ? CONTRACTS.WLTC : tk.address).toLowerCase() === p.toLowerCase());
                  return (
                    <span key={i} className="flex items-center gap-1">
                      {t && <TokenLogo token={t} size={14} />}
                      {i < path.length - 1 && <span className="opacity-50">›</span>}
                    </span>
                  );
                })}
              </span>
            </div>
          </div>
        )}

        {impactSeverity !== "ok" && amountOut > 0n && (
          <div
            className={`mt-3 rounded-xl border p-3 text-xs flex items-start gap-2 ${
              impactSeverity === "danger"
                ? "border-red-400/30 bg-red-400/10 text-red-300"
                : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300"
            }`}
          >
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold">
                {impactSeverity === "danger" ? "High price impact" : "Moderate price impact"}
              </div>
              <div className="opacity-80 mt-0.5">
                You will lose approximately <span className="num">{priceImpact.toFixed(2)}%</span> due to limited
                pool liquidity. Consider a smaller amount.
              </div>
            </div>
          </div>
        )}

        {/* Action */}
        <div className="mt-4">
          {!isConnected ? (
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
          ) : insufficient ? (
            <button disabled className="w-full h-14 rounded-2xl bg-surface-3 text-muted-foreground font-bold text-base cursor-not-allowed">
              Insufficient {tokenIn.symbol}
            </button>
          ) : noLiquidity ? (
            <button disabled className="w-full h-14 rounded-2xl bg-surface-3 text-muted-foreground font-bold text-base cursor-not-allowed inline-flex items-center justify-center gap-2">
              <Info className="h-4 w-4" /> No liquidity for this route
            </button>
          ) : needsApproval ? (
            <button
              onClick={approve}
              disabled={isPending || confirming}
              className="w-full h-14 rounded-2xl bg-brand-gradient text-[oklch(0.18_0.04_200)] font-bold text-base hover:brightness-110 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isPending || confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {confirming ? "Confirming…" : `Approve ${tokenIn.symbol}`}
            </button>
          ) : (
            <button
              onClick={swap}
              disabled={parsedIn === 0n || amountOut === 0n || isPending || confirming}
              className="w-full h-14 rounded-2xl bg-brand-gradient text-[oklch(0.18_0.04_200)] font-bold text-base hover:brightness-110 transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending || confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {confirming ? "Confirming swap…" : isPending ? "Approve in wallet…" : parsedIn === 0n ? "Enter an amount" : "Swap"}
            </button>
          )}
          {confirmed && (
            <div className="mt-3 text-center text-xs text-success">Swap confirmed ✓</div>
          )}
        </div>
      </motion.div>

      <TokenSelectModal
        open={openSel === "in"}
        onClose={() => setOpenSel(null)}
        onSelect={setTokenIn}
        exclude={tokenOut}
      />
      <TokenSelectModal
        open={openSel === "out"}
        onClose={() => setOpenSel(null)}
        onSelect={setTokenOut}
        exclude={tokenIn}
      />
    </div>
  );
}
