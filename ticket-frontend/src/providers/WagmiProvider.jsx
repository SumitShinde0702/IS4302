import { WagmiProvider, createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'

const hardhat = defineChain({
  id: 31337,
  name: "Hardhat Local",
  network: "Hardhat Local",
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
});

const config = createConfig({
  chains: [hardhat],
  transports: {
    [hardhat.id]: http(),
  },
});

const queryClient = new QueryClient();

export const WagmiClientProvider = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    <WagmiProvider config={config}>
      <RainbowKitProvider chains={[hardhat]}>
        {children}
      </RainbowKitProvider>
    </WagmiProvider>
  </QueryClientProvider>
);
