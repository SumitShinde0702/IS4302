"# IS4302"

The traditional ticketing system is fraught with systemic issues that degrade the fan experience and distort the economics of live events.
Our blockchain ticketing system aims to take advantage of the security and immutability of the blockchain and existing services that exist on top of it. The following is a sample flow of events:

1. Marketplace contract deployed by us
2. Organiser applies for whitelisting to us to whitelist their address to create listings
3. Organiser would deploy the Ticket & Event contract and link the Event contract's address to the Ticket's contract
4. Organisers would be able to create listings after whitelisting
5. Buyers and resellers would interact with tickets through our marketplace contract

6. Ticket.sol

Implements the ERC1155 token that represents event tickets.

Uses OpenZeppelin's ERC1155 standard for FT & NFT tickets. Tickets are first minted by batch from the constructor and first linked to the organiser's address.
Transfers are restricted so that only our designated marketplace contract can execute them. This ensures that ticket resales can only occur through our approved platform.

Deployed first and later linked to the event contract through the setEventContract function.

2. Event.sol

The Event smart contract is designed to manage ticket sales, usage, funds, and refunds for a specific event. It ensures that ticket purchases, resales, and refund mechanisms operate securely and transparently. The contract follows a time-based phased system and incorporates a voting mechanism to determine if refunds should be issued in case of event cancellation or major alterations. This contract interacts with the Ticket contract through an interface, for the functions or details that are required within Ticket.sol.

Event terms will be passed in through the constructor, which will also link to the address of the Ticket contract

3. Marketplace.sol

The Marketplace smart contract enables the listing, purchasing, and resale of event tickets in a secure and decentralized manner. This contract allows event organizers to list their tickets for official sale and supports peer-to-peer resale transactions with built-in legitimacy checks. The contract also incorporates refund voting and claim mechanisms for ticket holders. This contract interacts with the Event contract through an interface.

Testing Scripts:

1. Test_Event.js

Implements unit testing on all event functions and the corresponding Ticket functions

2. Test_Marketplace.js

Implements integration testing to ensure that the marketplace interacts accurately with Event contract

Things to add:
add commission fee to marketplace
