const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// This test file contains unit tests for functions within Event contract

describe("Test Event & Ticket", function () {
  let organiser, marketplace, user1, user2, others;
  let Market, MarketContract, MarketContractAddress;
  let Ticket, TicketContract, TicketContractAddress;
  let eventName, eventDate, Event, EventContract, EventContractAddress;
  const NORMAL_TICKET = 0;

  before(async function () {
    await network.provider.send("hardhat_reset");
    [organiser, marketplace, user1, user2, ...others] =
      await ethers.getSigners();

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
  });

  it("Should set up contracts properly & mint tickets", async function () {
    expect(MarketContractAddress).to.be.properAddress;
    expect(TicketContractAddress).to.be.properAddress;
    expect(EventContractAddress).to.be.properAddress;
    expect(await TicketContract.eventContract()).to.equal(EventContractAddress);

    let numberOfTickets = await TicketContract.balanceOf(organiser.address, 0);
    expect(numberOfTickets).to.equal(10000);
  });

  it("Test official sale modifiers & sale functions", async function () {
    expect(
      EventContract.processOfficialSale(user2.address, NORMAL_TICKET, 1, {
        value: ethers.parseEther("10"),
      }),
      "Sale period has not started!"
    ).to.be.revertedWith("requested service is not available now");

    // console.log("Event date: ", eventDate);
    // console.log("Current time: ", await time.latest());

    const saleStart = await EventContract.saleDate();
    await time.increaseTo(saleStart);
    // console.log("Sale start: ", await EventContract.saleDate());
    // console.log("Current time (prev function): ", await time.latest());

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
      EventContract.processOfficialSale(user1.address, NORMAL_TICKET, 1, {
        value: ethers.parseEther("10"),
      }),
      "Should purchase tickets successfully"
    )
      .to.emit(EventContract, "OfficialTicketPurchased")
      .withArgs(user1.address, 1, NORMAL_TICKET);

    await expect(
      EventContract.processOfficialSale(user2.address, NORMAL_TICKET, 1, {
        value: ethers.parseEther("10"),
      }),
      "Should purchase tickets successfully"
    )
      .to.emit(EventContract, "OfficialTicketPurchased")
      .withArgs(user2.address, 1, NORMAL_TICKET);

    expect(
      await TicketContract.balanceOf(user1.address, NORMAL_TICKET),
      "User1 should have 1 ticket"
    ).to.equal(1);

    expect(
      await TicketContract.balanceOf(user2.address, NORMAL_TICKET),
      "User2 should have 1 ticket"
    ).to.equal(1);

    expect(
      await TicketContract.balanceOf(organiser.address, NORMAL_TICKET),
      "Organiser should have 9998 tickets left"
    ).to.equal(9998);
  });

  it("Test resale functions", async function () {
    // testcase: user1 sells 1 ticket to user 2
    // need to manually allow the event contract to spend user1's tickets first
    TicketContract.connect(user1).setApprovalForAll(EventContractAddress, true);
    await expect(
      EventContract.processResale(
        user1.address,
        user2.address,
        NORMAL_TICKET,
        1,
        11,
        {
          value: ethers.parseEther("11"),
        }
      ),
      "Should not allow resale at higher price"
    ).to.be.revertedWith("Price cap exceeded");

    await expect(
      EventContract.processResale(
        user1.address,
        user2.address,
        NORMAL_TICKET,
        2,
        9,
        {
          value: ethers.parseEther("9"),
        }
      ),
      "Should not allow resale of more tickets than owned"
    ).to.be.revertedWith("Not enough tickets to sell");

    await expect(
      EventContract.processResale(
        user1.address,
        user2.address,
        NORMAL_TICKET,
        1,
        9,
        {
          value: ethers.parseEther("8"),
        }
      ),
      "Should reject if not enough eth sent"
    ).to.be.revertedWith("Not enough ETH sent!");

    await expect(
      EventContract.processResale(
        user1.address,
        user2.address,
        NORMAL_TICKET,
        1,
        9,
        {
          value: ethers.parseEther("10"),
        }
      ),
      "Should purchase tickets successfully"
    )
      .to.emit(EventContract, "ResaleTicketPurchased")
      .withArgs(
        user1.address,
        user2.address,
        1,
        NORMAL_TICKET,
        ethers.parseEther("9")
      );

    expect(
      await TicketContract.balanceOf(user1.address, NORMAL_TICKET),
      "User1 should have 0 ticket"
    ).to.equal(0);

    expect(
      await TicketContract.balanceOf(user2.address, NORMAL_TICKET),
      "User2 should have 2 tickets"
    ).to.equal(2);
  });

  it("Test usage of tickets", async function () {
    const eventStart = await EventContract.eventDate();
    await time.increaseTo(eventStart);

    await expect(
      EventContract.processTicketUsage(user2.address, NORMAL_TICKET, 1)
    )
      .to.emit(EventContract, "TicketUsed")
      .withArgs(user2.address, 1, NORMAL_TICKET);

    const ticketsHeld = await TicketContract.balanceOf(
      user2.address,
      NORMAL_TICKET
    );
    let ticketsUsed = await EventContract.numberOfTicketsUsed(user2.address);

    expect(
      ticketsHeld - ticketsUsed,
      "User2 should have 1 ticket left"
    ).to.equal(1);

    await expect(
      EventContract.processTicketUsage(user2.address, NORMAL_TICKET, 1)
    )
      .to.emit(EventContract, "TicketUsed")
      .withArgs(user2.address, 1, NORMAL_TICKET);

    ticketsUsed = await EventContract.numberOfTicketsUsed(user2.address);

    expect(
      ticketsHeld - ticketsUsed,
      "User2 should have 0 tickets left"
    ).to.equal(0);

    await expect(
      EventContract.processTicketUsage(user2.address, NORMAL_TICKET, 1),
      "Should not have enough tickets to use anymore"
    ).to.be.revertedWith("Not enough tickets to use");
  });

  it("Test voting functions", async function () {
    await expect(EventContract.vote(user2.address)).to.be.revertedWith(
      "requested service is not available now"
    );

    const voteStart = await EventContract.votingPeriodStart();
    await time.increaseTo(voteStart);

    await expect(EventContract.vote(user1.address)).to.be.revertedWith(
      "You must have tickets to vote"
    );

    await expect(EventContract.vote(user2.address))
      .to.emit(EventContract, "Voted")
      .withArgs(user2.address, 2);

    expect(await EventContract.refundVotes()).to.equal(2);

    await expect(EventContract.vote(user2.address)).to.be.revertedWith(
      "You have already voted"
    );
  });

  it("Should handle refund correctly", async function () {
    const voteEnd = await EventContract.votingPeriodEnd();
    await time.increaseTo(voteEnd);

    await expect(EventContract.handleWithdraw()).to.be.revertedWith(
      "No scam! Refund threshold is met!"
    );

    await expect(EventContract.handleRefund(user1.address)).to.be.revertedWith(
      "Address does not hold any tickets"
    );

    await expect(EventContract.handleRefund(user2.address))
      .to.emit(EventContract, "RefundsIssued")
      .withArgs(user2.address, 2, ethers.parseEther("20"));

    // check if burn successfully after refund given
    expect(
      await TicketContract.balanceOf(user2.address, NORMAL_TICKET)
    ).to.equal(0);
  });
});
