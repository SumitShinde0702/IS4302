// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Minimal interface for interacting with the Event contract. The event contract will be owned
///        by the organizer and will be used to handle ticket processing & other functionalities
interface ITEventContract {
    function processOfficialSale(address buyer, uint256 ticketId, uint256 numberOfTickets) external payable;
    function processResale(address seller, address buyer, uint256 ticketId, uint256 numberOfTickets, uint256 pricePerTicket) external payable;
    function vote (address ticketHolder) external;
    function handleRefund(address ticketHolder) external;
    function getTicketPrice(uint256 ticketId) external view returns (uint256);
    function getTicketQuantity(uint256 ticketId) external view returns (uint256);
    function getAccountBalance(address _address, uint256 ticketId) external view returns (uint256);
    function eventName() external view returns (string memory);
    function checkApproval(address seller) external view returns (bool);
    function processTicketUsage(address ticketHolder, uint256 ticketId, uint256 numberOfTickets) external;
}

/// @title Marketplace
/// @notice Should allow multiple events to list their tickets for sale at any given time
///         facilitates all the ticket transactions for official sale and resale, conducts legitimacy checks automatically
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

    mapping(address => bool) public allowedOrganisers;
    mapping(uint256 => Listing) public officialListings;
    uint256 public officialListingCount;

    mapping(uint256 => Listing) public resaleListings;
    uint256 public resaleListingCount;

    event OfficialTicketListed(address organiser, string eventName, uint256 listingId, uint256 quantity);
    event OfficialTicketPurchased(address buyer, string eventName, uint256 listingId, uint256 quantity);
    event ResaleTicketListed(address seller, string eventName, uint256 listingId, uint256 quantity);
    event ResaleTicketPurchased(address buyer, string eventName, uint256 listingId, uint256 quantity);

    constructor() Ownable(msg.sender) {}

    /// @notice allows the owner (us) to approve an organiser to list their tickets
    function approveOrganiser(address Organiser) external onlyOwner {
        allowedOrganisers[Organiser] = true;
    }

    /// @notice Lists tickets for official sale, will be called by event organiser.
    function createOfficialListing(address eventContract, uint256 ticketId) external {
        require(allowedOrganisers[msg.sender], "Organiser is not approved");

        ITEventContract eventContractInstance = ITEventContract(eventContract);
        uint256 initialQuantity = eventContractInstance.getTicketQuantity(ticketId);
        officialListings[++officialListingCount] = Listing({
            seller: msg.sender,
            ticketId: ticketId,
            quantity: initialQuantity,
            pricePerTicket: eventContractInstance.getTicketPrice(ticketId)
        });

        emit OfficialTicketListed(msg.sender, eventContractInstance.eventName(), officialListingCount, initialQuantity);
    }

    /// @notice Purchases tickets from an active listing.
    function buyOfficialTicket(address eventContract, uint256 listingId, uint256 quantity) external payable nonReentrant {
        Listing storage listing = officialListings[listingId];
        require(quantity > 0 && quantity <= listing.quantity, "Invalid quantity requested");

        ITEventContract eventContractInstance = ITEventContract(eventContract);
        eventContractInstance.processOfficialSale{value: msg.value}(msg.sender, listing.ticketId, quantity);

        listing.quantity -= quantity;
        if (listing.quantity == 0) {
            delete officialListings[listingId];
        }

        emit OfficialTicketPurchased(msg.sender, eventContractInstance.eventName(), listingId, quantity);
    } 

    /// @notice lists tickets currently owned for resale to the general population
    ///         can consider creating an array of addresses/usernames to allow targeted sales, as direct transfers introduces 
    ///         quite a bit of complexity, so i may not want to implement that. can consider next time
    function createResaleListing(address eventContract, uint256 ticketPrice, uint256 ticketId, uint256 quantity) external {
        ITEventContract eventContractInstance = ITEventContract(eventContract);
        // ensure seller actually owns enough of the particular ticket, prevents counterfeits from being listed
        require(eventContractInstance.getAccountBalance(msg.sender, ticketId) >= quantity, "Insufficient tickets owned!");
        // ensure that user has already approved the event contract to transfer tickets on their behalf
        require(eventContractInstance.checkApproval(msg.sender), "Please approve the Event contract to transfer your tokens first!");
        resaleListings[++resaleListingCount] = Listing({
            seller: msg.sender,
            ticketId: ticketId,
            quantity: quantity,
            pricePerTicket: ticketPrice
        });
        emit ResaleTicketListed(msg.sender, eventContractInstance.eventName(), resaleListingCount, quantity);
    }

    /// @notice Purchases tickets from a resale listing.
    function buyResaleTicket(address eventContract, uint256 listingId, uint256 quantity) external payable nonReentrant {
        ITEventContract eventContractInstance = ITEventContract(eventContract);
        Listing storage listing = resaleListings[listingId];
        require(quantity > 0 && quantity <= listing.quantity, "Invalid quantity requested");

        eventContractInstance.processResale{value: msg.value}(listing.seller, msg.sender, listing.ticketId, quantity, listing.pricePerTicket);

        listing.quantity -= quantity;
        if (listing.quantity == 0) {
            delete resaleListings[listingId];
        }
        emit ResaleTicketPurchased(msg.sender, eventContractInstance.eventName(), listingId, quantity);
    }

    /// @notice Allows ticket holders to vote for refund after event has ended. No vote should be cast if
    ///         refund not required. Checks are done on the Event contract side, but should only be shown to ticketholders
    ///         at the appropriate phase of the event (VOTE phase)
    function voteForRefund(address eventContract) external {
        ITEventContract(eventContract).vote(msg.sender);
    }

    /// @notice Allows ticket holders to claim their refund after the refund vote has passed
    function claimRefund(address eventContract) external {
        ITEventContract(eventContract).handleRefund(msg.sender);
    }

    /// @notice Usage of tickets for ticketholders
    function useTicket(address eventContract, uint256 ticketId, uint256 quantity) external {
        ITEventContract(eventContract).processTicketUsage(msg.sender, ticketId, quantity);
    }
}
