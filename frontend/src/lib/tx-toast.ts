import { toast } from "sonner";

const EXPLORER = "https://liteforge.explorer.caldera.xyz/tx/";

export function txPending(id: string, message: string) {
  toast.loading(message, {
    id,
    description: "Waiting for confirmation on LitVM...",
  });
}

export function txSuccess(id: string, message: string, hash?: string) {
  toast.success(message, {
    id,
    description: hash ? "Confirmed on-chain" : undefined,
    action: hash
      ? {
          label: "View",
          onClick: () => window.open(`${EXPLORER}${hash}`, "_blank"),
        }
      : undefined,
    duration: 5000,
  });
}

export function txError(id: string, message: string, err?: unknown) {
  const reason =
    err instanceof Error
      ? err.message.includes("User rejected")
        ? "You rejected the transaction"
        : err.message.split("\n")[0].slice(0, 140)
      : "Something went wrong";
  toast.error(message, {
    id,
    description: reason,
    duration: 6000,
  });
}
