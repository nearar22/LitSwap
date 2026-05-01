"use client";

import { useState, useCallback, useEffect } from "react";
import { ArrowDownUp, Settings, ExternalLink } from "lucide-react";
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { TokenSelector } from "./TokenSelector";
import { type Token, TOKENS, CONTRACTS, ROUTER_ABI, ERC20_ABI, FACTORY_ABI, PAIR_ABI } from "@/lib/contracts";
import { cn, formatAmount, parseAmount, getDeadline } from "@/lib/utils";
import { txPending, txSuccess, txError } from "@/lib/tx-toast";
import { useBestRoute } from "@/lib/useBestRoute";

export function SwapCard() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [tokenIn, setTokenIn] = useState<Token | null>(TOKENS[0]);
  const [tokenOut, setTokenOut] = useState<Token | null>(TOKENS[2]);
  const [amountIn, setAmountIn] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [showSettings, setShowSettings] = useState(false);

  const { data: balanceIn } = useBalance({
    address,
    token: tokenIn?.address === "native" ? undefined : (tokenIn?.address as `0x${string}`),
  });

  const { data: balanceOut } = useBalance({
    address,
    token: tokenOut?.address === "native" ? undefined : (tokenOut?.address as `0x${string}`),
  });

  const amountInParsed = tokenIn ? parseAmount(amountIn, tokenIn.decimals) : 0n;

  const needsApproval = tokenIn?.address !== "native" && amountInParsed > 0n;

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenIn?.address !== "native" ? (tokenIn?.address as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && tokenIn?.address !== "native" ? [address, CONTRACTS.ROUTER] : undefined,
    query: { enabled: needsApproval && !!address, refetchInterval: 5000 },
  });

  const isApproved = !needsApproval || (allowance !== undefined && allowance >= amountInParsed);

  const route = useBestRoute(tokenIn, tokenOut, amountInParsed);
  const bestPath = route.best?.path ?? null;
  const amountOut = route.best?.amounts.at(-1) ?? 0n;
  const amountOutFormatted = tokenOut ? formatAmount(amountOut, tokenOut.decimals) : "0";
  const isMultiHop = (route.best?.hops ?? 1) > 1;

  // Fetch first pair in route for price impact calculation
  const { data: firstPairAddr } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "getPair",
    args: bestPath && bestPath.length >= 2 ? [bestPath[0], bestPath[1]] : undefined,
    query: { enabled: !!bestPath },
  });

  const { data: firstReserves } = useReadContract({
    address:
      firstPairAddr && firstPairAddr !== "0x0000000000000000000000000000000000000000"
        ? firstPairAddr
        : undefined,
    abi: PAIR_ABI,
    functionName: "getReserves",
    query: { enabled: !!firstPairAddr, refetchInterval: 5000 },
  });

  const { data: firstToken0 } = useReadContract({
    address:
      firstPairAddr && firstPairAddr !== "0x0000000000000000000000000000000000000000"
        ? firstPairAddr
        : undefined,
    abi: PAIR_ABI,
    functionName: "token0",
    query: { enabled: !!firstPairAddr },
  });

  // Compute price impact: compare executed rate vs mid-rate (using first hop)
  const priceImpact = (() => {
    if (!firstReserves || !bestPath || !firstToken0 || amountInParsed === 0n) return 0;
    const [r0, r1] = firstReserves as readonly [bigint, bigint, number];
    const pathIn = bestPath[0].toLowerCase();
    const isToken0In = firstToken0.toString().toLowerCase() === pathIn;
    const reserveIn = isToken0In ? r0 : r1;
    const reserveOut = isToken0In ? r1 : r0;
    if (reserveIn === 0n || reserveOut === 0n) return 0;
    // mid-price output (no slippage, no fee) = amountIn * reserveOut / reserveIn
    const idealOut = (amountInParsed * reserveOut) / reserveIn;
    const firstHopOut = route.best?.amounts[1] ?? 0n;
    if (idealOut === 0n) return 0;
    const impactBps = Number(((idealOut - firstHopOut) * 10000n) / idealOut);
    // Subtract the 0.3% fee to get pure price impact
    const pure = Math.max(0, impactBps / 100 - 0.3);
    // For multi-hop, cumulative impact is larger; rough 2x
    return isMultiHop ? pure * 2 : pure;
  })();

  const { writeContract: approve, isPending: isApproving, data: approveTxHash } = useWriteContract();
  const { isLoading: isWaitingApprove, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveTxHash });

  const { writeContract: swap, isPending: isSwapping, data: swapTxHash } = useWriteContract();
  const { isLoading: isWaitingSwap, isSuccess: isSwapSuccess } = useWaitForTransactionReceipt({ hash: swapTxHash });

  useEffect(() => {
    if (approveTxHash) txPending("approve", `Approving ${tokenIn?.symbol}...`);
  }, [approveTxHash, tokenIn?.symbol]);

  useEffect(() => {
    if (isApproveSuccess) {
      refetchAllowance();
      txSuccess("approve", `${tokenIn?.symbol} approved!`, approveTxHash);
    }
  }, [isApproveSuccess, refetchAllowance, tokenIn?.symbol, approveTxHash]);

  useEffect(() => {
    if (swapTxHash) txPending("swap", `Swapping ${tokenIn?.symbol} → ${tokenOut?.symbol}...`);
  }, [swapTxHash, tokenIn?.symbol, tokenOut?.symbol]);

  useEffect(() => {
    if (isSwapSuccess) {
      txSuccess("swap", `Swap successful!`, swapTxHash);
      setAmountIn("");
    }
  }, [isSwapSuccess, swapTxHash]);

  const handleFlip = useCallback(() => {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setAmountIn("");
  }, [tokenIn, tokenOut]);

  const handleApprove = () => {
    if (!tokenIn || tokenIn.address === "native") return;
    const MAX_UINT256 = 2n ** 256n - 1n;
    approve(
      {
        address: tokenIn.address as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.ROUTER, MAX_UINT256],
      },
      { onError: (e) => txError("approve", "Approval failed", e) }
    );
  };

  const handleSwap = () => {
    if (!tokenIn || !tokenOut || !address || amountInParsed === 0n || !bestPath) return;
    const deadline = getDeadline(20);
    const slippageBps = BigInt(Math.floor(parseFloat(slippage) * 100));
    const amountOutMin = (amountOut * (10000n - slippageBps)) / 10000n;
    const isNativeIn = tokenIn.address === "native";
    const isNativeOut = tokenOut.address === "native";
    const path = [...bestPath];

    const onError = { onError: (e: unknown) => txError("swap", "Swap failed", e) };

    if (isNativeIn) {
      swap(
        {
          address: CONTRACTS.ROUTER,
          abi: ROUTER_ABI,
          functionName: "swapExactLTCForTokens",
          args: [amountOutMin, path, address, deadline],
          value: amountInParsed,
        },
        onError
      );
    } else if (isNativeOut) {
      swap(
        {
          address: CONTRACTS.ROUTER,
          abi: ROUTER_ABI,
          functionName: "swapExactTokensForLTC",
          args: [amountInParsed, amountOutMin, path, address, deadline],
        },
        onError
      );
    } else {
      swap(
        {
          address: CONTRACTS.ROUTER,
          abi: ROUTER_ABI,
          functionName: "swapExactTokensForTokens",
          args: [amountInParsed, amountOutMin, path, address, deadline],
        },
        onError
      );
    }
  };

  const exchangeRate =
    amountInParsed > 0n && amountOut > 0n && tokenIn && tokenOut
      ? `1 ${tokenIn.symbol} = ${formatAmount((amountOut * 10n ** BigInt(tokenIn.decimals)) / amountInParsed, tokenOut.decimals, 6)} ${tokenOut.symbol}`
      : null;

  const isLoading = isApproving || isWaitingApprove || isSwapping || isWaitingSwap;

  const hasEnoughBalance =
    !balanceIn || amountInParsed === 0n ? true : balanceIn.value >= amountInParsed;

  const getButtonLabel = () => {
    if (!isConnected) return "Connect Wallet";
    if (!tokenIn || !tokenOut) return "Select tokens";
    if (!amountIn || amountInParsed === 0n) return "Enter amount";
    if (!hasEnoughBalance) return `Insufficient ${tokenIn.symbol} balance`;
    if (amountOut === 0n) return "No liquidity for this pair";
    if (isApproving || isWaitingApprove) return "Approving...";
    if (!isApproved) return `Approve ${tokenIn.symbol}`;
    if (isSwapping || isWaitingSwap) return "Swapping...";
    return "Swap";
  };

  const handleAction = () => {
    if (!isConnected) { openConnectModal?.(); return; }
    if (!isApproved) { handleApprove(); return; }
    handleSwap();
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass rounded-2xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Swap</h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>

        {showSettings && (
          <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="text-xs text-slate-400 mb-2">Slippage tolerance</div>
            <div className="flex gap-2">
              {["0.1", "0.5", "1.0"].map((v) => (
                <button
                  key={v}
                  onClick={() => setSlippage(v)}
                  className={cn(
                    "flex-1 py-1.5 rounded-lg text-sm font-medium transition-all",
                    slippage === v ? "bg-purple-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"
                  )}
                >
                  {v}%
                </button>
              ))}
              <input
                value={slippage}
                onChange={(e) => setSlippage(e.target.value)}
                className="w-16 px-2 py-1.5 rounded-lg input-dark text-sm text-center"
                placeholder="0.5"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="p-4 rounded-xl bg-black/20 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">You pay</span>
              {balanceIn && (
                <button
                  onClick={() => tokenIn && setAmountIn(formatAmount(balanceIn.value, balanceIn.decimals, 8))}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Max: {formatAmount(balanceIn.value, balanceIn.decimals)} {tokenIn?.symbol}
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                placeholder="0.0"
                className="flex-1 min-w-0 bg-transparent text-2xl font-semibold text-white placeholder-slate-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <TokenSelector selected={tokenIn} onSelect={setTokenIn} exclude={tokenOut} label="Select" />
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleFlip}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all hover:rotate-180 duration-300"
            >
              <ArrowDownUp className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-black/20 border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">You receive</span>
              {balanceOut && (
                <span className="text-xs text-slate-500">
                  Balance: {formatAmount(balanceOut.value, balanceOut.decimals)} {tokenOut?.symbol}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 text-2xl font-semibold text-white">
                {amountOutFormatted !== "0" ? amountOutFormatted : <span className="text-slate-600">0.0</span>}
              </div>
              <TokenSelector selected={tokenOut} onSelect={setTokenOut} exclude={tokenIn} label="Select" />
            </div>
          </div>
        </div>

        {exchangeRate && (
          <div className="mt-3 space-y-1.5">
            <div className="px-3 py-2 rounded-xl bg-white/3 border border-white/5 flex items-center justify-between">
              <span className="text-xs text-slate-400">{exchangeRate}</span>
              {priceImpact > 0 && (
                <span
                  className={cn(
                    "text-xs font-medium",
                    priceImpact > 5 ? "text-red-400" : priceImpact > 2 ? "text-yellow-400" : "text-green-400"
                  )}
                >
                  {priceImpact.toFixed(2)}% impact
                </span>
              )}
            </div>
            {isMultiHop && tokenIn && tokenOut && (
              <div className="px-3 py-1.5 rounded-xl bg-sky-500/5 border border-sky-500/20 flex items-center gap-2">
                <span className="text-[10px] font-bold text-sky-400 px-1.5 py-0.5 rounded bg-sky-400/10">
                  ROUTE
                </span>
                <span className="text-xs text-slate-300">
                  {tokenIn.symbol} → WLTC → {tokenOut.symbol}
                </span>
              </div>
            )}
            {priceImpact > 5 && (
              <div className="px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2">
                <span className="text-base leading-none">⚠️</span>
                <div>
                  <div className="text-xs font-semibold text-red-300">High price impact!</div>
                  <div className="text-[11px] text-red-400/80 mt-0.5">
                    You will lose ~{priceImpact.toFixed(1)}% of value. Consider a smaller trade.
                  </div>
                </div>
              </div>
            )}
            {priceImpact > 2 && priceImpact <= 5 && (
              <div className="px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2">
                <span className="text-sm">⚠️</span>
                <span className="text-[11px] text-yellow-300">
                  Moderate price impact ({priceImpact.toFixed(1)}%). Review before swapping.
                </span>
              </div>
            )}
          </div>
        )}

        <button
          onClick={handleAction}
          disabled={
            isLoading ||
            (isConnected && (!amountIn || amountInParsed === 0n || !tokenIn || !tokenOut))
          }
          className="btn-primary w-full mt-4 py-3.5 rounded-xl text-base font-semibold"
        >
          {getButtonLabel()}
        </button>

        {swapTxHash && (
          <a
            href={`https://liteforge.explorer.caldera.xyz/tx/${swapTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 flex items-center justify-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            View on explorer <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
