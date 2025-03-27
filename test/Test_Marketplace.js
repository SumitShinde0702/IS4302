const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

// This test file contains more integration test for Marketplace contract,
// being able to confidently assume Event functions work as intended already

describe("Test MarketPlace functions", function () {
  let organiser, marketplace, user1, user2, user3, user4, others;
  let Market, MarketContract, MarketContractAddress;
  let Ticket, TicketContract, TicketContractAddress;
  let Event, EventContract, EventContractAddress;
  let eventName, eventDate, voteStartDate, voteEndDate;
  const NORMAL_TICKET = 0;

  before(async function () {
    // reset the blockchain state so that previous test does not affect this test
    await network.provider.send("hardhat_reset");
    [organiser, marketplace, user1, user2, user3, user4, ...others] =
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
    eventDate = Math.floor(new Date("2025-12-1").getTime() / 1000);

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
    voteStartDate = EventContract.votingPeriodStart();
    voteEndDate = EventContract.votingPeriodEnd();
  });

  it("Should set up contracts properly & mint tickets", async function () {
    expect(MarketContractAddress).to.be.properAddress;
    expect(TicketContractAddress).to.be.properAddress;
    expect(EventContractAddress).to.be.properAddress;
    expect(await TicketContract.eventContract()).to.equal(EventContractAddress);

    let numberOfTickets = await TicketContract.balanceOf(organiser.address, 0);
    expect(numberOfTickets).to.equal(10000);
  });

  it("Should be able to create listing", async function () {
    await expect(
      MarketContract.createOfficialListing(EventContractAddress, NORMAL_TICKET)
    ).to.be.revertedWith("Organiser is not approved");

    await MarketContract.approveOrganiser(organiser.address);
    await expect(
      MarketContract.connect(organiser).createOfficialListing(
        EventContractAddress,
        NORMAL_TICKET
      )
    )
      .to.emit(MarketContract, "OfficialTicketListed")
      .withArgs(organiser.address, "Test Event", 1, 10000);
  });

  it("Should be able to buy official tickets", async function () {
    await time.increaseTo(await EventContract.saleDate());
    await expect(
      MarketContract.connect(user1).buyOfficialTicket(
        EventContractAddress,
        1,
        1,
        {
          value: ethers.parseEther("10"),
        }
      ),
      "User1 buys 1 ticket"
    )
      .to.emit(MarketContract, "OfficialTicketPurchased")
      .withArgs(user1.address, "Test Event", 1, 1);

    await expect(
      MarketContract.connect(user2).buyOfficialTicket(
        EventContractAddress,
        1,
        2,
        {
          value: ethers.parseEther("20"),
        }
      ),
      "User2 buys 2 tickets"
    )
      .to.emit(MarketContract, "OfficialTicketPurchased")
      .withArgs(user2.address, "Test Event", 1, 2);

    await expect(
      MarketContract.connect(user3).buyOfficialTicket(
        EventContractAddress,
        1,
        3,
        {
          value: ethers.parseEther("30"),
        }
      ),
      "User3 buys 3 tickets"
    )
      .to.emit(MarketContract, "OfficialTicketPurchased")
      .withArgs(user3.address, "Test Event", 1, 3);

    await expect(
      MarketContract.connect(user4).buyOfficialTicket(
        EventContractAddress,
        1,
        4,
        {
          value: ethers.parseEther("40"),
        }
      ),
      "User4 buys 4 tickets"
    )
      .to.emit(MarketContract, "OfficialTicketPurchased")
      .withArgs(user4.address, "Test Event", 1, 4);

    expect(
      await TicketContract.balanceOf(organiser.address, NORMAL_TICKET)
    ).to.equal(9990);
  });

  it("Should be able to create resale listing", async function () {
    await expect(
      MarketContract.connect(user4).createResaleListing(
        EventContractAddress,
        10,
        NORMAL_TICKET,
        5
      )
    ).to.be.revertedWith("Insufficient tickets owned!");

    await expect(
      MarketContract.connect(user4).createResaleListing(
        EventContractAddress,
        10,
        NORMAL_TICKET,
        2
      )
    ).to.be.revertedWith(
      "Please approve the Event contract to transfer your tokens first!"
    );

    TicketContract.connect(user4).setApprovalForAll(EventContractAddress, true);

    expect(
      await MarketContract.connect(user4).createResaleListing(
        EventContractAddress,
        10,
        NORMAL_TICKET,
        2
      )
    )
      .to.emit(MarketContract, "ResaleTicketListed")
      .withArgs(user4.address, "Test Event", 1, 2);
  });

  it("Should be able to buy resale tickets", async function () {
    expect(
      await MarketContract.connect(user1).buyResaleTicket(
        EventContractAddress,
        1,
        2,
        {
          value: ethers.parseEther("20"),
        }
      )
    )
      .to.emit(MarketContract, "ResaleTicketPurchased")
      .withArgs(user1.address, "Test Event", 1, 2);

    expect(
      await TicketContract.balanceOf(user4.address, NORMAL_TICKET)
    ).to.equal(2);

    expect(
      await TicketContract.balanceOf(user1.address, NORMAL_TICKET)
    ).to.equal(3);
  });

  it("Should be able to vote for refund", async function () {
    const voteStart = await EventContract.votingPeriodStart();
    await time.increaseTo(voteStart);

    await expect(
      await MarketContract.connect(user1).voteForRefund(EventContractAddress)
    )
      .to.emit(EventContract, "Voted")
      .withArgs(user1.address, 3);

    expect(await EventContract.refundVotes()).to.equal(3);
  });

  it("Should be able to withdraw funds for organiser", async function () {
    const voteEnd = await EventContract.votingPeriodEnd();
    await time.increaseTo(voteEnd);

    await expect(
      MarketContract.connect(user1).claimRefund(EventContractAddress)
    ).to.be.revertedWith("Refund threshold not met");

    expect(
      EventContract.handleWithdraw()
    ).to.emit(EventContract, "FundsWithdrawn");
  });
});
