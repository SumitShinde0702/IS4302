// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Minimal interface for interacting with the Ticket contract.
interface ITicketContract {
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

/// @title Marketplace
/// @notice Allows ticket holders to list tickets for resale with a maximum price cap set by the admin.
contract Marketplace is Ownable, ReentrancyGuard {
    ITicketContract public ticketContract;
    // Maps a ticket id to its maximum allowed resale price.
    mapping(uint256 => uint256) public maxResalePrice;

    struct Listing {
        address seller;
        uint256 ticketId;
        uint256 quantity;
        uint256 pricePerTicket;
    }

    uint256 public listingCount;
    mapping(uint256 => Listing) public listings;

    /// @notice Constructor sets the Ticket contract address and assigns the deployer as owner.
    constructor(address _ticketContract) Ownable(msg.sender) {
        ticketContract = ITicketContract(_ticketContract);
    }

    /// @notice Sets the maximum allowed resale price for a given ticket id.
    /// @param ticketId The ticket identifier.
    /// @param price The maximum resale price.
    function setMaxResalePrice(uint256 ticketId, uint256 price) external onlyOwner {
        maxResalePrice[ticketId] = price;
    }

    /// @notice Lists tickets for sale. Tickets are transferred into escrow.
    function createListing(
        uint256 ticketId,
        uint256 quantity,
        uint256 pricePerTicket
    ) external nonReentrant {
        require(pricePerTicket <= maxResalePrice[ticketId], "Price exceeds allowed maximum");
        require(ticketContract.balanceOf(msg.sender, ticketId) >= quantity, "Insufficient ticket balance");

        // Transfer tickets from seller to the marketplace (escrow).
        ticketContract.safeTransferFrom(msg.sender, address(this), ticketId, quantity, "");

        listings[listingCount] = Listing({
            seller: msg.sender,
            ticketId: ticketId,
            quantity: quantity,
            pricePerTicket: pricePerTicket
        });
        listingCount++;
    }

    /// @notice Purchases tickets from an active listing.
    function buyTicket(uint256 listingId, uint256 quantity) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(quantity > 0 && quantity <= listing.quantity, "Invalid quantity requested");

        uint256 totalPrice = listing.pricePerTicket * quantity;
        require(msg.value == totalPrice, "Incorrect ETH sent");

        // Transfer tickets from escrow to the buyer.
        ticketContract.safeTransferFrom(address(this), msg.sender, listing.ticketId, quantity, "");
        // Forward funds to the seller.
        payable(listing.seller).transfer(totalPrice);

        listing.quantity -= quantity;
        if (listing.quantity == 0) {
            delete listings[listingId];
        }
    }

    /// @notice Cancels an active listing and returns tickets to the seller.
    function cancelListing(uint256 listingId) external nonReentrant {
        Listing storage listing = listings[listingId];
        require(msg.sender == listing.seller, "Only seller can cancel listing");

        uint256 quantity = listing.quantity;
        ticketContract.safeTransferFrom(address(this), listing.seller, listing.ticketId, quantity, "");
        delete listings[listingId];
    }
}
