# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```
"# IS4302" 


1. Ticket.sol

Implements the ERC1155 token that represents event tickets.

Uses OpenZeppelin's ERC1155 standard for NFT tickets. Only the owner (admin) can mint new tickets.
Transfers (both single and batch) are restricted so that only a designated marketplace contract can execute them. This ensures that ticket resales can only occur through an approved platform.

Deployed first and later linked to the marketplace and ticket sale contracts via the setMarketplace function.

2. TicketMint.sol

Manages the primary ticket sale process, voting for event start confirmation, and fund management.

Primary Sale:
Allows users to purchase tickets (minting) only when the minting period has started. It enforces maximum tickets per buyer and ensures that funds are locked in the contract.
Voting Mechanism:
Ticket holders can vote that the event has started. Each ticket held at the moment of voting counts as one vote.
Event Finalization:
Once the event start time is reached, the event is finalized 3 days from that time. If the total vote weight meets or exceeds 40%, the event is confirmed.

Funds Withdrawal & Refunds:
Event Organizer Withdrawal:
If the event is confirmed, the designated event organizer (set during event creation) can withdraw the locked funds to their wallet.
Admin Refund:
If the event is not confirmed and three days have passed since the event start time, the platform admin can trigger refunds to all ticket holders.
Mint Start Time:
Ticket purchases are only allowed after a specified mint start time.

Created with parameters such as ticket price, maximum tickets per buyer, event start time, vote threshold, mint start time, and the organizer’s wallet address. It distinguishes between the roles of the platform admin (owner) and the event organizer.

3. Marketplace.sol

Facilitates the secondary market for ticket resales.

Listing Tickets:
Ticket holders can list their tickets for resale. Listings require that the seller has sufficient ticket balance.
Price Control:
The admin sets a maximum allowed resale price for each ticket type to help prevent scalping and price gouging.
Ticket Transfer:
Tickets are held in escrow in the marketplace contract during the listing period. When purchased, the ticket is transferred from escrow to the buyer, and funds are forwarded to the seller.
Cancel Listings:
Sellers can cancel their listings to retrieve their tickets.

Interacts with the Ticket contract via restricted transfer functions, ensuring that all transfers are processed through the approved marketplace.


Things to add:
Maybe add royalties? % of each mint/transaction on marketplace
ticket cap tagged to ticket instead
create extra contract that locks funds + voting
implement whitelist of organisers (business logic: organisers who want to list have to send in their address and other details for approval, admin will add the address to the whitelist (probz just another mapping)
think about minting & sending as compared to batch mint from organiser & transfer from organiser's address to buyers
timelock function vs voting start & end