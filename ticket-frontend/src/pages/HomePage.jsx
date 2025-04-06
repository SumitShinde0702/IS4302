import React, { useEffect, useState } from "react";
import { useConfig, useAccount, useReadContract } from "wagmi";
import { readContract } from "@wagmi/core";
import { formatEther } from "viem";
import marketplaceABI from "../contracts/MarketplaceABI.json";

const marketplaceAddress = "0x8464135c8F25Da09e49BC8782676a84730C318bC";

function HomePage() {
  const { isConnected } = useAccount();
  const config = useConfig();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const { data: listingCount } = useReadContract({
    address: marketplaceAddress,
    abi: marketplaceABI.abi,
    functionName: "officialListingCount",
  });

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);

      if (!listingCount || Number(listingCount) === 0) {
        setListings([]);
        setLoading(false);
        return;
      }

      const promises = [];
      for (let i = 1; i <= Number(listingCount); i++) {
        const listing = await readContract(config, {
          address: marketplaceAddress,
          abi: marketplaceABI.abi,
          functionName: "officialListings",
          args: [i],
        });
        promises.push(listing);
      }

      try {
        const rawListings = await Promise.all(promises);
        const formattedListings = rawListings.map((listing) => ({
          seller: listing[0],
          eventName: listing[1],
          ticketId: listing[2],
          quantity: listing[3],
          pricePerTicket: listing[4],
        }));
        setListings(formattedListings);
      } catch (error) {
        console.error("Error fetching listings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchListings();
  }, [listingCount]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-center mb-8">
        Marketplace Listings
      </h1>

      {!isConnected ? (
        <div className="text-center text-gray-500">
          Please connect your wallet to view listings.
        </div>
      ) : loading ? (
        <div className="text-center text-gray-500">Loading listings...</div>
      ) : listings.length === 0 ? (
        <div className="text-center mt-16 text-gray-500">
          <p className="text-xl font-medium">No events listed yet</p>
          <p className="text-sm mt-2">
            Check back later or create your own event listing!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing, index) => (
            <div key={index} className="bg-white shadow rounded-lg p-4">
              <h2 className="text-xl font-semibold">{listing.eventName}</h2>
              <p>
                <strong>Seller:</strong> {listing.seller}
              </p>
              <p>
                <strong>Event Name:</strong> {listing.eventName}
              </p>
              <p>
                <strong>Ticket ID:</strong> {listing.ticketId.toString()}
              </p>
              <p>
                <strong>Quantity:</strong> {listing.quantity.toString()}
              </p>
              <p>
                <strong>Price (ETH):</strong>{" "}
                {formatEther(BigInt(listing.pricePerTicket))}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
