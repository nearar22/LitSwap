import { defineChain } from "viem";

export const litvmTestnet = defineChain({
  id: 4441,
  name: "LitVM Testnet",
  nativeCurrency: { name: "zkLTC", symbol: "zkLTC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://liteforge.rpc.caldera.xyz/http"] },
  },
  blockExplorers: {
    default: { name: "LitVM Explorer", url: "https://liteforge.explorer.caldera.xyz" },
  },
  testnet: true,
});
