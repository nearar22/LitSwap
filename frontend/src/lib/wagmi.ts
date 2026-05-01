import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { defineChain } from "viem";

export const litvmTestnet = defineChain({
  id: 4441,
  name: "LitVM LiteForge",
  nativeCurrency: {
    decimals: 18,
    name: "zkLTC",
    symbol: "zkLTC",
  },
  rpcUrls: {
    default: {
      http: ["https://liteforge.rpc.caldera.xyz/http"],
      webSocket: ["wss://liteforge.rpc.caldera.xyz/ws"],
    },
  },
  blockExplorers: {
    default: {
      name: "LiteForge Explorer",
      url: "https://liteforge.explorer.caldera.xyz",
    },
  },
  testnet: true,
});

export const config =
  typeof window === "undefined"
    ? (null as unknown as ReturnType<typeof getDefaultConfig>)
    : getDefaultConfig({
        appName: "LitSwap",
        projectId:
          process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "litswap-litvm",
        chains: [litvmTestnet],
        ssr: false,
      });
