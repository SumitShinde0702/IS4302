// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/// @notice Minimal interface for interacting with the Ticket contract.
interface ITicketContract {
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function getTicketPrice(uint256 ticketId) external view returns (uint256);
}

/// @title Event
/// @notice All details regarding the particular event will be stored in this contract. 
///        Handles the locking of funds that are collected during ticket sales.
///        The funds will be locked with a time-lock mechanism until a period of time after the event ends
///        If event is cancelled or significantly altered, voting mechanism used for refunding ticket holders
/// TODO:  Think about the lockfunds, i should lock the standard price of the ticket, not the amount buyer paid

contract Event is Ownable, ReentrancyGuard {
    enum EventPhase { SALE, VOTE, END }
    EventPhase public phase;

    ITicketContract public ticketContract;
    address public organiser;
    uint256 public eventDate;
    uint256 public votingPeriodEnd;
    uint256 public refundThreshold;
    uint256 public totalTicketsSold;

    uint256 public refundVotes;
    mapping(address => bool) public hasVoted;

    event TicketPurchased(address indexed buyer, uint256 numberOfTickets, uint256 ticketTypeId);
    event Voted(address indexed voter);
    event FundsWithdrawn();
    event RefundsIssued(address indexed ticketHolder, uint256 numberOfTickets, uint256 amount);

    constructor(uint256 _eventDate, address _ticketContract) Ownable(msg.sender) {
        require(_eventDate > block.timestamp, "Event date must be in the future");
        require(_ticketContract != address(0), "Please deploy ticket contract first");

        organiser = msg.sender;
        eventDate = _eventDate;
        votingPeriodEnd = _eventDate + 3 days; // arbitrary voting period for now, but seems reasonable enough
        refundThreshold = 90; // arbitrary value for now, might be passed in as a constructor value later on
        phase = EventPhase.SALE;
        ticketContract = ITicketContract(_ticketContract);
    }

    modifier atPhase(EventPhase _phase) {
        require(phase == _phase, "requested service is not available now");
        _;
    }

    modifier timedTransitions() {
        if (phase == EventPhase.SALE && block.timestamp == eventDate)
            nextStage();
        if (phase == EventPhase.VOTE && block.timestamp == votingPeriodEnd)
            nextStage();
        _;
    }

    function nextStage() internal {
        phase = EventPhase(uint8(phase) + 1);
    }

    function getTicketPrice(uint256 _ticketId) public view returns (uint256) {
        return ticketContract.getTicketPrice(_ticketId);
    }

    function getTicketQuantity(uint256 _ticketId) public view returns (uint256) {
        return ticketContract.balanceOf(organiser, _ticketId);
    }

    /// @notice Check to see if refund threshold met at the end of the event
    function shouldRefund() public view atPhase(EventPhase.END) returns (bool) {
        return refundVotes * 100 / totalTicketsSold >= refundThreshold;
    }

    /// @notice Implement the function to transfer tickets and store the amount of funds locked for each buyer
    ///         Ensures that the function can only be called during the SALE phase
    ///         calls the transfer ticket function to transfer the ticket to the buyer and returns excess eth to the buyer
    function processOfficialSale(address buyer, uint256 ticketId, uint256 numberOfTickets) external payable atPhase(EventPhase.SALE) timedTransitions nonReentrant {
        uint256 totalPrice = getTicketPrice(ticketId) * numberOfTickets;
        require(msg.value >= totalPrice, "Not enough ETH sent!");

        totalTicketsSold += numberOfTickets;
        ticketContract.safeTransferFrom(address(this), buyer, ticketId, numberOfTickets, "");
        emit TicketPurchased(buyer, numberOfTickets, ticketId);

        if (msg.value > totalPrice) {
            (bool success,) = payable(buyer).call{value: msg.value - totalPrice}("");
            require (success, "Excess funds return failed");
        }
    }

    /// @notice Implement the voting functionality of the contract to determine if ticketholders 
    ///         should be refunded. Current threshold is 90% of total tickets sold? also, voteForRefund should
    ///         never be false, as the only other option is to not vote
    function vote(address ticketHolder, bool voteForRefund) external atPhase(EventPhase.VOTE) timedTransitions nonReentrant{
        require (voteForRefund, "Error occurred! Vote should only be true");
        // require that the voter has not voted yet
        require(hasVoted[ticketHolder], "You have already voted");

        uint256 numberOfTicketsHeld = ticketContract.balanceOf(ticketHolder, 0);
        // require that the voter has tickets
        require(numberOfTicketsHeld > 0, "You must have tickets to vote");
        
        refundVotes += numberOfTicketsHeld;
        hasVoted[ticketHolder] = true;
        emit Voted(ticketHolder);
    }

    /// @notice Implements withdraw functionality for the organiser to withdraw funds if the refund threshold is not met
    function handleWithdraw() external atPhase(EventPhase.END) timedTransitions() onlyOwner nonReentrant {
        require (!shouldRefund(), "No scam! Refund threshold is met!");
        // transfer funds to organiser
        (bool success, ) = payable(organiser).call{value: address(this).balance}("");
        require(success, "Withdrawal of funds failed");
        emit FundsWithdrawn();
    }

    /// @notice Implements refund functionality for the organiser to refund ticket holders individually
    ///         ticket holders should manually call refund themselves on the marketplace to process the refunds
    ///         to save on gas fees, as the contract will not need to keep track of all ticketholders
    function handleRefund(address ticketHolder) external atPhase(EventPhase.END) timedTransitions nonReentrant {
        require (shouldRefund(), "Refund threshold not met");

        uint256 numberOfTicketsHeld = ticketContract.balanceOf(ticketHolder, 0);
        require (numberOfTicketsHeld > 0, "Address does not hold any tickets");

        require (getTicketPrice(0) > 0, "Ticket price not set yet");
        uint256 ticketValue = numberOfTicketsHeld * getTicketPrice(0); 
        (bool success, ) = payable(ticketHolder).call{value: ticketValue}("");
        require(success, "Refund failed!");

        emit RefundsIssued(ticketHolder, numberOfTicketsHeld, ticketValue);
    }

    // Future functions to create:
    // 1. organisers to withdraw the remaining balance within the contract after refund period has ended, to prevent any funds from being locked
    // 2. function to process reselling of tickets
}