import React, { useState } from "react";
import { useAccount, useConfig } from "wagmi";
import { simulateContract, writeContract, readContract } from "@wagmi/core";
import marketplaceABI from "../contracts/MarketplaceABI.json";

const marketplaceAddress = "0x8464135c8F25Da09e49BC8782676a84730C318bC";

function UseTicketsPage() {
  const { address: userAddress, isConnected } = useAccount();
  const config = useConfig();
  const [eventContract, setEventContract] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const useTicket = async () => {
    try {
      setLoading(true);

      const { request } = await simulateContract(config, {
        address: marketplaceAddress,
        abi: marketplaceABI.abi,
        functionName: "useTicket",
        args: [eventContract, 0, quantity],
      });

      const txHash = await writeContract(config, request);

      console.log("Ticket used! Tx hash:", txHash);
      alert("Ticket usage successful!");
    } catch (error) {
      console.error("Error using ticket:", error);
      alert(`Failed to use ticket: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Use Your Tickets</h1>

      {!isConnected ? (
        <div className="text-center text-gray-500">
          Please connect your wallet to use tickets.
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6">
          <div className="mb-4">
            <label className="block font-semibold mb-1">Event Contract Address:</label>
            <input
              type="text"
              value={eventContract}
              onChange={(e) => setEventContract(e.target.value)}
              placeholder="0x..."
              className="w-full border rounded p-2"
            />
          </div>

          <div className="mb-4">
            <label className="block font-semibold mb-1">Quantity to Use:</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full border rounded p-2"
            />
          </div>

          <button
            onClick={useTicket}
            disabled={loading || !eventContract || quantity <= 0}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? "Processing..." : "Use Ticket"}
          </button>
        </div>
      )}
    </div>
  );
}

export default UseTicketsPage;
