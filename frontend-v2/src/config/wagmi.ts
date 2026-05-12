import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { litvmTestnet } from "./chain";

export const wagmiConfig = getDefaultConfig({
  appName: "LitSwap",
  projectId: "litswap-litvm-dex",
  chains: [litvmTestnet],
  ssr: false,
});
