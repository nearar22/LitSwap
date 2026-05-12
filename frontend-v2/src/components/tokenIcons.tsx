/**
 * Inline SVG token icons. No network calls, no CDN; bundled with the app.
 * Each icon is a self-contained <svg> sized via the `size` prop.
 *
 * Brand colours follow the official assets of each protocol where possible.
 */

type IconProps = { size?: number };

function Wrap({ size = 32, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className="block"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/* ─────────────────────────  LITECOIN (zkLTC / WLTC)  ───────────────────── */
export function LtcIcon(p: IconProps) {
  return (
    <Wrap {...p}>
      <defs>
        <linearGradient id="ltc-bg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#BFBBBB" />
          <stop offset="1" stopColor="#7C7C7C" />
        </linearGradient>
        <linearGradient id="ltc-sheen" x1="16" y1="2" x2="16" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#ltc-bg)" />
      <circle cx="16" cy="14" r="13" fill="url(#ltc-sheen)" />
      {/* Stylised "Ł" */}
      <path
        d="M14.55 8.5h3.6L16.4 15.6l3.05-1 -.6 2.2 -3.05.95 -.7 2.55h7.1l-.65 2.7H10.85l1.4-5.05-1.95.6.6-2.25 1.95-.6 2.7-7.2z"
        fill="#fff"
      />
    </Wrap>
  );
}

/* ─────────────────────────────  USD COIN  ──────────────────────────────── */
export function UsdcIcon(p: IconProps) {
  return (
    <Wrap {...p}>
      <circle cx="16" cy="16" r="16" fill="#2775CA" />
      <path
        d="M20.05 14.6c-.2-1.55-1.1-2.1-2.95-2.35 -1.3-.18-1.55-.5-1.55-1.05 0-.55.4-.9 1.2-.9 .72 0 1.12.25 1.32.85.05.15.2.25.35.25h.7c.2 0 .35-.15.35-.35v-.05c-.18-1.05-1.02-1.85-2.07-1.95v-1.1c0-.2-.15-.35-.4-.4h-.65c-.2 0-.35.15-.4.4v1.05c-1.3.18-2.13 1.05-2.13 2.15 0 1.45.85 2.05 2.7 2.3 1.2.2 1.6.5 1.6 1.15 0 .65-.55 1.1-1.3 1.1-1.05 0-1.4-.45-1.55-1.05 -.05-.2-.2-.3-.35-.3h-.75c-.2 0-.35.15-.35.35v.05c.2 1.2 1 2.05 2.43 2.3v1.1c0 .2.15.35.4.4h.65c.2 0 .35-.15.4-.4v-1.1c1.32-.22 2.18-1.15 2.18-2.35z"
        fill="#fff"
      />
      <path
        d="M14.05 21.6c-3.4-1.2-5.15-5-3.85-8.4 .65-1.85 2.05-3.25 3.85-3.95 .2-.1.3-.25.3-.5v-.6c0-.2-.1-.35-.3-.4 -.05 0-.15 0-.2.05 -4.1 1.3-6.35 5.65-5.05 9.75 .8 2.4 2.65 4.25 5.05 5.05 .2.1.4 0 .45-.2 .05-.05.05-.1.05-.2v-.6c0-.15-.15-.35-.3-.4zm4.1-13.85c-.2-.1-.4 0-.45.2 -.05.05-.05.1-.05.2v.6c0 .2.15.4.3.5 3.4 1.2 5.15 5 3.85 8.4 -.65 1.85-2.05 3.25-3.85 3.95 -.2.1-.3.25-.3.5v.6c0 .2.1.35.3.4 .05 0 .15 0 .2-.05 4.1-1.3 6.35-5.65 5.05-9.75 -.8-2.45-2.7-4.3-5.05-5.05z"
        fill="#fff"
      />
    </Wrap>
  );
}

/* ───────────────────────────────  TETHER  ──────────────────────────────── */
export function UsdtIcon(p: IconProps) {
  return (
    <Wrap {...p}>
      <circle cx="16" cy="16" r="16" fill="#26A17B" />
      <path
        d="M17.92 17.38v-.01c-.11.01-.69.04-1.97.04 -1.02 0-1.74-.03-2-.04v.01c-3.95-.18-6.9-.87-6.9-1.7 0-.83 2.95-1.52 6.9-1.7v2.71c.27.02 1 .06 2.02.06 1.22 0 1.84-.05 1.95-.06v-2.71c3.94.18 6.88.87 6.88 1.7 0 .83-2.94 1.52-6.88 1.7m0-3.68v-2.42h5.55V7.58H8.5v3.7h5.55v2.42c-4.51.21-7.9 1.1-7.9 2.17 0 1.07 3.39 1.96 7.9 2.17v7.76h3.87v-7.76c4.5-.21 7.88-1.1 7.88-2.17 0-1.07-3.38-1.96-7.88-2.17"
        fill="#fff"
      />
    </Wrap>
  );
}

/* ─────────────────────────────  BITCOIN (BTC / WBTC base)  ─────────────── */
export function BtcIcon(p: IconProps) {
  return (
    <Wrap {...p}>
      <circle cx="16" cy="16" r="16" fill="#F7931A" />
      <path
        d="M22.6 14.4c.3-2-1.2-3.05-3.25-3.75l.65-2.65 -1.6-.4 -.65 2.6c-.4-.1-.85-.2-1.3-.3l.65-2.65 -1.6-.4 -.65 2.65c-.35-.08-.7-.16-1.05-.24v-.01l-2.2-.55 -.45 1.7s1.2.27 1.17.3c.65.16.77.59.75.93l-.75 3.05c.04.01.1.03.16.05 -.05-.01-.1-.03-.16-.04l-1.05 4.27c-.08.2-.28.5-.74.39 .02.02-1.18-.3-1.18-.3l-.8 1.85 2.08.52c.39.1.77.2 1.14.3l-.66 2.7 1.6.4.65-2.65c.43.12.85.23 1.27.33l-.65 2.65 1.6.4.66-2.7c2.74.52 4.8.31 5.66-2.18.7-2 -.04-3.16-1.48-3.91 1.05-.24 1.84-.93 2.05-2.36zm-3.66 5.16c-.5 2-3.86.92-4.95.65l.88-3.55c1.09.27 4.6.81 4.07 2.9zm.5-5.19c-.45 1.82-3.27.9-4.18.67l.8-3.21c.91.23 3.85.65 3.38 2.54z"
        fill="#fff"
      />
    </Wrap>
  );
}

/* ────────────────────────────────  ETHEREUM (ETH / WETH base)  ─────────── */
export function EthIcon(p: IconProps) {
  return (
    <Wrap {...p}>
      <circle cx="16" cy="16" r="16" fill="#627EEA" />
      <g fill="#fff" fillRule="nonzero">
        <path d="M16.5 4v8.87l7.5 3.35z" opacity="0.6" />
        <path d="M16.5 4l-7.5 12.22 7.5-3.35z" />
        <path d="M16.5 21.97V28l7.5-10.37z" opacity="0.6" />
        <path d="M16.5 28v-6.04L9 17.63z" />
        <path d="M16.5 20.57l7.5-4.35-7.5-3.35z" opacity="0.2" />
        <path d="M9 16.22l7.5 4.35V12.87z" opacity="0.6" />
      </g>
    </Wrap>
  );
}

/* ─────────────────────────────────  DAI  ───────────────────────────────── */
export function DaiIcon(p: IconProps) {
  return (
    <Wrap {...p}>
      <circle cx="16" cy="16" r="16" fill="#F5AC37" />
      <path
        d="M9.28 9.6h6.95c4.27 0 7.36 2.32 8.46 5.71h1.78v1.59h-1.4c.03.3.05.6.05.92v.04c0 .35-.02.69-.06 1.02h1.4v1.59h-1.81c-1.13 3.34-4.2 5.62-8.42 5.62H9.28v-5.62H7.5v-1.59h1.78V17.86H7.5v-1.59h1.78V9.6zm1.93 11.3v3.32h5.02c2.97 0 5.21-1.34 6.27-3.32H11.21zm12.06-1.59H11.21v-1.97h12.13c.05.32.07.65.07.99v.03c0 .32-.02.64-.07.95h-.02zm-.85-3.56H11.21V12.41h11.27c1.07 1.04 1.84 2.4 2.18 3.95l-.24-.01z"
        fill="#fff"
      />
    </Wrap>
  );
}

/* ─────────────────────────  Registry  ─────────────────────────── */
export type IconComp = (p: IconProps) => React.ReactElement;

export const TOKEN_ICON: Record<string, IconComp> = {
  zkLTC: LtcIcon,
  WLTC: LtcIcon,
  USDC: UsdcIcon,
  USDT: UsdtIcon,
  WBTC: BtcIcon,
  BTC: BtcIcon,
  WETH: EthIcon,
  ETH: EthIcon,
  DAI: DaiIcon,
};
