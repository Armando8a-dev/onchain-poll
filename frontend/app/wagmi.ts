import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

// Get a free projectId at https://cloud.walletconnect.com
export const config = getDefaultConfig({
  appName: "OnChainPoll",
  projectId: "c3bfa789688ced3fd58a97d6a014f557",
  chains: [sepolia],
  ssr: true,
});
