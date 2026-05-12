import {
  Link,
  createRootRoute,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { Web3Providers } from "@/providers/Web3Providers";
import { AppShell } from "@/components/AppShell";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass-strong rounded-3xl p-10">
        <h1 className="text-7xl font-bold text-gradient-brand">404</h1>
        <h2 className="mt-3 text-xl font-semibold">Lost in the rollup</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn't exist on LitVM.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-[oklch(0.18_0.04_200)]"
        >
          Back to LitSwap
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass-strong rounded-3xl p-10">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-5 rounded-xl bg-brand-gradient px-5 py-2.5 text-sm font-bold text-[oklch(0.18_0.04_200)]"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LitSwap · Decentralized Exchange on LitVM" },
      { name: "description", content: "Trade tokens at light speed on LitVM, a ZK rollup powered by Litecoin. Swap, provide liquidity and earn fees on LitSwap." },
      { name: "theme-color", content: "#1a2030" },
      { property: "og:title", content: "LitSwap · DEX on LitVM" },
      { property: "og:description", content: "Lightning-fast token swaps and liquidity on the LitVM ZK rollup." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <Web3Providers>
      <AppShell />
    </Web3Providers>
  );
}
