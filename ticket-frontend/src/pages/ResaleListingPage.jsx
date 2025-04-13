import React, { useState } from "react";
import {
  useAccount,
  useWriteContract,
  useSimulateContract,
  useReadContract,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import marketplaceABI from "../contracts/MarketplaceABI.json";
import eventContractABI from "../contracts/EventABI.json";
import ticketContractABI from "../contracts/TicketABI.json";

function ResaleListingPage() {
  const { address: userAddress, chain, isConnected } = useAccount();

  const [formData, setFormData] = useState({
    eventContractAddress: "",
    ticketPrice: "",
    quantity: 1,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");
  const [needsApproval, setNeedsApproval] = useState(false);
  const [ticketContractAddress, setTicketContractAddress] = useState("");
  const [isApprovalLoading, setIsApprovalLoading] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState(false);

  // Replace with your actual marketplace contract address
  const marketplaceAddress = "0x8464135c8F25Da09e49BC8782676a84730C318bC";

  // Read ticket contract address from event contract
  const { data: ticketContract } = useReadContract({
    address: formData.eventContractAddress,
    abi: eventContractABI.abi,
    functionName: "ticketContract",
    enabled: Boolean(formData.eventContractAddress),
  });

  // Check if approval is needed
  const { data: isApproved } = useReadContract({
    address: ticketContractAddress,
    abi: ticketContractABI.abi,
    functionName: "isApprovedForAll",
    args: [userAddress, formData.eventContractAddress],
    enabled: Boolean(ticketContractAddress) && Boolean(userAddress),
  });

  // Update ticket contract address when it's fetched
  React.useEffect(() => {
    if (ticketContract) {
      setTicketContractAddress(ticketContract);
    }
  }, [ticketContract]);

  // Check if approval is needed when approval status changes
  React.useEffect(() => {
    if (isApproved !== undefined) {
      setNeedsApproval(!isApproved);
    }
  }, [isApproved]);

  // Prepare contract for approval
  const { data: approvalData } = useSimulateContract({
    address: ticketContractAddress,
    abi: ticketContractABI.abi,
    functionName: "setApprovalForAll",
    args: [formData.eventContractAddress, true],
    enabled: Boolean(userAddress) && needsApproval,
  });

  const { writeContract: writeApproval } = useWriteContract();

  // Prepare contract for creating resale listing
  const {
    data: resaleData,
    isLoading: isSimulateLoading,
    error: simulateError,
  } = useSimulateContract({
    address: marketplaceAddress,
    abi: marketplaceABI.abi,
    functionName: "createResaleListing",
    args: [
      formData.eventContractAddress,
      formData.ticketPrice ? BigInt(formData.ticketPrice) : BigInt(0),
      BigInt(0), // ticketId default to 0 as specified
      formData.quantity ? BigInt(formData.quantity) : BigInt(1),
    ],
    enabled:
      Boolean(formData.eventContractAddress) &&
      Boolean(formData.ticketPrice) &&
      Boolean(formData.quantity),
  });

  const {
    data: hash,
    writeContract,
    isLoading: isWriteLoading,
    isSuccess,
    isError,
    error,
  } = useWriteContract();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleApproval = async (e) => {
    e.preventDefault();
    setIsApprovalLoading(true);

    try {
      writeApproval(approvalData.request);
    } catch (err) {
      console.error("Error approving marketplace:", err);
    } finally {
      setApprovalSuccess(true);
      setNeedsApproval(false);
      setIsApprovalLoading(false);
    }
  };

  const isLoading = isSimulateLoading || isWriteLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (simulateError) {
        console.error("Simulation error:", simulateError);
        return;
      }
      writeContract(resaleData.request);
      setTransactionHash(hash);
    } catch (err) {
      console.error("Error creating resale listing:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-gray-100 py-10 px-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-purple-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white text-center">
              Resell Your Tickets
            </h1>
          </div>

          <div className="p-6 md:p-8">
            {!isConnected ? (
              <div className="text-center py-10">
                <h2 className="text-xl mb-6">
                  Connect your wallet to resell tickets
                </h2>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            ) : (
              <>
                {needsApproval && ticketContractAddress ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 mb-8">
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">
                      Approval Required
                    </h3>
                    <p className="text-yellow-700 mb-4">
                      Before you can list your tickets for resale, you need to
                      approve the marketplace contract to transfer your tickets.
                    </p>
                    <button
                      onClick={handleApproval}
                      disabled={isApprovalLoading}
                      className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApprovalLoading
                        ? "Approving..."
                        : "Approve Marketplace"}
                    </button>
                  </div>
                ) : null}

                {approvalSuccess && (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-8">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-green-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-700">
                          Marketplace approved successfully! You can now list
                          your tickets.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {isSuccess ? (
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-8">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-green-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-green-700">
                          Resale listing created successfully!
                        </p>
                        {transactionHash && (
                          <p className="mt-2 text-xs text-green-600">
                            Transaction Hash:{" "}
                            <a
                              href={`${chain?.blockExplorers?.default.url}/tx/${transactionHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {transactionHash.substring(0, 10)}...
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {isError && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-red-700">
                          Error creating listing:{" "}
                          {error?.message || "Unknown error occurred"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="w-full">
                  <div className="space-y-6">
                    <div>
                      <label
                        htmlFor="eventContractAddress"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Event Contract Address{" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="eventContractAddress"
                        name="eventContractAddress"
                        value={formData.eventContractAddress}
                        onChange={handleInputChange}
                        required
                        placeholder="0x..."
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        The address of the event contract for your tickets
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="ticketPrice"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Ticket Price (ETH){" "}
                        <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        id="ticketPrice"
                        name="ticketPrice"
                        value={formData.ticketPrice}
                        onChange={handleInputChange}
                        required
                        placeholder="0.1"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Price per ticket in ETH
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="quantity"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        id="quantity"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Number of tickets to list for resale
                      </p>
                    </div>

                    <div className="flex justify-center pt-6">
                      <button
                        type="submit"
                        disabled={
                          isLoading ||
                          isSubmitting ||
                          simulateError ||
                          needsApproval
                        }
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-8 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading || isSubmitting
                          ? "Creating Listing..."
                          : "Create Resale Listing"}
                      </button>
                    </div>

                    {simulateError && (
                      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-8">
                        <div className="flex">
                          <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                              Cannot create listing:{" "}
                              {simulateError.message || "Unknown error"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResaleListingPage;
