import React, { useEffect, useState } from "react";
import { useConfig, useAccount, useReadContract } from "wagmi";
import { readContract, simulateContract, writeContract } from "@wagmi/core";
import { formatEther } from "viem";
import marketplaceABI from "../contracts/MarketplaceABI.json";
import eventABI from "../contracts/EventABI.json";

const marketplaceAddress = "0x8464135c8F25Da09e49BC8782676a84730C318bC";

function HomePage() {
  const { isConnected } = useAccount();
  const config = useConfig();
  const [officialListings, setOfficialListings] = useState([]);
  const [resaleListings, setResaleListings] = useState([]);
  const [loadingOfficial, setLoadingOfficial] = useState(true);
  const [loadingResale, setLoadingResale] = useState(true);
  const [purchaseQuantities, setPurchaseQuantities] = useState({});

  // Read official listing count
  const { data: officialListingCount } = useReadContract({
    address: marketplaceAddress,
    abi: marketplaceABI.abi,
    functionName: "officialListingCount",
  });

  // Read resale listing count
  const { data: resaleListingCount } = useReadContract({
    address: marketplaceAddress,
    abi: marketplaceABI.abi,
    functionName: "resaleListingCount",
  });

  // Fetch official listings
  useEffect(() => {
    async function fetchOfficialListings() {
      setLoadingOfficial(true);

      if (!officialListingCount || Number(officialListingCount) === 0) {
        setOfficialListings([]);
        setLoadingOfficial(false);
        return;
      }

      const promises = [];
      for (let i = 1; i <= Number(officialListingCount); i++) {
        const listing = readContract(config, {
          address: marketplaceAddress,
          abi: marketplaceABI.abi,
          functionName: "officialListings",
          args: [i],
        });
        promises.push(listing);
      }

      try {
        const rawListings = await Promise.all(promises);
        const formattedListings = await Promise.all(
          rawListings.map(async (listing, index) => {
            // Get the event phase using the event contract address
            let phase;
            try {
              phase = await readContract(config, {
                address: listing[5],
                abi: eventABI.abi,
                functionName: "getEventPhase",
              });
            } catch (error) {
              console.error(
                `Error fetching phase for event at ${listing[5]}:`,
                error
              );
              phase = 0; // Default to PRESALE if there's an error
            }

            const phaseNames = ["PRESALE", "SALE", "EVENT", "VOTE", "END"];
            const phaseName = phaseNames[Number(phase)] || "UNKNOWN";

            // get the refund vote percentage when the phase is VOTE
            let votePercentage;
            if (phaseName === "VOTE" || phaseName === "END") {
              try {
                const refundVotes = await readContract(config, {
                  address: listing[5],
                  abi: eventABI.abi,
                  functionName: "refundVotes",
                });

                const totalTickets = await readContract(config, {
                  address: listing[5],
                  abi: eventABI.abi,
                  functionName: "totalTicketsSold",
                });

                if (totalTickets && BigInt(totalTickets) > 0n) {
                  votePercentage = Number(
                    (BigInt(refundVotes) * 100n) / BigInt(totalTickets)
                  );
                } else {
                  votePercentage = 0;
                }
              } catch (error) {
                console.error(
                  `Error calculating refund votes for event at ${listing[5]}:`,
                  error
                );
                votePercentage = 0;
              }
            }

            return {
              listingId: index + 1,
              seller: listing[0],
              eventName: listing[1],
              ticketId: listing[2],
              quantity: listing[3],
              pricePerTicket: listing[4],
              eventContractAddress: listing[5],
              phaseName: phaseName,
              isResale: false,
              votePercentage: votePercentage,
            };
          })
        );
        setOfficialListings(formattedListings);

        // Update purchase quantities state
        const initialQuantities = {};
        formattedListings.forEach((listing) => {
          initialQuantities[`official-${listing.listingId}`] = 1;
        });
        setPurchaseQuantities((prev) => ({ ...prev, ...initialQuantities }));
      } catch (error) {
        console.error("Error fetching official listings:", error);
      } finally {
        setLoadingOfficial(false);
      }
    }

    fetchOfficialListings();
  }, [officialListingCount, config]);

  // Fetch resale listings
  useEffect(() => {
    async function fetchResaleListings() {
      setLoadingResale(true);

      if (!resaleListingCount || Number(resaleListingCount) === 0) {
        setResaleListings([]);
        setLoadingResale(false);
        return;
      }

      const promises = [];
      for (let i = 1; i <= Number(resaleListingCount); i++) {
        const listing = readContract(config, {
          address: marketplaceAddress,
          abi: marketplaceABI.abi,
          functionName: "resaleListings",
          args: [i],
        });
        promises.push(listing);
      }

      try {
        const rawListings = await Promise.all(promises);
        const formattedListings = await Promise.all(
          rawListings.map(async (listing, index) => {
            // Get the event phase using the event contract address
            let phase;
            try {
              phase = await readContract(config, {
                address: listing[5], // Assuming eventContractAddress is at index 1 for resale listings
                abi: eventABI.abi,
                functionName: "getEventPhase",
              });
            } catch (error) {
              console.error(
                `Error fetching phase for event at ${listing[5]}:`,
                error
              );
              phase = 0; // Default to PRESALE if there's an error
            }

            const phaseNames = ["PRESALE", "SALE", "EVENT", "VOTE", "END"];
            const phaseName = phaseNames[Number(phase)] || "UNKNOWN";

            // get the refund vote percentage when the phase is VOTE
            let votePercentage;
            if (phaseName === "VOTE" || phaseName === "END") {
              try {
                const refundVotes = await readContract(config, {
                  address: listing[5],
                  abi: eventABI.abi,
                  functionName: "refundVotes",
                });

                const totalTickets = await readContract(config, {
                  address: listing[5],
                  abi: eventABI.abi,
                  functionName: "totalTicketsSold",
                });

                if (totalTickets && BigInt(totalTickets) > 0n) {
                  votePercentage = Number(
                    (BigInt(refundVotes) * 100n) / BigInt(totalTickets)
                  );
                } else {
                  votePercentage = 0;
                }
              } catch (error) {
                console.error(
                  `Error calculating refund votes for event at ${listing[5]}:`,
                  error
                );
                votePercentage = 0;
              }
            }

            return {
              listingId: index + 1,
              seller: listing[0],
              eventName: listing[1],
              ticketId: listing[2],
              quantity: listing[3],
              pricePerTicket: listing[4],
              eventContractAddress: listing[5],
              phaseName: phaseName,
              isResale: false,
              votePercentage: votePercentage,
            };
          })
        );
        setResaleListings(formattedListings);

        // Update purchase quantities state for resale listings
        const initialQuantities = {};
        formattedListings.forEach((listing) => {
          initialQuantities[`resale-${listing.listingId}`] = 1;
        });
        setPurchaseQuantities((prev) => ({ ...prev, ...initialQuantities }));
      } catch (error) {
        console.error("Error fetching resale listings:", error);
      } finally {
        setLoadingResale(false);
      }
    }

    fetchResaleListings();
  }, [resaleListingCount, config]);

  // Handle quantity change
  const handleQuantityChange = (listingId, isResale, value) => {
    const key = isResale ? `resale-${listingId}` : `official-${listingId}`;
    setPurchaseQuantities((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // Buy official ticket function
  const buyOfficialTicket = async (listing) => {
    try {
      const quantityKey = `official-${listing.listingId}`;
      const quantity = purchaseQuantities[quantityKey] || 1;
      const totalPrice = BigInt(listing.pricePerTicket) * BigInt(quantity);

      console.log("Buying official ticket with params:", {
        address: marketplaceAddress,
        functionName: "buyOfficialTicket",
        args: [
          listing.eventContractAddress,
          BigInt(listing.listingId),
          BigInt(quantity),
        ],
        value: totalPrice,
      });

      const { request } = await simulateContract(config, {
        address: marketplaceAddress,
        abi: marketplaceABI.abi,
        functionName: "buyOfficialTicket",
        args: [listing.eventContractAddress, listing.listingId, quantity],
        value: totalPrice,
      });

      const hash = await writeContract(config, request);

      console.log("Transaction hash:", hash);
      alert("Purchase successful!");
      window.location.reload();
    } catch (error) {
      console.error("Error buying ticket:", error);
      alert(`Purchase failed: ${error.message}`);
    }
  };

  // Buy resale ticket function
  const buyResaleTicket = async (listing) => {
    try {
      const quantityKey = `resale-${listing.listingId}`;
      const quantity = purchaseQuantities[quantityKey] || 1;
      const totalPrice = BigInt(listing.pricePerTicket) * BigInt(quantity);

      const { request } = await simulateContract(config, {
        address: marketplaceAddress,
        abi: marketplaceABI.abi,
        functionName: "buyResaleTicket",
        args: [listing.eventContractAddress, listing.listingId, quantity],
        value: totalPrice,
      });

      const hash = await writeContract(config, request);

      console.log("Transaction hash:", hash);
      alert("Purchase successful!");
      window.location.reload();
    } catch (error) {
      console.error("Error buying resale ticket:", error);
      alert(`Purchase failed: ${error.message}`);
    }
  };

  // Renders a listing card (works for both official and resale)
  const ListingCard = ({ listing, isResale }) => {
    const quantityKey = isResale
      ? `resale-${listing.listingId}`
      : `official-${listing.listingId}`;
    const currentQuantity = purchaseQuantities[quantityKey] || 1;
    const showVotePercentage =
      (listing.phaseName === "VOTE" || listing.phaseName === "END") &&
      listing.votePercentage !== undefined;

    return (
      <div className="bg-white shadow rounded-lg p-4 relative">
        <div
          className={`absolute top-2 right-2 px-10 py-1 text-xs font-bold rounded
          ${
            listing.phaseName === "PRESALE"
              ? "bg-yellow-200 text-yellow-800"
              : listing.phaseName === "SALE"
              ? "bg-green-200 text-green-800"
              : listing.phaseName === "EVENT"
              ? "bg-blue-200 text-blue-800"
              : listing.phaseName === "VOTE"
              ? "bg-purple-200 text-purple-800"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          {listing.phaseName}
        </div>
        <h2 className="text-xl font-semibold">{listing.eventName}</h2>
        <p className="truncate">
          <strong>Seller:</strong> {listing.seller.substring(0, 6)}...
          {listing.seller.substring(listing.seller.length - 4)}
        </p>
        <p className="truncate">
          <strong>Event Contract:</strong>{" "}
          {listing.eventContractAddress.substring(0, 6)}...
          {listing.eventContractAddress.substring(
            listing.eventContractAddress.length - 4
          )}
        </p>
        <p>
          <strong>Ticket ID:</strong> {listing.ticketId.toString()}
        </p>
        <p>
          <strong>Available:</strong> {listing.quantity.toString()}
        </p>
        <p>
          <strong>Price (ETH):</strong>{" "}
          {formatEther(BigInt(listing.pricePerTicket))}
        </p>

        {showVotePercentage && (
          <div className="mt-2 p-2 bg-purple-50 rounded-md">
            <p>
              <strong>Refund Votes:</strong> {listing.votePercentage.toString()}
              %
            </p>
          </div>
        )}

        <div className="mt-4 flex items-center">
          <label className="mr-2">Quantity:</label>
          <input
            type="number"
            min="1"
            max={listing.quantity.toString()}
            value={currentQuantity}
            onChange={(e) =>
              handleQuantityChange(
                listing.listingId,
                isResale,
                parseInt(e.target.value)
              )
            }
            className="border rounded p-1 w-16 text-center"
          />
        </div>

        <div className="mt-2">
          <strong>Total:</strong>{" "}
          {formatEther(
            BigInt(listing.pricePerTicket) * BigInt(currentQuantity)
          )}{" "}
          ETH
        </div>

        <button
          onClick={() =>
            isResale ? buyResaleTicket(listing) : buyOfficialTicket(listing)
          }
          disabled={listing.quantity <= 0 || listing.phaseName !== "SALE"}
          className={`mt-4 w-full py-2 px-4 rounded text-white ${
            isResale
              ? "bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"
              : "bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
          }`}
        >
          {listing.phaseName !== "SALE"
            ? `Purchase Unavailable (${listing.phaseName} Phase)`
            : isResale
            ? "Buy Resale Ticket"
            : "Buy Now"}
        </button>
      </div>
    );
  };

  const isLoading = loadingOfficial || loadingResale;
  const hasListings = officialListings.length > 0 || resaleListings.length > 0;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {!isConnected ? (
        <div className="text-center text-gray-500 py-16">
          <h1 className="text-3xl font-bold mb-4">Marketplace Listings</h1>
          <p>Please connect your wallet to view listings.</p>
        </div>
      ) : isLoading ? (
        <div className="text-center text-gray-500 py-16">
          <h1 className="text-3xl font-bold mb-4">Marketplace Listings</h1>
          <p>Loading listings...</p>
        </div>
      ) : !hasListings ? (
        <div className="text-center mt-16 text-gray-500">
          <h1 className="text-3xl font-bold mb-8">Marketplace Listings</h1>
          <p className="text-xl font-medium">No events listed yet</p>
          <p className="text-sm mt-2">
            Check back later or create your own event listing!
          </p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Official Listings Section */}
          <div>
            <h1 className="text-3xl font-bold text-center mb-8">
              Official Listings
            </h1>
            {officialListings.length === 0 ? (
              <div className="text-center text-gray-500 mb-12">
                No official listings available.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {officialListings.map((listing) => (
                  <ListingCard
                    key={`official-${listing.listingId}`}
                    listing={listing}
                    isResale={false}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Resale Listings Section */}
          <div>
            <h1 className="text-3xl font-bold text-center mb-8">
              Resale Listings
            </h1>
            {resaleListings.length === 0 ? (
              <div className="text-center text-gray-500">
                No resale listings available.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resaleListings.map((listing) => (
                  <ListingCard
                    key={`resale-${listing.listingId}`}
                    listing={listing}
                    isResale={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
