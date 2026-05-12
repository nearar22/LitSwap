import { createFileRoute, Link } from "@tanstack/react-router";
import { PoolsList } from "@/components/PoolsList";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/pools")({
  component: PoolsPage,
  head: () => ({
    meta: [
      { title: "Pools · LitSwap" },
      { name: "description", content: "All liquidity pools on LitSwap, the LitVM DEX." },
    ],
  }),
});

function PoolsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Liquidity Pools</h1>
          <p className="text-muted-foreground mt-1">Provide liquidity to earn 0.30% on every trade.</p>
        </div>
        <Link
          to="/liquidity"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-brand-gradient text-[oklch(0.18_0.04_200)] font-bold"
        >
          <Plus className="h-4 w-4" /> Add Liquidity
        </Link>
      </div>
      <PoolsList />
    </div>
  );
}
