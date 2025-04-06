import React, { useState } from "react";
import { useAccount, useWriteContract, useSimulateContract } from "wagmi";
import { ethers } from "ethers";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import marketplaceABI from "../contracts/MarketplaceABI.json";

function OrganizersListingPage() {
  const { address, chain, isConnected } = useAccount();

  const [formData, setFormData] = useState({
    eventContractAddress: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");

  // Replace with your actual marketplace contract address
  const marketplaceAddress = "0x8464135c8F25Da09e49BC8782676a84730C318bC";

  // Prepare the contract write hook
  const {
    data,
    isLoading: isSimulateLoading,
    error: simulateError,
  } = useSimulateContract({
    address: marketplaceAddress,
    abi: marketplaceABI.abi,
    functionName: "createOfficialListing",
    args: [
      formData.eventContractAddress,
      0, // let 0 be the ticket type for normal tickets first
    ],
    enabled: Boolean(formData.eventContractAddress),
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

  const isLoading = isSimulateLoading || isWriteLoading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (simulateError) {
        console.error("Simulation error:", simulateError);
        return;
      }
      writeContract(data.request);
      setTransactionHash(hash);
    } catch (err) {
      console.error("Error creating listing:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen w-full bg-gray-100 py-10 px-4">
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-blue-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white text-center">
              List Your Event Tickets
            </h1>
          </div>

          <div className="p-6 md:p-8">
            {!isConnected ? (
              <div className="text-center py-10">
                <h2 className="text-xl mb-6">
                  Connect your wallet to create listings
                </h2>
                <div className="flex justify-center">
                  <ConnectButton />
                </div>
              </div>
            ) : (
              <>
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
                          Listing created successfully!
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
                        The address of your ERC1155 contract containing the
                        tickets
                      </p>
                    </div>

                    {/* <div>
                      <label
                        htmlFor="eventName"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Event Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="eventName"
                        name="eventName"
                        value={formData.eventName}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                          id="ticketPrice"
                          name="ticketPrice"
                          value={formData.ticketPrice}
                          onChange={handleInputChange}
                          step="0.0001"
                          min="0"
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="ticketQuantity"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Number of Tickets{" "}
                          <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id="ticketQuantity"
                          name="ticketQuantity"
                          value={formData.ticketQuantity}
                          onChange={handleInputChange}
                          min="1"
                          required
                          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="eventDate"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Event Date
                      </label>
                      <input
                        type="date"
                        id="eventDate"
                        name="eventDate"
                        value={formData.eventDate}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div> */}

                    <div className="flex justify-center pt-6">
                      <button
                        type="submit"
                        disabled={isLoading || isSubmitting || simulateError}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading || isSubmitting
                          ? "Creating Listing..."
                          : "Create Listing"}
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

export default OrganizersListingPage;
