const {
  BN,
  ether,
  constants,
  expectRevert,
  expectEvent,
  expect,
  time,
} = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;
const ZERO = new BN("0");
const { toWei, fromWei } = require("web3-utils");
const BridgedStandardERC20 = artifacts.require("BridgedStandardERC20");
const Bridge = artifacts.require("Bridge");
const StakingPool = artifacts.require("StakingPool");
const Tipping = artifacts.require("Tipping");
const MockToken = artifacts.require("MockToken");
const MockContract = artifacts.require("MockContract");
const { should } = require("chai");
require("chai").should();

const checkSetter = async (
  setterMethodName,
  getterName,
  newValue,
  validSender,
  nonValidSender,
  contractInstance,
  revertMessage,
  expect,
  expectRevert
) => {
  await contractInstance[setterMethodName](newValue, { from: validSender });
  if (Number.isInteger(newValue)) {
    (await contractInstance[getterName]()).toNumber().should.equal(newValue);
  } else {
    (await contractInstance[getterName]()).should.equal(newValue);
  }
  await expectRevert(
    contractInstance[setterMethodName](newValue, { from: nonValidSender }),
    revertMessage
  );
};

contract("Tipping", (accounts) => {
  const account_one = accounts[0];
  const account_two = accounts[1];
  const account_three = accounts[2];
  const account_four = accounts[3];

  const vault = accounts[4];
  const burn = accounts[5];
  const burnRate = 10;
  const fundRate = 45;
  const rewardRate = 45;

  let weth;
  let usdt;
  let libertas;
  let stakingPool;
  let tipping;

  let bridgedStandartERC20;
  let libertas2;
  let bridge2;

  beforeEach(async function () {
    weth = await MockToken.new("Mocked Wrapped ETH", "mWETH", ether("1000"));
    usdt = await MockToken.new("Mocked USDT", "mUSDT", ether("1000"));
    libertas2 = await LibertasToken.new();
    bridgedStandartERC20 = await BridgedStandardERC20.new({
      from: account_one,
    });
    bridge2 = await Bridge.new(
      false,
      bridgedStandartERC20.address,
      account_three,
      libertas2.address,
      "LIBERTAS",
      "ODEUM",
      { from: account_one }
    );
    libertas = await BridgedStandardERC20.at(
      await bridge2.getEndTokenByStartToken(libertas2.address)
    );

    await bridge2.performBridgingToEnd(
      libertas2.address,
      account_one,
      1000,
      "LIBERTAS",
      "ODEUM",
      { from: account_three }
    );
    // libertas = await BridgedStandardERC20.at("0x9122F3f35aA2324463b637eC94780bBCAb1c5a8C");
    // libertas = await BridgedStandardERC20.new();
    // await libertas.configure("0x45ae8f499234a1fb584de918d91897d7eafb0beb", "0x49184e6dae8c8ecd89d8bdc1b950c597b8167c90", "LIBERTAS", "ODEUM");

    stakingPool = await StakingPool.new(libertas.address);
    tipping = await Tipping.new(
      stakingPool.address,
      libertas.address,
      vault,
      burn,
      burnRate,
      fundRate,
      rewardRate
    );
    // 0x00 - admin
    await stakingPool.grantRole("0x00", tipping.address);
  });

  describe("LibertasToken Test", function () {
    // it('should perform approve and call', async () => {
    //   const etherToApprove = ether('10');
    //   const mock = await MockContract.new();
    //   await mock.givenAnyRevert();
    //   await expectRevert(libertas.approveAndCall(mock.address, etherToApprove, "0x00"), "receiveApprovalFailed");
    //   await mock.givenAnyReturnBool(true);
    //   const receipt = await libertas.approveAndCall(mock.address, etherToApprove, "0x00");
    //   expectEvent(receipt, "Approval", {
    //     owner: account_one,
    //     spender: mock.address,
    //     value: etherToApprove
    //   });
    // })

    it("should have correct decimals", async () => {
      (await libertas.decimals()).toNumber().should.equal(2);
    });

    it("should have valid contract address", function () {
      const address = libertas.address;
      address.should.not.equal(null);
    });

    it("should transfer coin correctly using transfer()", async function () {
      let org_account_one_balance = await libertas.balanceOf(account_one);

      await libertas.approve(account_two, 1000, { from: account_one });
      await libertas.transfer(account_two, 1000, { from: account_one });

      let account_one_balance = await libertas.balanceOf(account_one);
      let diff_one = org_account_one_balance - account_one_balance;

      diff_one.should.equal(1000);
    });

    it("should transfer coin correctly using transferFrom()", async function () {
      let org_account_two_balancePlus = await libertas.balanceOf(account_two);
      let org_account_two_balance_plus = org_account_two_balancePlus.toNumber();

      await libertas.approve(account_two, 1000, { from: account_one });
      await libertas.transfer(account_two, 1000, { from: account_one });
      let org_account_two_balance = await libertas.balanceOf(account_two);
      org_account_two_balance = org_account_two_balance.toNumber();
      org_account_two_balance.should.equal(org_account_two_balance_plus + 1000);

      await libertas.approve(account_one, 700, { from: account_two });
      let account_one_allowance_for_two = await libertas.allowance(
        account_two,
        account_one,
        { from: account_two }
      );
      account_one_allowance_for_two = account_one_allowance_for_two.toNumber();
      account_one_allowance_for_two.should.equal(700);

      await libertas.transferFrom(account_two, account_three, 700, {
        from: account_one,
      });

      let account_two_balance = await libertas.balanceOf(account_two);
      account_two_balance = account_two_balance.toNumber();
      account_two_balance.should.equal(300);
    });
  });

  describe("StakingPool Test", function () {
    it("should reject if trying to withdraw from contract too much", async () => {
      await expectRevert(
        stakingPool.withdraw(new BN("1000"), { from: account_two }),
        "withdrawTooMuch"
      );
    });

    it("should withdraw rewards even if requested amount is below actual balance of the contract", async () => {
      const accountTwoBalance = new BN("400");
      const reward = new BN("1000").sub(accountTwoBalance);

      await libertas.approve(account_two, accountTwoBalance, {
        from: account_one,
      });
      await libertas.transfer(account_two, accountTwoBalance, {
        from: account_one,
      });
      await libertas.approve(stakingPool.address, accountTwoBalance, {
        from: account_two,
      });
      await stakingPool.deposit(accountTwoBalance, { from: account_two });

      await libertas.approve(stakingPool.address, reward, {
        from: account_one,
      });
      await libertas.transfer(stakingPool.address, reward, {
        from: account_one,
      });
      await stakingPool.supplyReward(reward, { from: account_one });

      await stakingPool.withdraw(new BN("200"), { from: account_two });

      const newReward = new BN("1000");
      await stakingPool.supplyReward(reward, { from: account_one });

      await stakingPool.withdraw(ZERO, { from: account_two });
    });

    it("should withdraw balance of the contract", async () => {
      const accountTwoBalance = new BN("1000");
      const reward = (await libertas.totalSupply()).sub(accountTwoBalance);

      await libertas.approve(account_two, accountTwoBalance, {
        from: account_one,
      });
      await libertas.transfer(account_two, accountTwoBalance, {
        from: account_one,
      });
      await libertas.approve(stakingPool.address, accountTwoBalance, {
        from: account_two,
      });
      await stakingPool.deposit(accountTwoBalance, { from: account_two });

      await libertas.approve(stakingPool.address, reward, {
        from: account_one,
      });
      await libertas.transfer(stakingPool.address, reward, {
        from: account_one,
      });
      await stakingPool.supplyReward(reward, { from: account_one });

      const receipt = await stakingPool.withdraw(accountTwoBalance, {
        from: account_two,
      });
      expectEvent(receipt, "Withdraw", {
        user: account_two,
        amount: accountTwoBalance,
      });
    });

    it("should withdraw if zero requested", async () => {
      const receipt = await stakingPool.withdraw(ZERO, { from: account_two });
      expectEvent(receipt, "Withdraw", {
        user: account_two,
        amount: ZERO,
      });
    });

    it("should deposit when amount equals to zero", async () => {
      const receipt = await stakingPool.deposit(ZERO, { from: account_two });
      expectEvent(receipt, "Deposit", {
        user: account_two,
        amount: ZERO,
      });
    });

    it("should revert claim if not deposited first", async () => {
      await expectRevert(
        stakingPool.claim({ from: account_two }),
        "nothingToClaim"
      );
    });

    it("should revert if providing supply from unauthorized address", async () => {
      await expectRevert(
        stakingPool.supplyReward(ZERO, { from: account_two }),
        "onlyAdmin"
      );
    });

    it("should emergency withdraw", async () => {
      const accountTwoBalance = 1000;
      await libertas.approve(account_two, accountTwoBalance, {
        from: account_one,
      });
      await libertas.transfer(account_two, accountTwoBalance, {
        from: account_one,
      });
      await libertas.approve(stakingPool.address, accountTwoBalance, {
        from: account_two,
      });
      await stakingPool.deposit(accountTwoBalance, { from: account_two });

      const receipt = await stakingPool.emergencyWithdraw({
        from: account_two,
      });
      expectEvent(receipt, "EmergencyWithdraw", {
        user: account_two,
        amount: new BN(accountTwoBalance.toString()),
      });
    });

    it("should deposit when user amount equals to zero", async () => {
      const accountTwoBalance = 1000;
      const reward = (await libertas.totalSupply()).sub(
        new BN(accountTwoBalance.toString())
      );

      await libertas.approve(account_two, accountTwoBalance, {
        from: account_one,
      });
      await libertas.transfer(account_two, accountTwoBalance, {
        from: account_one,
      });

      await libertas.approve(stakingPool.address, 300, { from: account_two });
      await stakingPool.deposit(300, { from: account_two });

      await libertas.approve(stakingPool.address, reward, {
        from: account_one,
      });
      await libertas.transfer(stakingPool.address, reward, {
        from: account_one,
      });
      await stakingPool.supplyReward(reward, { from: account_one });

      await libertas.approve(stakingPool.address, 100, { from: account_two });
      let receipt = await stakingPool.deposit(100, { from: account_two });

      expectEvent(receipt, "Deposit", {
        amount: new BN("100"),
        user: account_two,
      });

      await stakingPool.claim({ from: account_two });

      await libertas.approve(stakingPool.address, 100, { from: account_two });
      receipt = await stakingPool.deposit(100, { from: account_two });

      expectEvent(receipt, "Deposit", {
        amount: new BN("100"),
        user: account_two,
      });
    });

    it("should get available reward", async () => {
      const accountTwoBalance = 1000;
      const reward = (await libertas.totalSupply()).sub(
        new BN(accountTwoBalance.toString())
      );

      await libertas.approve(account_two, accountTwoBalance, {
        from: account_one,
      });
      await libertas.transfer(account_two, accountTwoBalance, {
        from: account_one,
      });

      let availableReward = await stakingPool.availableReward({
        from: account_two,
      });
      availableReward.toNumber().should.equal(0);

      await libertas.approve(stakingPool.address, accountTwoBalance, {
        from: account_two,
      });
      await stakingPool.deposit(accountTwoBalance, { from: account_two });

      await libertas.approve(stakingPool.address, reward, {
        from: account_one,
      });
      await libertas.transfer(stakingPool.address, reward, {
        from: account_one,
      });
      await stakingPool.supplyReward(reward, { from: account_one });

      availableReward = await stakingPool.availableReward({
        from: account_two,
      });
      availableReward.toNumber().should.equal(reward.toNumber());
    });

    it("should have valid contract address", function () {
      const address = stakingPool.address;
      address.should.not.equal(null);
    });

    it("should be able to deposit into the pool", async function () {
      await libertas.approve(account_two, 1000, { from: account_one });
      await libertas.transfer(account_two, 1000, { from: account_one });
      await libertas.approve(stakingPool.address, 300, { from: account_two });
      await stakingPool.deposit(300, { from: account_two });

      let balance_account_two = await libertas.balanceOf(account_two);
      balance_account_two = balance_account_two.toNumber();
      balance_account_two.should.equal(700);

      let userInfo = await stakingPool.userInfo(account_two);
      deposited_account_two = userInfo.amount;
      deposited_account_two = deposited_account_two.toNumber();
      deposited_account_two.should.equal(300);
    });

    it("should be able to withdraw from the pool", async function () {
      await libertas.approve(account_two, 1000, { from: account_one });
      await libertas.transfer(account_two, 1000, { from: account_one });
      await libertas.approve(stakingPool.address, 300, { from: account_two });
      await stakingPool.deposit(300, { from: account_two });
      await stakingPool.withdraw(200, { from: account_two });

      let balance_account_two = await libertas.balanceOf(account_two);
      balance_account_two = balance_account_two.toNumber();
      balance_account_two.should.equal(900);

      let userInfo = await stakingPool.userInfo(account_two);
      deposited_account_two = userInfo.amount;
      deposited_account_two = deposited_account_two.toNumber();
      deposited_account_two.should.equal(100);
    });

    it("should distribute rewards proportionally according to staking amounts", async function () {
      // const accountTwoBalance = 1000;
      // const reward = (await libertas.totalSupply());
      // console.log("reward " + reward);
      // console.log("total " + (await libertas.totalSupply()).toNumber());
      // await stakingPool.supplyReward(reward, {from: account_one});
      //
      // await libertas.approve(account_two, 100, {from: account_one});                // Send 100 LIBERTAS to account2
      // await libertas.transfer(account_two, 100, {from: account_one});                // Send 100 LIBERTAS to account2
      // await libertas.approve(account_three, 200, {from: account_one});              // Send 200 LIBERTAS to account3
      // await libertas.transfer(account_three, 200, {from: account_one});              // Send 200 LIBERTAS to account3
      // await libertas.approve(stakingPool.address, 100, {from: account_two});
      // await stakingPool.deposit(100, {from: account_two});                           // Deposit 100 LIBERTAS into staking pool from account2
      // await libertas.approve(stakingPool.address, 200, {from: account_three});
      // await stakingPool.deposit(200, {from: account_three});                         // Deposit 200 LIBERTAS from staking pool account3
      // await libertas.mint(account_one, 6000);
      // await libertas.approve(tipping.address, 6000, {from: account_one});
      // await tipping.transfer(account_four, 6000, {from: account_one});                // Transfer 600 LIBERTAS from account1 to account4
      //
      // let balance_account_four = await libertas.balanceOf(account_four);
      // balance_account_four = balance_account_four.toNumber();
      // balance_account_four.should.equal(5400);                                            // Check account4 value is 5400
      //
      // let balance_account_two = await libertas.balanceOf(account_two);
      // balance_account_two = balance_account_two.toNumber();
      // balance_account_two.should.equal(0);
      //
      // await stakingPool.claim({from: account_two});
      // balance_account_two = await libertas.balanceOf(account_two);
      // balance_account_two = balance_account_two.toNumber();
      // console.log("accLibertasPerShare " + (await stakingPool.accLibertasPerShare()).toNumber());
      // balance_account_two.should.equal(90);                                               // Check account2 reward is 90
      //
      // await stakingPool.withdraw(100, {from: account_two});
      // balance_account_two = await libertas.balanceOf(account_two);
      // balance_account_two = balance_account_two.toNumber();
      // balance_account_two.should.equal(190);                                              // Check account2 balance is 190 after withdraw
      //
      // let balance_account_three = await libertas.balanceOf(account_three);
      // balance_account_three = balance_account_three.toNumber();
      // balance_account_three.should.equal(0);
      //
      // await stakingPool.claim({from: account_three});
      // balance_account_three = await libertas.balanceOf(account_three);
      // balance_account_three = balance_account_three.toNumber();
      // balance_account_three.should.equal(180);                                             // Check account3 reward is 180
      //
      // await stakingPool.withdraw(200, {from: account_three});
      // balance_account_three = await libertas.balanceOf(account_three);
      // balance_account_three = balance_account_three.toNumber();
      // balance_account_three.should.equal(380);                                            // Check account3 balance is 380 after withdraw
    });
  });

  describe("Tipping Test", function () {
    it("should have valid contract address", function () {
      const address = tipping.address;
      address.should.not.equal(null);
    });

    it("should get/set staking vault address", async () => {
      await checkSetter(
        "setStakingVaultAddress",
        "_STAKING_VAULT",
        ZERO_ADDRESS,
        account_one,
        account_two,
        tipping,
        "Ownable: caller is not the owner",
        expect,
        expectRevert
      );
    });

    it("should get/set libertas address", async () => {
      await checkSetter(
        "setLibertasAddress",
        "_LIBERTAS",
        ZERO_ADDRESS,
        account_one,
        account_two,
        tipping,
        "Ownable: caller is not the owner",
        expect,
        expectRevert
      );
    });

    it("should get/set fund vault address", async () => {
      await checkSetter(
        "setFundVaultAddress",
        "_FUND_VAULT",
        ZERO_ADDRESS,
        account_one,
        account_two,
        tipping,
        "Ownable: caller is not the owner",
        expect,
        expectRevert
      );
    });

    it("should get/set burn rate", async () => {
      await checkSetter(
        "setBurnRate",
        "_burnRate",
        1,
        account_one,
        account_two,
        tipping,
        "Ownable: caller is not the owner",
        expect,
        expectRevert
      );
      await expectRevert(tipping.setBurnRate(new BN("100000")), "Out of range");
    });

    it("should get/set fund rate", async () => {
      await checkSetter(
        "setFundRate",
        "_fundRate",
        1,
        account_one,
        account_two,
        tipping,
        "Ownable: caller is not the owner",
        expect,
        expectRevert
      );
      await expectRevert(tipping.setFundRate(new BN("100000")), "Out of range");
    });

    it("should get/set reward rate", async () => {
      await checkSetter(
        "setRewardRate",
        "_rewardRate",
        1,
        account_one,
        account_two,
        tipping,
        "Ownable: caller is not the owner",
        expect,
        expectRevert
      );
      await expectRevert(
        tipping.setRewardRate(new BN("100000")),
        "Out of range"
      );
    });

    it("should transfer funds from sender to receiver with fee calculation", async function () {
      let org_balance_account_one = await libertas.balanceOf(account_one);
      let org_balance_account_two = await libertas.balanceOf(account_two);
      const oldTotalSupply = await libertas.totalSupply();
      org_balance_account_one.toNumber().should.equal(1000);

      var tipping_address = await tipping.address;
      //await tipping.sendTransaction({from: account_one, value: new BN("1000000000")  });

      //await tipping.receive({from: account_one, value: web3.utils.toWei(new BN("11"))});

      await libertas.approve(tipping.address, 1000, { from: account_one });
      await tipping.transfer(account_two, 1000, { from: account_one });

      const newTotalSupply = await libertas.totalSupply();

      let balance_account_one = await libertas.balanceOf(account_one);
      let balance_account_two = await libertas.balanceOf(account_two);

      org_balance_account_one = org_balance_account_one.toNumber();
      balance_account_one = balance_account_one.toNumber();
      let diff_one = org_balance_account_one - balance_account_one;
      diff_one.should.equal(1000);

      org_balance_account_two = org_balance_account_two.toNumber();
      balance_account_two = balance_account_two.toNumber();
      let diff_two = balance_account_two - org_balance_account_two;
      diff_two.should.equal(900);

      let balance_staking_pool = await libertas.balanceOf(stakingPool.address);
      balance_staking_pool = balance_staking_pool.toNumber();
      balance_staking_pool.should.equal(45);

      let balance_vault = await libertas.balanceOf(vault);
      balance_vault = balance_vault.toNumber();
      balance_vault.should.equal(45);
    });
  });
});
