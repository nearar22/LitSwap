import { createFileRoute } from "@tanstack/react-router";
import { SwapCard } from "@/components/SwapCard";

export const Route = createFileRoute("/swap")({
  component: SwapPage,
  head: () => ({
    meta: [
      { title: "Swap · LitSwap" },
      { name: "description", content: "Swap tokens instantly on LitVM with on-chain V2 routing." },
    ],
  }),
});

function SwapPage() {
  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-14 grid place-items-center">
      <SwapCard />
    </div>
  );
}
