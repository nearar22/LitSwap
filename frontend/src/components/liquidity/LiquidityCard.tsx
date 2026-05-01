"use client";

import { useState, useEffect } from "react";
import { Plus, Minus, ExternalLink, Info } from "lucide-react";
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { TokenSelector } from "@/components/swap/TokenSelector";
import { YourPositions } from "@/components/liquidity/YourPositions";
import { type Token, TOKENS, CONTRACTS, ROUTER_ABI, ERC20_ABI, PAIR_ABI, FACTORY_ABI } from "@/lib/contracts";
import { cn, formatAmount, parseAmount, getDeadline } from "@/lib/utils";
import { txPending, txSuccess, txError } from "@/lib/tx-toast";

type Tab = "add" | "remove";

export function LiquidityCard() {
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const [tab, setTab] = useState<Tab>("add");
  const [tokenA, setTokenA] = useState<Token | null>(TOKENS[0]);
  const [tokenB, setTokenB] = useState<Token | null>(TOKENS[2]);
  const [amountA, setAmountA] = useState("");
  const [amountB, setAmountB] = useState("");
  const [removePercent, setRemovePercent] = useState(50);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  const amountAParsed = tokenA ? parseAmount(amountA, tokenA.decimals) : 0n;
  const amountBParsed = tokenB ? parseAmount(amountB, tokenB.decimals) : 0n;

  const { data: balanceA } = useBalance({
    address,
    token: tokenA?.address === "native" ? undefined : (tokenA?.address as `0x${string}`),
  });
  const { data: balanceB } = useBalance({
    address,
    token: tokenB?.address === "native" ? undefined : (tokenB?.address as `0x${string}`),
  });

  const tokenAAddr = tokenA?.address === "native" ? CONTRACTS.WLTC : (tokenA?.address as `0x${string}`);
  const tokenBAddr = tokenB?.address === "native" ? CONTRACTS.WLTC : (tokenB?.address as `0x${string}`);

  const { data: pairAddress } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "getPair",
    args: tokenA && tokenB ? [tokenAAddr, tokenBAddr] : undefined,
    query: { enabled: !!tokenA && !!tokenB },
  });

  const { data: lpBalance } = useReadContract({
    address: pairAddress && pairAddress !== "0x0000000000000000000000000000000000000000" ? pairAddress : undefined,
    abi: PAIR_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!pairAddress && !!address },
  });

  const { data: lpTotalSupply } = useReadContract({
    address: pairAddress && pairAddress !== "0x0000000000000000000000000000000000000000" ? pairAddress : undefined,
    abi: PAIR_ABI,
    functionName: "totalSupply",
    query: { enabled: !!pairAddress },
  });

  const { data: reserves } = useReadContract({
    address: pairAddress && pairAddress !== "0x0000000000000000000000000000000000000000" ? pairAddress : undefined,
    abi: PAIR_ABI,
    functionName: "getReserves",
    query: { enabled: !!pairAddress, refetchInterval: 10000 },
  });

  const hasPair = pairAddress && pairAddress !== "0x0000000000000000000000000000000000000000";
  const hasLPBalance = lpBalance && lpBalance > 0n;

  const { data: allowanceA, refetch: refetchAllowanceA } = useReadContract({
    address: tokenA?.address !== "native" ? (tokenA?.address as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.ROUTER] : undefined,
    query: { enabled: tokenA?.address !== "native" && !!address, refetchInterval: 5000 },
  });

  const { data: allowanceB, refetch: refetchAllowanceB } = useReadContract({
    address: tokenB?.address !== "native" ? (tokenB?.address as `0x${string}`) : undefined,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.ROUTER] : undefined,
    query: { enabled: tokenB?.address !== "native" && !!address, refetchInterval: 5000 },
  });

  const { data: lpAllowance, refetch: refetchLpAllowance } = useReadContract({
    address: hasPair ? (pairAddress as `0x${string}`) : undefined,
    abi: PAIR_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.ROUTER] : undefined,
    query: { enabled: !!hasPair && !!address, refetchInterval: 5000 },
  });

  const { writeContract, isPending, data: txHash } = useWriteContract();
  const { isLoading: isWaiting, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isSuccess) {
      refetchAllowanceA();
      refetchAllowanceB();
      refetchLpAllowance();
      if (pendingLabel) {
        txSuccess("liquidity", `${pendingLabel} successful!`, txHash);
        // Clear amounts after successful add/remove (but not for approvals)
        if (pendingLabel.startsWith("Add") || pendingLabel.startsWith("Remove")) {
          setAmountA("");
          setAmountB("");
        }
        setPendingLabel(null);
      }
    }
  }, [isSuccess, refetchAllowanceA, refetchAllowanceB, refetchLpAllowance, pendingLabel, txHash]);

  useEffect(() => {
    if (txHash && pendingLabel) txPending("liquidity", `${pendingLabel}...`);
  }, [txHash, pendingLabel]);

  const isApprovedA = tokenA?.address === "native" || (allowanceA !== undefined && allowanceA >= amountAParsed);
  const isApprovedB = tokenB?.address === "native" || (allowanceB !== undefined && allowanceB >= amountBParsed);

  const lpToRemove = lpBalance ? (lpBalance * BigInt(removePercent)) / 100n : 0n;
  const isLPApproved = !lpAllowance || lpAllowance >= lpToRemove;

  const MAX_UINT256 = 2n ** 256n - 1n;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const writeWithToast = (label: string, cfg: any) => {
    setPendingLabel(label);
    writeContract(cfg, {
      onError: (e) => {
        txError("liquidity", `${label} failed`, e);
        setPendingLabel(null);
      },
    });
  };

  const handleApproveA = () => {
    if (!tokenA || tokenA.address === "native") return;
    writeWithToast(`Approve ${tokenA.symbol}`, { address: tokenA.address as `0x${string}`, abi: ERC20_ABI, functionName: "approve", args: [CONTRACTS.ROUTER, MAX_UINT256] });
  };

  const handleApproveB = () => {
    if (!tokenB || tokenB.address === "native") return;
    writeWithToast(`Approve ${tokenB.symbol}`, { address: tokenB.address as `0x${string}`, abi: ERC20_ABI, functionName: "approve", args: [CONTRACTS.ROUTER, MAX_UINT256] });
  };

  const handleAddLiquidity = () => {
    if (!tokenA || !tokenB || !address) return;
    const deadline = getDeadline(20);
    const minA = (amountAParsed * 95n) / 100n;
    const minB = (amountBParsed * 95n) / 100n;
    const isNativeA = tokenA.address === "native";
    const isNativeB = tokenB.address === "native";

    if (isNativeA) {
      writeWithToast("Add Liquidity", {
        address: CONTRACTS.ROUTER, abi: ROUTER_ABI, functionName: "addLiquidityLTC",
        args: [tokenBAddr, amountBParsed, minB, minA, address, deadline],
        value: amountAParsed,
      });
    } else if (isNativeB) {
      writeWithToast("Add Liquidity", {
        address: CONTRACTS.ROUTER, abi: ROUTER_ABI, functionName: "addLiquidityLTC",
        args: [tokenAAddr, amountAParsed, minA, minB, address, deadline],
        value: amountBParsed,
      });
    } else {
      writeWithToast("Add Liquidity", {
        address: CONTRACTS.ROUTER, abi: ROUTER_ABI, functionName: "addLiquidity",
        args: [tokenAAddr, tokenBAddr, amountAParsed, amountBParsed, minA, minB, address, deadline],
      });
    }
  };

  const handleApproveLPAndRemove = () => {
    if (!hasPair || !address || !lpBalance) return;
    if (!isLPApproved) {
      writeWithToast("Approve LP", { address: pairAddress as `0x${string}`, abi: PAIR_ABI, functionName: "approve", args: [CONTRACTS.ROUTER, MAX_UINT256] });
      return;
    }
    const deadline = getDeadline(20);
    const isNativeA = tokenA?.address === "native";
    const isNativeB = tokenB?.address === "native";
    if (isNativeA || isNativeB) {
      const token = isNativeA ? tokenBAddr : tokenAAddr;
      writeWithToast("Remove Liquidity", {
        address: CONTRACTS.ROUTER, abi: ROUTER_ABI, functionName: "removeLiquidityLTC",
        args: [token, lpToRemove, 0n, 0n, address, deadline],
      });
    } else {
      writeWithToast("Remove Liquidity", {
        address: CONTRACTS.ROUTER, abi: ROUTER_ABI, functionName: "removeLiquidity",
        args: [tokenAAddr, tokenBAddr, lpToRemove, 0n, 0n, address, deadline],
      });
    }
  };

  const getAddButtonLabel = () => {
    if (!isConnected) return "Connect Wallet";
    if (!tokenA || !tokenB) return "Select tokens";
    if (!amountA || !amountB) return "Enter amounts";
    if (!isApprovedA) return `Approve ${tokenA.symbol}`;
    if (!isApprovedB) return `Approve ${tokenB.symbol}`;
    if (isPending || isWaiting) return "Adding liquidity...";
    if (isSuccess) return "Added!";
    return "Add Liquidity";
  };

  const handleAddAction = () => {
    if (!isConnected) { openConnectModal?.(); return; }
    if (!isApprovedA) { handleApproveA(); return; }
    if (!isApprovedB) { handleApproveB(); return; }
    handleAddLiquidity();
  };

  const sharePercent =
    lpBalance && lpTotalSupply && lpTotalSupply > 0n
      ? (Number(lpBalance * 10000n) / Number(lpTotalSupply)) / 100
      : 0;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="glass rounded-2xl p-4 shadow-2xl">
        <div className="flex gap-1 mb-4 p-1 bg-black/20 rounded-xl">
          {(["add", "remove"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize",
                tab === t ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              {t === "add" ? <><Plus className="w-3.5 h-3.5 inline mr-1" />Add</> : <><Minus className="w-3.5 h-3.5 inline mr-1" />Remove</>}
            </button>
          ))}
        </div>

        {tab === "add" ? (
          <div className="space-y-2">
            <div className="p-4 rounded-xl bg-black/20 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">Token A</span>
                {balanceA && <span className="text-xs text-slate-500">Balance: {formatAmount(balanceA.value, balanceA.decimals)}</span>}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={amountA}
                  onChange={(e) => setAmountA(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 min-w-0 bg-transparent text-2xl font-semibold text-white placeholder-slate-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <TokenSelector selected={tokenA} onSelect={setTokenA} exclude={tokenB} label="Token A" />
              </div>
            </div>

            <div className="flex justify-center">
              <div className="p-1.5 rounded-lg bg-purple-600/20 text-purple-400">
                <Plus className="w-4 h-4" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-black/20 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">Token B</span>
                {balanceB && <span className="text-xs text-slate-500">Balance: {formatAmount(balanceB.value, balanceB.decimals)}</span>}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={amountB}
                  onChange={(e) => setAmountB(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 min-w-0 bg-transparent text-2xl font-semibold text-white placeholder-slate-600 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <TokenSelector selected={tokenB} onSelect={setTokenB} exclude={tokenA} label="Token B" />
              </div>
            </div>

            {hasPair && reserves && (
              <div className="p-3 rounded-xl bg-white/3 border border-white/5 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">Pool reserves</span>
                  <span className="text-white">{formatAmount(reserves[0], 18, 4)} / {formatAmount(reserves[1], 18, 4)}</span>
                </div>
                {sharePercent > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Your share</span>
                    <span className="text-purple-400">{sharePercent.toFixed(4)}%</span>
                  </div>
                )}
              </div>
            )}

            {!hasPair && tokenA && tokenB && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-2">
                <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-300">You are the first liquidity provider. The ratio you set will define the initial price.</p>
              </div>
            )}

            <button
              onClick={handleAddAction}
              disabled={isPending || isWaiting || (isConnected && (!amountA || !amountB || !tokenA || !tokenB))}
              className="btn-primary w-full py-3.5 rounded-xl text-base font-semibold mt-2"
            >
              {getAddButtonLabel()}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <YourPositions
              onSelect={(a, b) => {
                setTokenA(a);
                setTokenB(b);
              }}
            />
            <div className="flex items-center gap-3">
              <TokenSelector selected={tokenA} onSelect={setTokenA} exclude={tokenB} label="Token A" />
              <span className="text-slate-500">/</span>
              <TokenSelector selected={tokenB} onSelect={setTokenB} exclude={tokenA} label="Token B" />
            </div>

            {hasLPBalance ? (
              <>
                <div className="p-4 rounded-xl bg-black/20 border border-white/5">
                  <div className="flex justify-between mb-3">
                    <span className="text-sm text-slate-400">Your LP tokens</span>
                    <span className="text-sm text-white font-medium">{formatAmount(lpBalance, 18, 6)}</span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    {[25, 50, 75, 100].map((p) => (
                      <button
                        key={p}
                        onClick={() => setRemovePercent(p)}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg text-xs font-medium transition-all",
                          removePercent === p ? "bg-purple-600 text-white" : "bg-white/5 text-slate-400 hover:text-white"
                        )}
                      >
                        {p === 100 ? "MAX" : `${p}%`}
                      </button>
                    ))}
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={removePercent}
                    onChange={(e) => setRemovePercent(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <div className="text-center text-2xl font-bold text-white mt-1">{removePercent}%</div>
                  <div className="text-center text-xs text-slate-500 mt-1">
                    Removing: {formatAmount(lpToRemove, 18, 6)} LP
                  </div>
                </div>

                <button
                  onClick={handleApproveLPAndRemove}
                  disabled={isPending || isWaiting || !isConnected}
                  className="btn-primary w-full py-3.5 rounded-xl text-base font-semibold"
                >
                  {!isLPApproved ? "Approve LP Token" : isPending || isWaiting ? "Removing..." : isSuccess ? "Removed!" : "Remove Liquidity"}
                </button>
              </>
            ) : (
              <div className="p-8 text-center text-slate-500 text-sm">
                {hasPair ? "You have no LP tokens for this pair." : "No pool exists for this pair yet."}
              </div>
            )}
          </div>
        )}

        {txHash && (
          <a
            href={`https://liteforge.explorer.caldera.xyz/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            View on explorer <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}
