🎟️ Blockchain Ticketing System — IS4302 Project
Overview
The traditional ticketing system is fraught with systemic issues — scalping, fraud, and lack of transparency — that degrade the fan experience and distort the economics of live events.

Our blockchain ticketing platform leverages the security, transparency, and immutability of smart contracts to resolve these issues and offer a fairer, more reliable ticketing solution.

✅ Key Features
ERC-1155-based ticketing (supports fungible and non-fungible tickets)

Controlled resale through a secure marketplace

Organiser whitelisting for listing authority

Time-based sales and refund mechanisms

Decentralized refund voting in case of event disruption

QR-code-based validation (off-chain)

Modular contract architecture

🔁 System Flow
Marketplace Contract is deployed and acts as the main point of interaction for users.

Event Organiser applies for whitelisting to be allowed to list events and tickets.

Organiser deploys the Ticket & Event Contracts, and links the Ticket contract to the Event contract.

Once whitelisted, the organiser creates listings for ticket sales.

Buyers and Resellers interact through the Marketplace, enabling secure official and secondary sales.

📦 Smart Contracts
1. Ticket.sol
ERC-1155 Token Contract (for tickets)

Implements OpenZeppelin’s ERC1155 standard for minting tickets.

Tickets are minted in batches to the organiser during deployment.

Transfers restricted — only the designated Marketplace contract can transfer tickets.

Linked to the Event contract after deployment via setEventContract().

2. Event.sol
Event Management Contract

Manages ticket sales, usage, refunds, and voting.

Enforces time-based phases (e.g., presale, sale, event, refund).

Refund voting mechanism for eligible ticket holders.

Interacts with the Ticket contract through an interface.

Deployed with ticket and event terms in the constructor.

3. Marketplace.sol
Official and Resale Marketplace Contract

Enables ticket listings, purchases, and resales.

Only whitelisted organisers can list tickets officially.

Verifies resale legitimacy via balance checks and Event contract data.

Handles refund voting and claiming.

Interacts with the Event contract via an interface.

🔜 Coming Soon
💸 Commission fee feature to monetize the platform and incentivize upkeep.

🧪 Testing
Script	Description
Test_Event.js	Unit tests for Event.sol and its interaction with Ticket.sol.
Test_Marketplace.js	Integration tests to ensure marketplace-to-event interactions.
Tests are written using Hardhat + Mocha/Chai. Simulated blockchain time control is done using @nomicfoundation/hardhat-network-helpers.

🔗 Future Enhancements
Frontend interface using React + Vite

IPFS integration for decentralized ticket metadata

QR code generation for each unique ticket (based on ticketId)

Support for multiple pricing tiers or VIP sections

🛠 Tech Stack
Solidity

Hardhat (smart contract development & testing)

OpenZeppelin (security & contract standards)

Ethers.js (blockchain interaction)

React + Vite (frontend, in progress)

📄 License
MIT License