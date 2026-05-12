import { useMemo } from "react";
import { useReadContracts } from "wagmi";
import { type Address } from "viem";
import { CONTRACTS, type Token, wrappedAddress } from "@/config/contracts";
import { ROUTER_ABI } from "@/config/abis";

export type Route = {
  path: Address[];
  amountOut: bigint;
  isMultiHop: boolean;
};

/**
 * Compares a direct swap path [in, out] against a multi-hop path [in, WLTC, out]
 * and returns the one with the higher amountOut. Falls back gracefully when
 * either path has no liquidity.
 */
export function useBestRoute(
  tokenIn: Token,
  tokenOut: Token,
  amountIn: bigint,
): {
  route: Route | null;
  isFetching: boolean;
  noLiquidity: boolean;
} {
  const a = wrappedAddress(tokenIn);
  const b = wrappedAddress(tokenOut);
  const sameToken = a.toLowerCase() === b.toLowerCase();
  const involvesWltc =
    a.toLowerCase() === CONTRACTS.WLTC.toLowerCase() ||
    b.toLowerCase() === CONTRACTS.WLTC.toLowerCase();

  const directPath = useMemo<Address[]>(() => [a, b], [a, b]);
  const hopPath = useMemo<Address[]>(
    () => [a, CONTRACTS.WLTC, b],
    [a, b],
  );

  // Only query hop path if it's actually different from direct
  const queryHop = !involvesWltc && !sameToken;
  const enabled = amountIn > 0n && !sameToken;

  const quotes = useReadContracts({
    contracts: [
      {
        abi: ROUTER_ABI,
        address: CONTRACTS.ROUTER,
        functionName: "getAmountsOut",
        args: [amountIn, directPath],
      },
      ...(queryHop
        ? [
            {
              abi: ROUTER_ABI,
              address: CONTRACTS.ROUTER,
              functionName: "getAmountsOut",
              args: [amountIn, hopPath],
            },
          ]
        : []),
    ] as never,
    query: { enabled, refetchInterval: 5_000 },
  });

  type QuoteResult = { status: "success" | "failure"; result?: unknown };
  const data = (quotes.data ?? []) as QuoteResult[];
  const direct = data[0];
  const hop = queryHop ? data[1] : undefined;

  const lastOf = (r?: QuoteResult): bigint => {
    if (!r || r.status !== "success") return 0n;
    const arr = r.result as readonly bigint[] | undefined;
    return arr && arr.length > 0 ? (arr[arr.length - 1] ?? 0n) : 0n;
  };

  const directOut = lastOf(direct);
  const hopOut = lastOf(hop);

  const route = useMemo<Route | null>(() => {
    if (!enabled) return null;
    // Prefer the larger output. Ties go to direct (cheaper gas).
    if (directOut > 0n && directOut >= hopOut) {
      return { path: directPath, amountOut: directOut, isMultiHop: false };
    }
    if (hopOut > 0n) {
      return { path: hopPath, amountOut: hopOut, isMultiHop: true };
    }
    return null;
  }, [enabled, directOut, hopOut, directPath, hopPath]);

  return {
    route,
    isFetching: quotes.isFetching,
    noLiquidity:
      enabled && !quotes.isFetching && directOut === 0n && hopOut === 0n,
  };
}
