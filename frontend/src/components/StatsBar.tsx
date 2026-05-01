"use client";

import { useReadContract, useReadContracts, useAccount } from "wagmi";
import { CONTRACTS, FACTORY_ABI, PAIR_ABI } from "@/lib/contracts";
import { Activity, Database, Layers, Wallet } from "lucide-react";

export function StatsBar() {
  const { address } = useAccount();

  const factoryDeployed =
    CONTRACTS.FACTORY !== "0x0000000000000000000000000000000000000000";

  const { data: pairsLength } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: "allPairsLength",
    query: { enabled: factoryDeployed, refetchInterval: 15000 },
  });

  const pairCount = pairsLength !== undefined ? Number(pairsLength) : 0;

  // Fetch all pair addresses
  const { data: pairAddresses } = useReadContracts({
    contracts: Array.from({ length: pairCount }, (_, i) => ({
      address: CONTRACTS.FACTORY,
      abi: FACTORY_ABI,
      functionName: "allPairs",
      args: [BigInt(i)],
    })),
    query: { enabled: pairCount > 0 },
  });

  const validPairs = (pairAddresses ?? [])
    .map((r) => (r.status === "success" ? (r.result as unknown as `0x${string}`) : null))
    .filter((a): a is `0x${string}` => !!a);

  // For each pair, read user LP balance (if connected)
  const { data: userLpBalances } = useReadContracts({
    contracts: validPairs.flatMap((pair) =>
      address
        ? [
            {
              address: pair,
              abi: PAIR_ABI,
              functionName: "balanceOf",
              args: [address],
            },
          ]
        : []
    ),
    query: { enabled: !!address && validPairs.length > 0 },
  });

  const yourPositions = (userLpBalances ?? []).filter(
    (r) => r.status === "success" && (r.result as bigint) > 0n
  ).length;

  const stats = [
    {
      icon: Layers,
      label: "Active Pairs",
      value: pairCount.toString(),
      sublabel: "On LitSwap",
      color: "text-purple-400",
    },
    {
      icon: Wallet,
      label: "Your Positions",
      value: address ? yourPositions.toString() : "—",
      sublabel: address ? "LP positions" : "Connect wallet",
      color: "text-emerald-400",
    },
    {
      icon: Database,
      label: "Network",
      value: "LitVM",
      sublabel: "Chain 4441",
      color: "text-sky-400",
    },
    {
      icon: Activity,
      label: "Fee Tier",
      value: "0.3%",
      sublabel: "Per swap",
      color: "text-amber-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
      {stats.map(({ icon: Icon, label, value, sublabel, color }) => (
        <div key={label} className="glass rounded-xl p-4 glass-hover">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`w-4 h-4 ${color}`} />
            <div className="text-xs text-slate-400">{label}</div>
          </div>
          <div className="text-xl font-bold text-white">{value}</div>
          <div className={`text-xs ${color} mt-0.5`}>{sublabel}</div>
        </div>
      ))}
    </div>
  );
}
