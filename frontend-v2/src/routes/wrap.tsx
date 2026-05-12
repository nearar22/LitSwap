import { createFileRoute } from "@tanstack/react-router";
import { WrapCard } from "@/components/WrapCard";

export const Route = createFileRoute("/wrap")({
  component: WrapPage,
  head: () => ({
    meta: [
      { title: "Wrap · LitSwap" },
      { name: "description", content: "Wrap zkLTC ⇄ WLTC at a 1:1 rate on LitVM." },
    ],
  }),
});

function WrapPage() {
  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-14 grid place-items-center">
      <WrapCard />
    </div>
  );
}
