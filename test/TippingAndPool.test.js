const { BN, ether, constants, expectRevert, expectEvent, expect } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = constants;
const ZERO = new BN('0');
const LibertasToken = artifacts.require('LibertasToken');
const StakingPool = artifacts.require('StakingPool');
const Tipping = artifacts.require('Tipping');
const MockToken = artifacts.require('MockToken');
const MockContract = artifacts.require('MockContract');
const { should } = require('chai');
require('chai').should();

const checkSetter = async (
  setterMethodName,
  getterName,
  newValue,
  validSender,
  nonValidSender,
  contractInstance,
  revertMessage,
  expect,
  expectRevert,
) => {
  await contractInstance[setterMethodName](newValue, { from: validSender });
  if (Number.isInteger(newValue)) {
    (await contractInstance[getterName]()).toNumber().should.equal(newValue);
  } else {
    (await contractInstance[getterName]()).should.equal(newValue);
  }
  await expectRevert(
    contractInstance[setterMethodName](newValue, { from: nonValidSender }),
    revertMessage,
  );
};

contract('Tipping', accounts => {

    const account_one = accounts[0];
    const account_two = accounts[1];
    const account_three = accounts[2];
    const account_four = accounts[3];

    const vault = accounts[4];

    const burnRate = 10;
    const fundRate = 45;
    const rewardRate = 45;

    let weth;
    let usdt;
    let libertas;
    let stakingPool;
    let tipping;

    beforeEach(async function() {
       weth = await MockToken.new("Mocked Wrapped ETH", "mWETH", ether('1000'));
       usdt = await MockToken.new("Mocked USDT", "mUSDT", ether('1000'));
       libertas = await LibertasToken.new();
       await libertas.configure(account_one);
       stakingPool = await StakingPool.new(libertas.address);
       tipping = await Tipping.new(stakingPool.address, libertas.address, vault, burnRate, fundRate, rewardRate);
    });

    describe('LibertasToken Test', function() {

        it('should perform approve and call', async () => {
          const etherToApprove = ether('10');
          const mock = await MockContract.new();
          await mock.givenAnyRevert();
          await expectRevert(libertas.approveAndCall(mock.address, etherToApprove, "0x00"), "receiveApprovalFailed");
          await mock.givenAnyReturnBool(true);
          const receipt = await libertas.approveAndCall(mock.address, etherToApprove, "0x00");
          expectEvent(receipt, "Approval", {
            owner: account_one,
            spender: mock.address,
            value: etherToApprove
          });
        })

        it('should have correct decimals', async () => {
            (await libertas.decimals()).toNumber().should.equal(2);
        });

        it('should have valid contract address', function() {
            const address = libertas.address;
            address.should.not.equal(null);
        });

        it('should transfer coin correctly using transfer()', async function() {
            let org_account_one_balance = await libertas.balanceOf(account_one);

            await libertas.approve(account_two, 1000, {from: account_one});
            await libertas.transfer(account_two, 1000, {from: account_one});

            let account_one_balance = await libertas.balanceOf(account_one);
            let diff_one = org_account_one_balance - account_one_balance;

            diff_one.should.equal(1000);
        });

        it('should transfer coin correctly using transferFrom()', async function() {
            await libertas.approve(account_two, 1000, {from: account_one});
            await libertas.transfer(account_two, 1000, {from: account_one});
            let org_account_two_balance = await libertas.balanceOf(account_two);
            org_account_two_balance = org_account_two_balance.toNumber();
            org_account_two_balance.should.equal(1000);

            await libertas.approve(account_one, 700, {from: account_two});
            let account_one_allowance_for_two = await libertas.allowance(account_two, account_one, {from: account_two});
            account_one_allowance_for_two = account_one_allowance_for_two.toNumber();
            account_one_allowance_for_two.should.equal(700);

            await libertas.transferFrom(account_two, account_three, 700, {from: account_one});

            let account_two_balance = await libertas.balanceOf(account_two);
            account_two_balance = account_two_balance.toNumber();
            account_two_balance.should.equal(300);
        });
    });

    describe('StakingPool Test', function() {
      
        it('should have valid contract address', function() {
            const address = stakingPool.address;
            address.should.not.equal(null);
        });

        it('should be able to deposit into the pool', async function() {
            await libertas.approve(account_two, 1000, {from: account_one});
            await libertas.transfer(account_two, 1000, {from: account_one});
            await libertas.approve(stakingPool.address, 300, {from: account_two});
            await stakingPool.deposit(300, {from: account_two});

            let balance_account_two = await libertas.balanceOf(account_two);
            balance_account_two = balance_account_two.toNumber();
            balance_account_two.should.equal(700);

            let userInfo = await stakingPool.userInfo(account_two);
            deposited_account_two = userInfo.amount;
            deposited_account_two = deposited_account_two.toNumber();
            deposited_account_two.should.equal(300);
        });

        it('should be able to withdraw from the pool', async function() {
            await libertas.approve(account_two, 1000, {from: account_one});
            await libertas.transfer(account_two, 1000, {from: account_one});
            await libertas.approve(stakingPool.address, 300, {from: account_two});
            await stakingPool.deposit(300, {from: account_two});
            await stakingPool.withdraw(200, {from: account_two});

            let balance_account_two = await libertas.balanceOf(account_two);
            balance_account_two = balance_account_two.toNumber();
            balance_account_two.should.equal(900);

            let userInfo = await stakingPool.userInfo(account_two);
            deposited_account_two = userInfo.amount;
            deposited_account_two = deposited_account_two.toNumber();
            deposited_account_two.should.equal(100);
        });

        it('should distribute rewards proportionally according to staking amounts', async function() {
            await libertas.approve(account_two, 100, {from: account_one});                // Send 100 LIBERTAS to account2
            await libertas.transfer(account_two, 100, {from: account_one});                // Send 100 LIBERTAS to account2
            await libertas.approve(account_three, 200, {from: account_one});              // Send 200 LIBERTAS to account3
            await libertas.transfer(account_three, 200, {from: account_one});              // Send 200 LIBERTAS to account3
            await libertas.approve(stakingPool.address, 100, {from: account_two});
            await stakingPool.deposit(100, {from: account_two});                           // Deposit 100 LIBERTAS into staking pool from account2
            await libertas.approve(stakingPool.address, 200, {from: account_three});
            await stakingPool.deposit(200, {from: account_three});                         // Deposit 200 LIBERTAS from staking pool account3

            await libertas.approve(tipping.address, 6000, {from: account_one});
            await tipping.transfer(account_four, 6000, {from: account_one});                // Transfer 600 LIBERTAS from account1 to account4

            let balance_account_four = await libertas.balanceOf(account_four);
            balance_account_four = balance_account_four.toNumber();
            balance_account_four.should.equal(5400);                                            // Check account4 value is 5400

            let balance_account_two = await libertas.balanceOf(account_two);
            balance_account_two = balance_account_two.toNumber();
            balance_account_two.should.equal(0);

            await stakingPool.claim({from: account_two});
            balance_account_two = await libertas.balanceOf(account_two);
            balance_account_two = balance_account_two.toNumber();
            balance_account_two.should.equal(90);                                               // Check account2 reward is 90

            await stakingPool.withdraw(100, {from: account_two});
            balance_account_two = await libertas.balanceOf(account_two);
            balance_account_two = balance_account_two.toNumber();
            balance_account_two.should.equal(190);                                              // Check account2 balance is 190 after withdraw

            let balance_account_three = await libertas.balanceOf(account_three);
            balance_account_three = balance_account_three.toNumber();
            balance_account_three.should.equal(0);

            await stakingPool.claim({from: account_three});
            balance_account_three = await libertas.balanceOf(account_three);
            balance_account_three = balance_account_three.toNumber();
            balance_account_three.should.equal(180);                                             // Check account3 reward is 180

            await stakingPool.withdraw(200, {from: account_three});
            balance_account_three = await libertas.balanceOf(account_three);
            balance_account_three = balance_account_three.toNumber();
            balance_account_three.should.equal(380);                                            // Check account3 balance is 380 after withdraw
        });
    });

    describe('Tipping Test', function() {
        it('should have valid contract address', function() {
            const address = tipping.address;
            address.should.not.equal(null);
        });

        it('should get/set staking vault address', async () => {
          await checkSetter(
            'setStakingVaultAddress',
            '_STAKING_VAULT',
            ZERO_ADDRESS,
            account_one,
            account_two,
            tipping,
            "Ownable: caller is not the owner",
            expect,
            expectRevert
          );
        });

        it('should get/set libertas address', async () => {
          await checkSetter(
            'setLibertasAddress',
            '_LIBERTAS',
            ZERO_ADDRESS,
            account_one,
            account_two,
            tipping,
            "Ownable: caller is not the owner",
            expect,
            expectRevert
          );
        });

        it('should get/set fund vault address', async () => {
          await checkSetter(
            'setFundVaultAddress',
            '_FUND_VAULT',
            ZERO_ADDRESS,
            account_one,
            account_two,
            tipping,
            "Ownable: caller is not the owner",
            expect,
            expectRevert
          );
        });

        it('should get/set burn rate', async () => {
          await checkSetter(
            'setBurnRate',
            '_burnRate',
            1,
            account_one,
            account_two,
            tipping,
            "Ownable: caller is not the owner",
            expect,
            expectRevert
          );
          await expectRevert(tipping.setBurnRate(new BN('100000')), "Out of range");
        });

        it('should get/set fund rate', async () => {
          await checkSetter(
            'setFundRate',
            '_fundRate',
            1,
            account_one,
            account_two,
            tipping,
            "Ownable: caller is not the owner",
            expect,
            expectRevert
          );
          await expectRevert(tipping.setFundRate(new BN('100000')), "Out of range");
        });

        it('should get/set reward rate', async () => {
          await checkSetter(
            'setRewardRate',
            '_rewardRate',
            1,
            account_one,
            account_two,
            tipping,
            "Ownable: caller is not the owner",
            expect,
            expectRevert
          );
          await expectRevert(tipping.setRewardRate(new BN('100000')), "Out of range");
        });

        it('should transfer funds from sender to receiver with fee calculation', async function() {
            let org_balance_account_one = await libertas.balanceOf(account_one);
            let org_balance_account_two = await libertas.balanceOf(account_two);

            const oldTotalSupply = await await libertas.totalSupply();

            await libertas.approve(tipping.address, 1000, {from: account_one});
            await tipping.transfer(account_two, 1000, {from: account_one});

            const newTotalSupply = await await libertas.totalSupply();

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

            balance_burn = oldTotalSupply.sub(newTotalSupply).toNumber();
            balance_burn.should.equal(10);
        });
    });
});
