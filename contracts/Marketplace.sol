// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Minimal interface for interacting with the Event contract. The event contract will be owned
///        by the organizer and will be used to handle ticket processing & other functionalities
interface ITEventContract {
    function processOfficialSale(address buyer, uint256 ticketId, uint256 numberOfTickets) external payable;
    function vote (address ticketHolder, bool voteForRefund) external;
    function handleRefund(address ticketHolder) external;
    function getTicketPrice(uint256 ticketId) external view returns (uint256);
    function getTicketQuantity(uint256 ticketId) external view returns (uint256);
}

/// @title Marketplace
/// @notice facilitates all the ticket transactions for official sale and resale, conducts legitimacy checks automatically
///         organisers who want to list their tickets will follow the flow:
///         1. apply for permission to list (marketplace will whitelist their address)
///         2. Create a listing of all their tickets, tickets need not be trasnferred to the marketplace
///         can consider creating a commission fee for the transactions happening in the marketplace
contract Marketplace is Ownable, ReentrancyGuard {

    struct Listing {
        address seller;
        uint256 ticketId;
        uint256 quantity;
        uint256 pricePerTicket;
    }

    uint256 public listingCount;
    mapping(address => bool) public allowedOrganisers;
    mapping(uint256 => Listing) public listings;

    constructor() Ownable(msg.sender) {}

    /// @notice allows the owner (us) to approve an organiser to list their tickets
    function approveOrganiser(address Organiser) external onlyOwner {
        allowedOrganisers[Organiser] = true;
    }

    /// @notice Lists tickets for official sale, will be called by event organiser.
    function createOfficialListing(
        address eventContract,
        uint256 ticketId
    ) external nonReentrant {
        require(allowedOrganisers[msg.sender], "Organiser is not approved");

        listings[++listingCount] = Listing({
            seller: msg.sender,
            ticketId: ticketId,
            quantity: ITEventContract(eventContract).getTicketQuantity(ticketId),
            pricePerTicket: ITEventContract(eventContract).getTicketPrice(ticketId)
        });
    }

    /// @notice Purchases tickets from an active listing.
    function buyTicket(address eventContract, uint256 listingId, uint256 quantity) external payable nonReentrant {
        Listing storage listing = listings[listingId];
        require(quantity > 0 && quantity <= listing.quantity, "Invalid quantity requested");

        ITEventContract(eventContract).processOfficialSale(msg.sender, listing.ticketId, quantity);

        listing.quantity -= quantity;
        if (listing.quantity == 0) {
            delete listings[listingId];
        }
    } 

    // things to think about: how to handle ticket legitimacy checks? when to check? should be during create listing for resale purposes
}
