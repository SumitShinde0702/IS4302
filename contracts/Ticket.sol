// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Ticket
/// @notice ERC1155 contract for minting, transferring tickets and storing ticket information. Contract
///         will be called by Event contract for minting & transferring operations
contract Ticket is ERC1155, Ownable {
    address public eventContract;
    uint256 public constant NORMAL_TICKET = 0;

    mapping(uint256 => uint256) public ticketPrices; // Ticket ID -> Price, currently only 1 type of ticket

    // can be amended to mint different types of tickets as well (VIP, Early Bird, Normal, etc)
    // Tickets batch minted to the owner of the contract upon creation
    constructor(string memory uri_, uint256 _numberOfTickets) ERC1155(uri_) Ownable(msg.sender) {
        _mint(msg.sender, NORMAL_TICKET, _numberOfTickets, "");
    }

    /// @notice Sets the event contract address that is tied to this ticket & allows the event contract to transfer tickets on behalf of organiser
    /// @param _eventContract The marketplace contract address.
    function setEventContract(address _eventContract) external onlyOwner {
        require (eventContract == address(0), "Event contract already set");
        eventContract = _eventContract;
        setApprovalForAll(eventContract, true);
    }

    /// @notice Sets the ticket price for a given type of ticket (currently only 1 type, Id = 0)
    ///         currently the currency is in ether lol, should be changed at a later stage
    function setTicketPrice(uint256 ticketId, uint256 ticketPrice) external onlyOwner {
        require (ticketPrice != 0, "Ticket price cannot be 0");
        ticketPrices[ticketId] = ticketPrice;
    }

    /// @notice Sets the ticket price for a given type of ticket (currently only 1 type, Id = 0)
    function getTicketPrice(uint256 ticketId) external view returns (uint256) {
        return ticketPrices[ticketId];
    }

    /// @notice Overrides safeTransferFrom to restrict transfers to the designated marketplace.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory _data
    ) public override {
        require(msg.sender == eventContract || msg.sender == owner(), "Only event contract or owner can transfer tickets");
        super.safeTransferFrom(from, to, id, amount, _data);
    }

    /// @notice Calls the _burn function to burn and invalidate tickets
    function burn(
        address account,
        uint256 id,
        uint256 amount
    ) external {
        require(msg.sender == eventContract || msg.sender == owner(), "Only event contract or owner can transfer tickets");
        _burn(account, id, amount);
    }

    /// @notice Overrides safeBatchTransferFrom to restrict batch transfers.
    ///         not used for now ~
    // function safeBatchTransferFrom(
    //     address from,
    //     address to,
    //     uint256[] memory ids,
    //     uint256[] memory amounts,
    //     bytes memory data
    // ) public override {
    //     require(msg.sender == eventContract, "Only event contract can transfer tickets");
    //     super.safeBatchTransferFrom(from, to, ids, amounts, data);
    // }
}
