import {
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  return (
    <Web3Providers>
      <AppShell />
    </Web3Providers>
  );
}
