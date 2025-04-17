import React, { useState } from "react";
import { useConfig, useAccount } from "wagmi";
import { simulateContract, writeContract } from "@wagmi/core";
import marketplaceABI from "../contracts/MarketplaceABI.json";

const marketplaceAddress = "0x8464135c8F25Da09e49BC8782676a84730C318bC";

function RefundPage() {
  const { isConnected } = useAccount();
  const config = useConfig();
  const [eventContract, setEventContract] = useState("");
  const [voteLoading, setVoteLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

  const voteForRefund = async () => {
    try {
      setVoteLoading(true);

      const { request } = await simulateContract(config, {
        address: marketplaceAddress,
        abi: marketplaceABI.abi,
        functionName: "voteForRefund",
        args: [eventContract],
      });

      const txHash = await writeContract(config, request);

      console.log("Voted for refund! Tx hash:", txHash);
      alert("✅ Vote was successful!");
    } catch (error) {
      console.error("Error voting:", error);
      alert(`❌ Failed to vote: ${error.message}`);
    } finally {
      setVoteLoading(false);
    }
  };

  const claimRefund = async () => {
    try {
      setClaimLoading(true);

      const { request } = await simulateContract(config, {
        address: marketplaceAddress,
        abi: marketplaceABI.abi,
        functionName: "claimRefund",
        args: [eventContract],
      });

      const txHash = await writeContract(config, request);

      console.log("Claimed refund! Tx hash:", txHash);
      alert("✅ Refund claimed successfully!");
    } catch (error) {
      console.error("Error claiming refund:", error);
      alert(`❌ Failed to claim refund: ${error.message}`);
    } finally {
      setClaimLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">Vote & Claim Refund</h1>

      {!isConnected ? (
        <div className="text-center text-gray-500">
          Please connect your wallet to vote for a refund.
        </div>
      ) : (
        <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6">
          <p className="text-sm text-gray-600 mb-4 text-center">
            If the event didn't meet your expectations, you can vote for a
            refund and potentially claim your money back. Please enter the event contract's address below.
          </p>

          <div className="mb-4">
            <label className="block font-semibold mb-1">
              Event Contract Address:
            </label>
            <input
              type="text"
              value={eventContract}
              onChange={(e) => setEventContract(e.target.value)}
              placeholder="0x..."
              className="w-full border rounded p-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={voteForRefund}
              disabled={voteLoading || !eventContract}
              className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {voteLoading ? "Voting..." : "Vote for Refund"}
            </button>
            
            <button
              onClick={claimRefund}
              disabled={claimLoading || !eventContract}
              className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:bg-gray-400"
            >
              {claimLoading ? "Claiming..." : "Claim Refund"}
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p className="mb-2"><strong>Voting:</strong> Submit your vote for a refund if you were dissatisfied with the event.</p>
            <p><strong>Claiming:</strong> After enough votes have been collected and the refund threshold is met, you can claim your refund.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default RefundPage;