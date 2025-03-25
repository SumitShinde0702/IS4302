const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Test Event & Ticket", function () {
  let organiser, marketplace, user1, user2, others;
  let Market, MarketContract, MarketContractAddress;
  let Ticket, TicketContract, TicketContractAddress;
  let eventName, eventDate, Event, EventContract, EventContractAddress;
  const NORMAL_TICKET = 0;

  before(async function () {
    [organiser, marketplace, user1, user2, ...others] =
      await ethers.getSigners();

    Market = await ethers.getContractFactory("Marketplace");
    MarketContract = await Market.connect(marketplace).deploy();
    await MarketContract.waitForDeployment();
    MarketContractAddress = await MarketContract.getAddress();

    Ticket = await ethers.getContractFactory("Ticket");
    // need to check if arbitrary uri is allowed first, before storing the actual metadata
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
  });

  it("Should set up contracts properly & mint tickets", async function () {
    expect(MarketContractAddress).to.be.properAddress;
    expect(TicketContractAddress).to.be.properAddress;
    expect(EventContractAddress).to.be.properAddress;
    expect(await TicketContract.eventContract()).to.equal(EventContractAddress);

    let numberOfTickets = await TicketContract.balanceOf(organiser.address, 0);
    expect(numberOfTickets).to.equal(10000);
  });

  it("Test ticket functions", async function () {
    await TicketContract.setTicketPrice(NORMAL_TICKET, 10);
    expect(await TicketContract.getTicketPrice(NORMAL_TICKET)).to.equal(10);

    await TicketContract.safeTransferFrom(
      organiser.address,
      user1.address,
      NORMAL_TICKET,
      1,
      "0x"
    );

    expect(
      await TicketContract.balanceOf(organiser.address, NORMAL_TICKET)
    ).to.equal(9999);
    expect(
      await TicketContract.balanceOf(user1.address, NORMAL_TICKET)
    ).to.equal(1);
  });

  it("Test official sale modifiers & functions", async function () {
    expect(
      EventContract.processOfficialSale(user2.address, NORMAL_TICKET, 1, {
        value: ethers.parseEther("10"),
      }),
      "Sale period has not started!"
    ).to.be.revertedWith("requested service is not available now");

    // console.log("Event date: ", eventDate);
    // console.log("Current time: ", await time.latest());

    const saleStart = Math.floor(new Date("2025-12-10").getTime() / 1000);
    await time.increaseTo(saleStart); // does this persist between tests? online says no

    // console.log("Sale start: ", await EventContract.saleDate());
    // console.log("Current time: ", await time.latest());

    await expect(
      EventContract.connect(user1).processOfficialSale(
        user2.address,
        NORMAL_TICKET,
        1,
        {
          value: ethers.parseEther("10"),
        }
      ),
      "Only approved platforms should call this function"
    ).to.be.revertedWith("Only approved platforms can call this function");

    await expect(
      EventContract.processOfficialSale(user2.address, NORMAL_TICKET, 1, {
        value: ethers.parseEther("9"),
      }),
      "Should send enough ETH"
    ).to.be.revertedWith("Not enough ETH sent!");

    await expect(
      EventContract.processOfficialSale(user2.address, NORMAL_TICKET, 1, {
        value: ethers.parseEther("10"),
      }),
      "Should purchase tickets successfully"
    )
      .to.emit(EventContract, "OfficialTicketPurchased")
      .withArgs(user2.address, 1, NORMAL_TICKET);

    expect(
      await TicketContract.balanceOf(user2.address, NORMAL_TICKET),
      "User2 should have 1 ticket"
    ).to.equal(1);
    expect(
      await TicketContract.balanceOf(organiser.address, NORMAL_TICKET),
      "Organiser should have 9998 tickets left"
    ).to.equal(9998);
  });
});
