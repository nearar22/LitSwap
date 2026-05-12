import { useEffect, useMemo, useState } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { type Address, formatUnits, maxUint256, parseUnits } from "viem";
import { Plus, Loader2, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { TOKENS, type Token, CONTRACTS, wrappedAddress } from "@/config/contracts";
import { ERC20_ABI, FACTORY_ABI, PAIR_ABI, ROUTER_ABI } from "@/config/abis";
import { TokenSelectorButton, TokenSelectModal } from "./TokenSelect";
import { applySlippage, deadlineMinutes, formatPretty } from "@/lib/swap";
import { txPending, txSuccess, txError } from "@/lib/tx-toast";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function AddLiquidityCard({
  initialA,
  initialB,
}: {
  initialA?: Token;
  initialB?: Token;
} = {}) {
  const { address, isConnected } = useAccount();
  const [tokenA, setTokenA] = useState<Token>(initialA ?? TOKENS[0]);
  const [tokenB, setTokenB] = useState<Token>(initialB ?? TOKENS[2]);

  useEffect(() => {
    if (initialA) setTokenA(initialA);
    if (initialB) setTokenB(initialB);
  }, [initialA, initialB]);
  const [amtA, setAmtA] = useState("");
  const [amtB, setAmtB] = useState("");
  const [openSel, setOpenSel] = useState<"a" | "b" | null>(null);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const slippage = 100; // 1%

  // Pair lookup
  const pairAddr = useReadContract({
    abi: FACTORY_ABI,
    address: CONTRACTS.FACTORY,
    functionName: "getPair",
    args: [wrappedAddress(tokenA), wrappedAddress(tokenB)],
  });
  const pair = pairAddr.data as Address | undefined;
  const pairExists = !!pair && pair !== "0x0000000000000000000000000000000000000000";

  const reserves = useReadContract({
    abi: PAIR_ABI,
    address: pairExists ? pair : undefined,
    functionName: "getReserves",
    query: { enabled: pairExists, refetchInterval: 5_000 },
  });
  const token0 = useReadContract({
    abi: PAIR_ABI,
    address: pairExists ? pair : undefined,
    functionName: "token0",
    query: { enabled: pairExists },
  });

  // Auto-quote B from A based on reserves
  useEffect(() => {
    if (!pairExists || !reserves.data || !token0.data) return;
    if (!amtA || isNaN(Number(amtA))) return;
    const [r0, r1] = reserves.data as readonly [bigint, bigint, number];
    const aIs0 = (token0.data as Address).toLowerCase() === wrappedAddress(tokenA).toLowerCase();
    const reserveA = aIs0 ? r0 : r1;
    const reserveB = aIs0 ? r1 : r0;
    if (reserveA === 0n) return;
    try {
      const a = parseUnits(amtA as `${number}`, tokenA.decimals);
      const b = (a * reserveB) / reserveA;
      // adjust decimals
      const bAdjusted = (b * 10n ** BigInt(tokenB.decimals)) / 10n ** BigInt(tokenA.decimals);
      setAmtB(formatUnits(bAdjusted, tokenB.decimals));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amtA, pairExists, reserves.data, token0.data, tokenA, tokenB]);

  const parsedA = useMemo(() => {
    try { return amtA ? parseUnits(amtA as `${number}`, tokenA.decimals) : 0n; } catch { return 0n; }
  }, [amtA, tokenA.decimals]);
  const parsedB = useMemo(() => {
    try { return amtB ? parseUnits(amtB as `${number}`, tokenB.decimals) : 0n; } catch { return 0n; }
  }, [amtB, tokenB.decimals]);

  // Balances
  const nativeBal = useBalance({ address, query: { enabled: !!address } });
  const balA = useReadContract({
    abi: ERC20_ABI, address: tokenA.isNative ? undefined : (tokenA.address as Address),
    functionName: "balanceOf", args: address ? [address] : undefined,
    query: { enabled: !!address && !tokenA.isNative },
  });
  const balB = useReadContract({
    abi: ERC20_ABI, address: tokenB.isNative ? undefined : (tokenB.address as Address),
    functionName: "balanceOf", args: address ? [address] : undefined,
    query: { enabled: !!address && !tokenB.isNative },
  });
  const balanceA = tokenA.isNative ? (nativeBal.data?.value ?? 0n) : ((balA.data as bigint | undefined) ?? 0n);
  const balanceB = tokenB.isNative ? (nativeBal.data?.value ?? 0n) : ((balB.data as bigint | undefined) ?? 0n);

  // Allowances
  const allowA = useReadContract({
    abi: ERC20_ABI, address: tokenA.isNative ? undefined : (tokenA.address as Address),
    functionName: "allowance", args: address ? [address, CONTRACTS.ROUTER] : undefined,
    query: { enabled: !!address && !tokenA.isNative },
  });
  const allowB = useReadContract({
    abi: ERC20_ABI, address: tokenB.isNative ? undefined : (tokenB.address as Address),
    functionName: "allowance", args: address ? [address, CONTRACTS.ROUTER] : undefined,
    query: { enabled: !!address && !tokenB.isNative },
  });
  const needsApproveA = !tokenA.isNative && parsedA > 0n && ((allowA.data as bigint | undefined) ?? 0n) < parsedA;
  const needsApproveB = !tokenB.isNative && parsedB > 0n && ((allowB.data as bigint | undefined) ?? 0n) < parsedB;

  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txHash && pendingLabel) txPending("liq", `${pendingLabel}…`);
  }, [txHash, pendingLabel]);

  useEffect(() => {
    if (confirmed) {
      if (pendingLabel) {
        txSuccess("liq", `${pendingLabel} successful!`, txHash);
        if (pendingLabel.startsWith("Add")) {
          setAmtA(""); setAmtB("");
        }
        setPendingLabel(null);
      }
      reset();
      [nativeBal, balA, balB, allowA, allowB, reserves, pairAddr].forEach((q) => q.refetch?.());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  function approve(t: Token) {
    if (t.isNative) return;
    const label = `Approve ${t.symbol}`;
    setPendingLabel(label);
    writeContract(
      {
        abi: ERC20_ABI,
        address: t.address as Address,
        functionName: "approve",
        args: [CONTRACTS.ROUTER, maxUint256],
      },
      {
        onError: (e) => {
          txError("liq", `${label} failed`, e);
          setPendingLabel(null);
        },
      },
    );
  }

  function add() {
    if (!address || parsedA === 0n || parsedB === 0n) return;
    const dl = deadlineMinutes(20);
    const minA = applySlippage(parsedA, slippage);
    const minB = applySlippage(parsedB, slippage);
    const label = pairExists ? "Add Liquidity" : "Create Pair & Add";
    setPendingLabel(label);
    const onError = {
      onError: (e: unknown) => {
        txError("liq", `${label} failed`, e);
        setPendingLabel(null);
      },
    };
    if (tokenA.isNative || tokenB.isNative) {
      const nativeIsA = tokenA.isNative;
      const tokenSide = nativeIsA ? tokenB : tokenA;
      const tokenAmt = nativeIsA ? parsedB : parsedA;
      const ethAmt = nativeIsA ? parsedA : parsedB;
      const tokenMin = nativeIsA ? minB : minA;
      const ethMin = nativeIsA ? minA : minB;
      writeContract(
        {
          abi: ROUTER_ABI,
          address: CONTRACTS.ROUTER,
          functionName: "addLiquidityLTC",
          args: [tokenSide.address as Address, tokenAmt, tokenMin, ethMin, address, dl],
          value: ethAmt,
        },
        onError,
      );
    } else {
      writeContract(
        {
          abi: ROUTER_ABI,
          address: CONTRACTS.ROUTER,
          functionName: "addLiquidity",
          args: [
            tokenA.address as Address, tokenB.address as Address,
            parsedA, parsedB, minA, minB, address, dl,
          ],
        },
        onError,
      );
    }
  }

  const insufA = isConnected && parsedA > 0n && parsedA > balanceA;
  const insufB = isConnected && parsedB > 0n && parsedB > balanceB;

  function btn() {
    if (!isConnected) {
      return (
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <button onClick={openConnectModal} className="w-full h-14 rounded-2xl bg-brand-gradient text-[oklch(0.18_0.04_200)] font-bold">
              Connect Wallet
            </button>
          )}
        </ConnectButton.Custom>
      );
    }
    if (insufA) return <Disabled label={`Insufficient ${tokenA.symbol}`} />;
    if (insufB) return <Disabled label={`Insufficient ${tokenB.symbol}`} />;
    if (needsApproveA) return <Action loading={isPending || confirming} onClick={() => approve(tokenA)} label={`Approve ${tokenA.symbol}`} />;
    if (needsApproveB) return <Action loading={isPending || confirming} onClick={() => approve(tokenB)} label={`Approve ${tokenB.symbol}`} />;
    if (parsedA === 0n || parsedB === 0n) return <Disabled label="Enter amounts" />;
    return <Action loading={isPending || confirming} onClick={add} label={pairExists ? "Add Liquidity" : "Create Pair & Add"} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-3xl p-5 w-full max-w-[480px]"
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Plus className="h-4 w-4 text-brand" /> Add Liquidity</h2>
        <p className="text-xs text-muted-foreground">Provide a pair to earn 0.30% LP fees on every swap.</p>
      </div>

      <Field
        label="Token A" token={tokenA} amount={amtA} setAmount={setAmtA}
        onPickToken={() => setOpenSel("a")} balance={balanceA}
        connected={isConnected}
      />
      <div className="grid place-items-center my-1.5">
        <div className="h-8 w-8 rounded-xl bg-surface-3 grid place-items-center"><Plus className="h-4 w-4" /></div>
      </div>
      <Field
        label="Token B" token={tokenB} amount={amtB} setAmount={setAmtB}
        onPickToken={() => setOpenSel("b")} balance={balanceB}
        connected={isConnected}
      />

      <div className="mt-3 px-1 text-xs text-muted-foreground space-y-1.5">
        <div className="flex justify-between">
          <span>Pool</span>
          <span className="text-foreground/80">{pairExists ? "Exists" : "New pair"}</span>
        </div>
        {pairExists && reserves.data && token0.data && (() => {
          const [r0, r1] = reserves.data as readonly [bigint, bigint, number];
          const aIs0 = (token0.data as Address).toLowerCase() === wrappedAddress(tokenA).toLowerCase();
          const reserveA = aIs0 ? r0 : r1;
          const reserveB = aIs0 ? r1 : r0;
          return (
            <div className="flex justify-between">
              <span>Reserves</span>
              <span className="num text-foreground/80">
                {formatPretty(Number(formatUnits(reserveA, tokenA.decimals)), 2)} {tokenA.symbol} /{" "}
                {formatPretty(Number(formatUnits(reserveB, tokenB.decimals)), 2)} {tokenB.symbol}
              </span>
            </div>
          );
        })()}
      </div>

      <div className="mt-4">{btn()}</div>
      {confirmed && <div className="mt-3 text-center text-xs text-success">Liquidity added ✓</div>}

      <TokenSelectModal open={openSel === "a"} onClose={() => setOpenSel(null)} onSelect={setTokenA} exclude={tokenB} />
      <TokenSelectModal open={openSel === "b"} onClose={() => setOpenSel(null)} onSelect={setTokenB} exclude={tokenA} />
    </motion.div>
  );
}

function Field({
  label, token, amount, setAmount, onPickToken, balance, connected,
}: {
  label: string; token: Token; amount: string; setAmount: (v: string) => void;
  onPickToken: () => void; balance: bigint; connected: boolean;
}) {
  return (
    <div className="bg-surface rounded-2xl p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span>{label}</span>
        {connected && (
          <button
            onClick={() => setAmount(formatUnits(balance, token.decimals))}
            className="hover:text-foreground"
          >
            Balance: <span className="num">{formatPretty(Number(formatUnits(balance, token.decimals)), 4)}</span>
            <span className="ml-1.5 text-brand">MAX</span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          inputMode="decimal" placeholder="0.0"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          className="num bg-transparent outline-none flex-1 text-2xl font-semibold placeholder:text-muted-foreground/50 min-w-0"
        />
        <TokenSelectorButton token={token} onClick={onPickToken} />
      </div>
    </div>
  );
}

function Action({ loading, onClick, label }: { loading: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick} disabled={loading}
      className="w-full h-14 rounded-2xl bg-brand-gradient text-[oklch(0.18_0.04_200)] font-bold inline-flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-70"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />} {label}
    </button>
  );
}
function Disabled({ label }: { label: string }) {
  return (
    <button disabled className="w-full h-14 rounded-2xl bg-surface-3 text-muted-foreground font-bold cursor-not-allowed">
      {label}
    </button>
  );
}
