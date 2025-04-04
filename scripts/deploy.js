const hre = require("hardhat");
const { ethers } = hre;

async function main() {
  let organiser, marketplace, user1, user2, others;
  let Market, MarketContract, MarketContractAddress;
  let Ticket, TicketContract, TicketContractAddress;
  let eventName, eventDate, Event, EventContract, EventContractAddress;
  const NORMAL_TICKET = 0;

  [organiser, marketplace, ...others] = await ethers.getSigners();

  Market = await ethers.getContractFactory("Marketplace");
  MarketContract = await Market.connect(marketplace).deploy();
  await MarketContract.waitForDeployment();
  MarketContractAddress = await MarketContract.getAddress();

  Ticket = await ethers.getContractFactory("Ticket");
  TicketContract = await Ticket.connect(organiser).deploy("test-uri", 10000);
  await TicketContract.waitForDeployment();
  TicketContractAddress = await TicketContract.getAddress();

  Event = await ethers.getContractFactory("Event");
  eventName = "Test Event";
  eventDate = Math.floor(new Date("2025-12-31").getTime() / 1000);

  EventContract = await Event.connect(organiser).deploy(
    eventName,
    eventDate,
    TicketContractAddress,
    MarketContractAddress
  );
  await EventContract.waitForDeployment();
  EventContractAddress = await EventContract.getAddress();

  await TicketContract.connect(organiser).setEventContract(
    EventContractAddress
  );

  await TicketContract.setTicketPrice(NORMAL_TICKET, 10);

  console.log("Market Contract Address: ", MarketContractAddress);
  console.log("Market owner Address: ", marketplace.address);
  console.log("Ticket Contract Address: ", TicketContractAddress);
  console.log("Ticket owner Address: ", organiser.address);
  console.log("Event Contract Address: ", EventContractAddress);
  console.log("Event owner Address: ", organiser.address);
}

main()
  .then(() => {
    console.log("Deployment successful");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error during deployment:", error);
    process.exit(1);
  });