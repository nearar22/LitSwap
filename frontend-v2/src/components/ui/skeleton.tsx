import { cn } from "@/lib/utils";

/**
 * Shimmer skeleton. Uses a diagonal animated highlight on top of a muted base.
 * Pair with `inline-block`/`block` and an explicit width/height.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-white/[0.06] border border-white/5",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
