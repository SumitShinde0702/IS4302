// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Minimal interface for interacting with the Ticket (ERC1155) contract.
interface ITicket {
    function mint(address account, uint256 id, uint256 amount, bytes calldata data) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

/// @title TicketMint
/// @notice Handles primary ticket sales, voting, and fund management for an event.
///         It allows a 3-day voting period (after the event start time) during which ticket holders vote 
///         on whether the event has started. If not confirmed, the admin can trigger one transaction 
///         that refunds all current ticket holders (regardless of how they acquired their tickets).
contract TicketMint is Ownable, ReentrancyGuard {
    ITicket public ticketContract;
    uint256 public eventTicketId;      // Token id for the event ticket.
    uint256 public ticketPrice;        // Price per ticket (in wei).
    uint256 public maxTicketsPerBuyer; // Maximum tickets a buyer can purchase.
    uint256 public totalTickets;       // Total tickets available.
    uint256 public ticketsSold;

    uint256 public eventStartTime;     // Scheduled event start time (unix timestamp).
    uint256 public voteThreshold;      // Percentage threshold for event confirmation (e.g., 40 means 40%).
    uint256 public mintStartTime;      // Timestamp when ticket minting (purchase) can begin.

    // Address of the event organizer—only this address can withdraw funds if the event is confirmed.
    address public organizer;

    // --- Voting State ---
    // Each ticket held at the time of voting counts as one vote.
    mapping(address => bool) public hasVoted;
    mapping(address => uint256) public voteWeights;
    uint256 public totalVoteWeight;

    // --- Finalization State ---
    // Once the event is finalized, no more votes can be cast.
    bool public finalized;
    bool public eventStartedConfirmed;

    // --- Refund Tracking & Holder List ---
    // refundedTokens tracks, per address, how many tokens have already been refunded.
    mapping(address => uint256) public refundedTokens;
    // allHolders holds all addresses that have ever purchased (or been updated as holding) tickets.
    address[] public allHolders;

    /// @notice Constructor sets up the ticket sale parameters.
    /// @param _ticketContract Address of the Ticket (ERC1155) contract.
    /// @param _eventTicketId Token id representing the event ticket.
    /// @param _ticketPrice Price per ticket in wei.
    /// @param _maxTicketsPerBuyer Maximum tickets per buyer.
    /// @param _totalTickets Total tickets available for sale.
    /// @param _eventStartTime Scheduled event start time (unix timestamp).
    /// @param _voteThreshold Percentage threshold for confirmation.
    /// @param _mintStartTime Timestamp when minting can begin.
    /// @param _organizer Address of the event organizer (who withdraws funds if confirmed).
    constructor(
        address _ticketContract,
        uint256 _eventTicketId,
        uint256 _ticketPrice,
        uint256 _maxTicketsPerBuyer,
        uint256 _totalTickets,
        uint256 _eventStartTime,
        uint256 _voteThreshold,
        uint256 _mintStartTime,
        address _organizer
    ) Ownable(msg.sender) {
        require(_organizer != address(0), "Organizer address cannot be zero");
        require(_mintStartTime <= _eventStartTime, "Mint start must be <= event start");
        ticketContract = ITicket(_ticketContract);
        eventTicketId = _eventTicketId;
        ticketPrice = _ticketPrice;
        maxTicketsPerBuyer = _maxTicketsPerBuyer;
        totalTickets = _totalTickets;
        eventStartTime = _eventStartTime;
        voteThreshold = _voteThreshold;
        mintStartTime = _mintStartTime;
        organizer = _organizer;
    }

    /// @notice Purchase tickets (minting). Only allowed after mintStartTime.
    ///         The ETH sent remains locked until event finalization.
    function purchaseTickets(uint256 amount) external payable nonReentrant {
        require(block.timestamp >= mintStartTime, "Minting not started yet");
        require(amount > 0, "Must buy at least 1 ticket");
        require(ticketsSold + amount <= totalTickets, "Not enough tickets available");
        require(amount <= maxTicketsPerBuyer, "Exceeds max tickets per buyer");
        require(msg.value == ticketPrice * amount, "Incorrect ETH amount sent");

        ticketsSold += amount;
        ticketContract.mint(msg.sender, eventTicketId, amount, "");

        // Add buyer to the holder list if not already present.
        bool alreadyHolder = false;
        for (uint256 i = 0; i < allHolders.length; i++) {
            if (allHolders[i] == msg.sender) {
                alreadyHolder = true;
                break;
            }
        }
        if (!alreadyHolder) {
            allHolders.push(msg.sender);
        }
    }

    /// @notice Allows any ticket holder to vote that the event has started.
    ///         Each ticket held at the time of voting counts as one vote.
    function voteEventStarted() external {
        uint256 balance = ticketContract.balanceOf(msg.sender, eventTicketId);
        require(balance > 0, "Must hold a ticket to vote");
        require(!hasVoted[msg.sender], "Already voted");

        hasVoted[msg.sender] = true;
        uint256 weight = balance; // Each ticket equals one vote.
        voteWeights[msg.sender] = weight;
        totalVoteWeight += weight;
    }

    /// @notice Finalizes the event outcome.
    ///         Finalization is only allowed after 3 days have passed since the event start time,
    ///         ensuring a 3-day voting period. If the vote weight meets the threshold, the event is confirmed.
    function finalizeEvent() external {
        require(block.timestamp >= eventStartTime + 3 days, "Voting period not ended");
        require(!finalized, "Event already finalized");
        finalized = true;
        if (ticketsSold > 0 && (totalVoteWeight * 100) / ticketsSold >= voteThreshold) {
            eventStartedConfirmed = true;
        } else {
            eventStartedConfirmed = false;
        }
    }

    /// @notice If the event is confirmed as started, the event organizer can withdraw the locked funds.
    function withdrawFunds() external {
        require(msg.sender == organizer, "Only organizer can withdraw");
        require(finalized, "Event not finalized");
        require(eventStartedConfirmed, "Event not confirmed started");
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds available");
        payable(organizer).transfer(balance);
    }

    /// @notice Admin-triggered refund that loops through all current ticket holders
    ///         and pushes refunds based on their current token balance.
    ///         Refund per ticket is calculated as (initial contract balance / ticketsSold).
    ///         This function sends refunds to all holders in one transaction.
    function adminRefundAll() external onlyOwner nonReentrant {
        require(finalized, "Event not finalized");
        require(!eventStartedConfirmed, "Event confirmed, no refunds");
        require(block.timestamp >= eventStartTime + 3 days, "Refund time not reached");
        uint256 initialBalance = address(this).balance;
        require(initialBalance > 0, "No funds available");

        uint256 refundPerTicket = initialBalance / ticketsSold;

        // Loop over every holder in the allHolders list.
        for (uint256 i = 0; i < allHolders.length; i++) {
            address holder = allHolders[i];
            uint256 currentBalance = ticketContract.balanceOf(holder, eventTicketId);
            uint256 alreadyRefunded = refundedTokens[holder];
            if (currentBalance > alreadyRefunded) {
                uint256 eligibleTokens = currentBalance - alreadyRefunded;
                uint256 refundAmount = eligibleTokens * refundPerTicket;
                refundedTokens[holder] = currentBalance; // Mark all tokens as refunded.
                if (refundAmount > 0) {
                    payable(holder).transfer(refundAmount);
                }
            }
        }
    }
}
