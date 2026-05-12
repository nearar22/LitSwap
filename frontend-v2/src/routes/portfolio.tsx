import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAccount } from "wagmi";
import { Wallet, Copy, ExternalLink, Briefcase } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { TokenBalances } from "@/components/TokenBalances";
import { YourPositions } from "@/components/YourPositions";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import type { Token } from "@/config/contracts";

const EXPLORER = "https://liteforge.explorer.caldera.xyz";

export const Route = createFileRoute("/portfolio")({
  component: PortfolioPage,
  head: () => ({
    meta: [
      { title: "Portfolio · LitSwap" },
      {
        name: "description",
        content: "Track your token balances and liquidity positions on LitSwap.",
      },
    ],
  }),
});

function PortfolioPage() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();

  async function copyAddr() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success("Address copied");
    } catch {
      toast.error("Clipboard blocked");
    }
  }

  function selectPosition(_a: Token, _b: Token) {
    // Send the user to the liquidity page's remove tab. We keep it simple;
    // selecting a specific pool for pre-fill can be wired later.
    navigate({ to: "/liquidity" });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-6">
      {/* Header */}
      <header className="glass-strong rounded-3xl p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-12 h-56 w-56 rounded-full bg-brand/15 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-brand-gradient grid place-items-center text-[oklch(0.18_0.04_200)] shadow-lg">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
              <p className="text-sm text-muted-foreground">
                Everything you hold on LitSwap, in one place.
              </p>
            </div>
          </div>

          {isConnected && address && (
            <div className="flex items-center gap-2 bg-surface rounded-2xl px-3 py-2">
              <Wallet className="h-4 w-4 text-brand" />
              <code className="text-xs num font-mono">
                {address.slice(0, 6)}…{address.slice(-4)}
              </code>
              <button
                onClick={copyAddr}
                className="h-7 w-7 grid place-items-center rounded-lg hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors"
                title="Copy"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <a
                href={`${EXPLORER}/address/${address}`}
                target="_blank"
                rel="noreferrer"
                className="h-7 w-7 grid place-items-center rounded-lg hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors"
                title="Explorer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}
        </div>
      </header>

      {!isConnected ? (
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="Connect your wallet"
          description="Connect a wallet to see your token balances and liquidity positions."
          action={
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button
                  onClick={openConnectModal}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-gradient text-[oklch(0.18_0.04_200)] font-semibold px-5 py-2.5 text-sm hover:brightness-110"
                >
                  Connect Wallet
                </button>
              )}
            </ConnectButton.Custom>
          }
        />
      ) : (
        <>
          <TokenBalances />
          <YourPositions onSelect={selectPosition} className="w-full" />
        </>
      )}
    </div>
  );
}
