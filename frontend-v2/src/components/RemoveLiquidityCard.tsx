import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { type Address, formatUnits, maxUint256 } from "viem";
import { Minus, Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";
import {
  CONTRACTS,
  TOKENS,
  type Token,
  wrappedAddress,
} from "@/config/contracts";
import { ERC20_ABI, FACTORY_ABI, PAIR_ABI, ROUTER_ABI } from "@/config/abis";
import { TokenSelectorButton, TokenSelectModal } from "./TokenSelect";
import { applySlippage, deadlineMinutes, formatPretty } from "@/lib/swap";
import { txPending, txSuccess, txError } from "@/lib/tx-toast";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const PERCENT_PRESETS = [25, 50, 75, 100];
const ZERO_ADDR = "0x0000000000000000000000000000000000000000" as Address;

export function RemoveLiquidityCard({
  initialA,
  initialB,
}: {
  initialA?: Token;
  initialB?: Token;
}) {
  const { address, isConnected } = useAccount();
  const [tokenA, setTokenA] = useState<Token>(initialA ?? TOKENS[0]);
  const [tokenB, setTokenB] = useState<Token>(initialB ?? TOKENS[2]);
  const [percent, setPercent] = useState(50);
  const [openSel, setOpenSel] = useState<"a" | "b" | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);

  // Sync initial pair when changed externally
  useEffect(() => {
    if (initialA) setTokenA(initialA);
    if (initialB) setTokenB(initialB);
  }, [initialA, initialB]);

  // Pair lookup
  const pairAddr = useReadContract({
    abi: FACTORY_ABI,
    address: CONTRACTS.FACTORY,
    functionName: "getPair",
    args: [wrappedAddress(tokenA), wrappedAddress(tokenB)],
  });
  const pair = pairAddr.data as Address | undefined;
  const pairExists = !!pair && pair !== ZERO_ADDR;

  // LP balance + total supply + reserves + token0 + LP allowance
  const lpBal = useReadContract({
    abi: PAIR_ABI,
    address: pairExists ? pair : undefined,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: pairExists && !!address, refetchInterval: 10_000 },
  });
  const totalSupply = useReadContract({
    abi: PAIR_ABI,
    address: pairExists ? pair : undefined,
    functionName: "totalSupply",
    query: { enabled: pairExists },
  });
  const reserves = useReadContract({
    abi: PAIR_ABI,
    address: pairExists ? pair : undefined,
    functionName: "getReserves",
    query: { enabled: pairExists, refetchInterval: 10_000 },
  });
  const token0 = useReadContract({
    abi: PAIR_ABI,
    address: pairExists ? pair : undefined,
    functionName: "token0",
    query: { enabled: pairExists },
  });
  const lpAllowance = useReadContract({
    abi: ERC20_ABI,
    address: pairExists ? pair : undefined,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.ROUTER] : undefined,
    query: { enabled: pairExists && !!address },
  });

  const lpBalance = (lpBal.data as bigint | undefined) ?? 0n;
  const liquidityToRemove = (lpBalance * BigInt(percent)) / 100n;
  const needsLpApproval =
    pairExists &&
    liquidityToRemove > 0n &&
    ((lpAllowance.data as bigint | undefined) ?? 0n) < liquidityToRemove;

  // Estimated amounts out
  const estOut = useMemo(() => {
    if (!reserves.data || !totalSupply.data || !token0.data) {
      return { amountA: 0n, amountB: 0n };
    }
    const supply = totalSupply.data as bigint;
    if (supply === 0n) return { amountA: 0n, amountB: 0n };
    const [r0, r1] = reserves.data as readonly [bigint, bigint, number];
    const aIs0 =
      (token0.data as Address).toLowerCase() ===
      wrappedAddress(tokenA).toLowerCase();
    const reserveA = aIs0 ? r0 : r1;
    const reserveB = aIs0 ? r1 : r0;
    return {
      amountA: (liquidityToRemove * reserveA) / supply,
      amountB: (liquidityToRemove * reserveB) / supply,
    };
  }, [reserves.data, totalSupply.data, token0.data, liquidityToRemove, tokenA]);

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txHash && pendingLabel) txPending("rem", `${pendingLabel}…`);
  }, [txHash, pendingLabel]);

  useEffect(() => {
    if (confirmed) {
      if (pendingLabel) {
        txSuccess("rem", `${pendingLabel} successful!`, txHash);
        if (pendingLabel.startsWith("Remove")) setPercent(50);
        setPendingLabel(null);
      }
      reset();
      [lpBal, totalSupply, reserves, lpAllowance, pairAddr].forEach((q) =>
        q.refetch?.(),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  function approveLp() {
    if (!pairExists || !pair) return;
    const label = "Approve LP";
    setPendingLabel(label);
    writeContract(
      {
        abi: ERC20_ABI,
        address: pair,
        functionName: "approve",
        args: [CONTRACTS.ROUTER, maxUint256],
      },
      {
        onError: (e) => {
          txError("rem", `${label} failed`, e);
          setPendingLabel(null);
        },
      },
    );
  }

  function remove() {
    if (!address || liquidityToRemove === 0n) return;
    const dl = deadlineMinutes(20);
    const minA = applySlippage(estOut.amountA, 100); // 1% slip
    const minB = applySlippage(estOut.amountB, 100);
    const label = "Remove Liquidity";
    setPendingLabel(label);
    const onError = {
      onError: (e: unknown) => {
        txError("rem", `${label} failed`, e);
        setPendingLabel(null);
      },
    };
    if (tokenA.isNative || tokenB.isNative) {
      const nativeIsA = tokenA.isNative;
      const tokenSide = nativeIsA ? tokenB : tokenA;
      const tokenMin = nativeIsA ? minB : minA;
      const ethMin = nativeIsA ? minA : minB;
      writeContract(
        {
          abi: ROUTER_ABI,
          address: CONTRACTS.ROUTER,
          functionName: "removeLiquidityLTC",
          args: [
            tokenSide.address as Address,
            liquidityToRemove,
            tokenMin,
            ethMin,
            address,
            dl,
          ],
        },
        onError,
      );
    } else {
      writeContract(
        {
          abi: ROUTER_ABI,
          address: CONTRACTS.ROUTER,
          functionName: "removeLiquidity",
          args: [
            tokenA.address as Address,
            tokenB.address as Address,
            liquidityToRemove,
            minA,
            minB,
            address,
            dl,
          ],
        },
        onError,
      );
    }
  }

  function btn() {
    if (!isConnected) {
      return (
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button
              onClick={openConnectModal}
              className="w-full h-14 rounded-2xl bg-brand-gradient text-[oklch(0.18_0.04_200)] font-bold"
            >
              Connect Wallet
            </button>
          )}
        </ConnectButton.Custom>
      );
    }
    if (!pairExists) return <Disabled label="Pool does not exist" />;
    if (lpBalance === 0n) return <Disabled label="No LP balance" />;
    if (liquidityToRemove === 0n) return <Disabled label="Enter amount" />;
    if (needsLpApproval)
      return (
        <Action
          loading={isPending || confirming}
          onClick={approveLp}
          label="Approve LP"
        />
      );
    return (
      <Action
        loading={isPending || confirming}
        onClick={remove}
        label="Remove Liquidity"
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-3xl p-5 w-full max-w-[480px]"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Minus className="h-4 w-4 text-brand" /> Remove Liquidity
        </h2>
        <p className="text-xs text-muted-foreground">
          Burn LP tokens to redeem your underlying assets.
        </p>
      </div>

      {/* Token pair */}
      <div className="bg-surface rounded-2xl p-4 mb-3">
        <div className="text-xs text-muted-foreground mb-2">Pair</div>
        <div className="flex items-center gap-2">
          <TokenSelectorButton token={tokenA} onClick={() => setOpenSel("a")} />
          <span className="text-muted-foreground">/</span>
          <TokenSelectorButton token={tokenB} onClick={() => setOpenSel("b")} />
        </div>
      </div>

      {/* Percent slider */}
      <div className="bg-surface rounded-2xl p-4">
        <div className="flex items-center justify-between text-xs mb-3">
          <span className="text-muted-foreground">Amount to remove</span>
          <span className="text-2xl font-bold num text-brand">{percent}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          onChange={(e) => setPercent(Number(e.target.value))}
          className="w-full accent-[oklch(0.86_0.17_165)] cursor-pointer"
        />
        <div className="grid grid-cols-4 gap-2 mt-3">
          {PERCENT_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPercent(p)}
              className={`py-1.5 rounded-xl text-xs font-medium transition-colors ${
                percent === p
                  ? "bg-brand-gradient text-[oklch(0.18_0.04_200)]"
                  : "bg-surface-3 hover:bg-surface-3/70"
              }`}
            >
              {p === 100 ? "MAX" : `${p}%`}
            </button>
          ))}
        </div>
      </div>

      {/* Estimated receive */}
      <div className="mt-3 px-1 text-xs text-muted-foreground space-y-1.5">
        <div className="flex justify-between">
          <span>Your LP balance</span>
          <span className="num text-foreground/80">
            {formatPretty(Number(formatUnits(lpBalance, 18)), 6)}
          </span>
        </div>
        {liquidityToRemove > 0n && (
          <>
            <div className="flex justify-between">
              <span>You'll receive</span>
              <span className="num text-foreground/80">
                {formatPretty(Number(formatUnits(estOut.amountA, tokenA.decimals)), 4)}{" "}
                {tokenA.symbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span />
              <span className="num text-foreground/80">
                {formatPretty(Number(formatUnits(estOut.amountB, tokenB.decimals)), 4)}{" "}
                {tokenB.symbol}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="mt-4">{btn()}</div>

      <TokenSelectModal
        open={openSel === "a"}
        onClose={() => setOpenSel(null)}
        onSelect={setTokenA}
        exclude={tokenB}
      />
      <TokenSelectModal
        open={openSel === "b"}
        onClose={() => setOpenSel(null)}
        onSelect={setTokenB}
        exclude={tokenA}
      />
    </motion.div>
  );
}

function Action({
  loading,
  onClick,
  label,
}: {
  loading: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full h-14 rounded-2xl bg-brand-gradient text-[oklch(0.18_0.04_200)] font-bold inline-flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-70"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}{" "}
      {label}
    </button>
  );
}

function Disabled({ label }: { label: string }) {
  return (
    <button
      disabled
      className="w-full h-14 rounded-2xl bg-surface-3 text-muted-foreground font-bold cursor-not-allowed"
    >
      {label}
    </button>
  );
}
