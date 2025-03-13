// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Ticket
/// @notice Implements an ERC1155 token for tickets. Only the owner (admin) can mint tickets,
///         and only the designated marketplace is allowed to transfer tokens.
contract Ticket is ERC1155, Ownable {
    // Only the designated marketplace contract can trigger transfers (for resale)
    address public marketplace;

    /// @notice Constructor sets the base URI and passes the deployer as the initial owner.
    constructor(string memory uri_) ERC1155(uri_) Ownable(msg.sender) {}

    /// @notice Sets the allowed marketplace address.
    /// @param _marketplace The marketplace contract address.
    function setMarketplace(address _marketplace) external onlyOwner {
        marketplace = _marketplace;
    }

    /// @notice Mints new tickets.
    /// @param account The recipient address.
    /// @param id The token id.
    /// @param amount The number of tokens.
    /// @param data Additional data.
    function mint(
        address account,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external onlyOwner {
        _mint(account, id, amount, data);
    }

    /// @notice Overrides safeTransferFrom to restrict transfers to the designated marketplace.
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) public override {
        require(msg.sender == marketplace, "Only marketplace can transfer tickets");
        super.safeTransferFrom(from, to, id, amount, data);
    }

    /// @notice Overrides safeBatchTransferFrom to restrict batch transfers.
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) public override {
        require(msg.sender == marketplace, "Only marketplace can transfer tickets");
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }
}
