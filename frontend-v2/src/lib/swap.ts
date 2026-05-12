import type { Address } from "viem";
import { CONTRACTS, type Token, wrappedAddress } from "@/config/contracts";

export function buildPath(tokenIn: Token, tokenOut: Token): Address[] {
  const a = wrappedAddress(tokenIn);
  const b = wrappedAddress(tokenOut);
  // Direct path. (Could expand to multi-hop via WLTC if a/b != WLTC.)
  if (a.toLowerCase() === b.toLowerCase()) return [a];
  if (
    a.toLowerCase() === CONTRACTS.WLTC.toLowerCase() ||
    b.toLowerCase() === CONTRACTS.WLTC.toLowerCase()
  ) {
    return [a, b];
  }
  // Try multi-hop via WLTC by default
  return [a, CONTRACTS.WLTC, b];
}

export function deadlineMinutes(mins: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + mins * 60);
}

export function applySlippage(amount: bigint, bps: number): bigint {
  // bps in basis points (50 = 0.5%)
  const denom = 10_000n;
  return (amount * BigInt(10_000 - bps)) / denom;
}

export function formatPretty(n: number, max = 6): string {
  if (!isFinite(n)) return "0";
  if (n === 0) return "0";
  if (n < 0.0001) return n.toExponential(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: max });
}

/**
 * Compute price impact (in %) for a swap on a Uniswap V2 constant-product pool.
 * Compares the mid-price (reserveOut / reserveIn) against the effective execution price.
 * Returns 0 if reserves are insufficient.
 */
export function calcPriceImpact(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
): number {
  if (reserveIn === 0n || reserveOut === 0n || amountIn === 0n) return 0;
  // V2 with 0.3% fee
  const amountInWithFee = amountIn * 997n;
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn * 1000n + amountInWithFee;
  const amountOut = numerator / denominator;
  // mid price * amountIn
  const midOut = (reserveOut * amountIn) / reserveIn;
  if (midOut === 0n) return 0;
  const impactBps = ((midOut - amountOut) * 10_000n) / midOut;
  return Number(impactBps) / 100;
}
