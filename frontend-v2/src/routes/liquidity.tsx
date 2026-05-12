import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Minus } from "lucide-react";
import { AddLiquidityCard } from "@/components/AddLiquidityCard";
import { RemoveLiquidityCard } from "@/components/RemoveLiquidityCard";

export const Route = createFileRoute("/liquidity")({
  component: LiquidityPage,
  head: () => ({
    meta: [
      { title: "Liquidity · LitSwap" },
      {
        name: "description",
        content:
          "Provide liquidity to LitSwap V2 pools and earn fees, or withdraw your share.",
      },
    ],
  }),
});

function LiquidityPage() {
  const [tab, setTab] = useState<"add" | "remove">("add");

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-12 space-y-5">
      <div className="flex gap-1.5 p-1 rounded-2xl glass-strong w-full max-w-[480px] mx-auto">
        <button
          onClick={() => setTab("add")}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "add"
              ? "bg-brand-gradient text-[oklch(0.18_0.04_200)]"
              : "text-muted-foreground hover:bg-surface-3"
          }`}
        >
          <Plus className="h-4 w-4" /> Add
        </button>
        <button
          onClick={() => setTab("remove")}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
            tab === "remove"
              ? "bg-brand-gradient text-[oklch(0.18_0.04_200)]"
              : "text-muted-foreground hover:bg-surface-3"
          }`}
        >
          <Minus className="h-4 w-4" /> Remove
        </button>
      </div>

      <div className="grid place-items-center">
        {tab === "add" ? (
          <AddLiquidityCard />
        ) : (
          <RemoveLiquidityCard />
        )}
      </div>
    </div>
  );
}
