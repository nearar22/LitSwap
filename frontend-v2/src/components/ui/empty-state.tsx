import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
};

/**
 * Decorative empty state for lists / sections that have no data yet.
 * Provides a soft glass surface with a gradient halo behind the icon.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl glass-strong px-6 py-10 sm:py-14 text-center",
        "flex flex-col items-center gap-3",
        className,
      )}
    >
      {/* soft brand halo */}
      <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 h-40 w-40 rounded-full bg-brand/20 blur-3xl" />

      {icon && (
        <div className="relative grid place-items-center h-14 w-14 rounded-2xl bg-brand-gradient/15 border border-brand/20 text-brand">
          {icon}
        </div>
      )}

      <div className="relative max-w-md">
        <div className="font-display font-semibold text-lg text-foreground">{title}</div>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>

      {action && <div className="relative mt-2">{action}</div>}
    </div>
  );
}
