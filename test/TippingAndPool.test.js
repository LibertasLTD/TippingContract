const LibertasToken = artifacts.require('LibertasToken');
const StakingPool = artifacts.require('StakingPool');
const Tipping = artifacts.require('Tipping');
const { should } = require('chai');
const address = require('../address.json');
require('chai').should();

contract('Tipping', accounts => {

    const account_one = accounts[0];
    const account_two = accounts[1];
    const account_three = accounts[2];
    const account_four = accounts[3];

    beforeEach(async function() {
       this.libertas = await LibertasToken.new();
       this.stakingPool = await StakingPool.new(this.libertas.address);
       this.tipping = await Tipping.new(this.stakingPool.address, this.libertas.address, address['development'].usdt, address['development'].weth);
    });

    describe('LibertasToken Test', function() {
        it('should have valid contract address', function() {
            const address = this.libertas.address;
            address.should.not.equal(null);
        });

        it('should transfer coin correctly using transfer()', async function() {
            let org_account_one_balance = await this.libertas.balanceOf.call(account_one);

            await this.libertas.transfer(account_two, 1000, {from: account_one});

            let account_one_balance = await this.libertas.balanceOf.call(account_one);
            let diff_one = org_account_one_balance - account_one_balance;
            
            diff_one.should.equal(1000);
        });

        it('should transfer coin correctly using transferFrom()', async function() {
            await this.libertas.transfer(account_two, 1000, {from: account_one});
            let org_account_two_balance = await this.libertas.balanceOf.call(account_two);
            org_account_two_balance = org_account_two_balance.toNumber();
            org_account_two_balance.should.equal(1000);

            await this.libertas.approve(account_one, 700, {from: account_two});
            let account_one_allowance_for_two = await this.libertas.allowance(account_two, account_one, {from: account_two});
            account_one_allowance_for_two = account_one_allowance_for_two.toNumber();
            account_one_allowance_for_two.should.equal(700);

            await this.libertas.transferFrom(account_two, account_three, 700, {from: account_one});

            let account_two_balance = await this.libertas.balanceOf.call(account_two);
            account_two_balance = account_two_balance.toNumber();
            account_two_balance.should.equal(300);
        });
    });

    describe('StakingPool Test', function() {
        it('should have valid contract address', function() {
            const address = this.stakingPool.address;
            address.should.not.equal(null);
        });

        it('should be able to deposit into the pool', async function() {
            await this.libertas.transfer(account_two, 1000, {from: account_one});
            await this.libertas.approve(this.stakingPool.address, 300, {from: account_two});
            await this.stakingPool.deposit(300, {from: account_two});

            let balance_account_two = await this.libertas.balanceOf.call(account_two);
            balance_account_two = balance_account_two.toNumber();
            balance_account_two.should.equal(700);

            let userInfo = await this.stakingPool.userInfo.call(account_two);
            deposited_account_two = userInfo.amount;
            deposited_account_two = deposited_account_two.toNumber();
            deposited_account_two.should.equal(300);
        });

        it('should be able to withdraw from the pool', async function() {
            await this.libertas.transfer(account_two, 1000, {from: account_one});
            await this.libertas.approve(this.stakingPool.address, 300, {from: account_two});
            await this.stakingPool.deposit(300, {from: account_two});
            await this.stakingPool.withdraw(200, {from: account_two});
            
            let balance_account_two = await this.libertas.balanceOf.call(account_two);
            balance_account_two = balance_account_two.toNumber();
            balance_account_two.should.equal(900);

            let userInfo = await this.stakingPool.userInfo.call(account_two);
            deposited_account_two = userInfo.amount;
            deposited_account_two = deposited_account_two.toNumber();
            deposited_account_two.should.equal(100);
        });

        it('should distribute rewards proportionally according to staking amounts', async function() {
            await this.libertas.transfer(account_two, 100, {from: account_one});                // Send 100 LIBERTAS to account2
            await this.libertas.transfer(account_three, 200, {from: account_one});              // Send 200 LIBERTAS to account3
            await this.libertas.approve(this.stakingPool.address, 100, {from: account_two});
            await this.stakingPool.deposit(100, {from: account_two});                           // Deposit 100 LIBERTAS into staking pool from account2
            await this.libertas.approve(this.stakingPool.address, 200, {from: account_three});
            await this.stakingPool.deposit(200, {from: account_three});                         // Deposit 200 LIBERTAS from staking pool account3
            
            await this.libertas.approve(this.tipping.address, 6000, {from: account_one});
            await this.tipping.transfer(account_four, 6000, {from: account_one});                // Transfer 600 LIBERTAS from account1 to account4

            let balance_account_four = await this.libertas.balanceOf.call(account_four);
            balance_account_four = balance_account_four.toNumber();
            balance_account_four.should.equal(5400);                                            // Check account4 value is 5400

            let balance_account_two = await this.libertas.balanceOf.call(account_two);
            balance_account_two = balance_account_two.toNumber();
            balance_account_two.should.equal(0);

            await this.stakingPool.claim({from: account_two});
            balance_account_two = await this.libertas.balanceOf.call(account_two);
            balance_account_two = balance_account_two.toNumber();
            balance_account_two.should.equal(90);                                               // Check account2 reward is 90

            await this.stakingPool.withdraw(100, {from: account_two});
            balance_account_two = await this.libertas.balanceOf.call(account_two);
            balance_account_two = balance_account_two.toNumber();
            balance_account_two.should.equal(190);                                              // Check account2 balance is 190 after withdraw

            let balance_account_three = await this.libertas.balanceOf.call(account_three);
            balance_account_three = balance_account_three.toNumber();
            balance_account_three.should.equal(0);

            await this.stakingPool.claim({from: account_three});
            balance_account_three = await this.libertas.balanceOf.call(account_three);
            balance_account_three = balance_account_three.toNumber();
            balance_account_three.should.equal(180);                                             // Check account3 reward is 180

            await this.stakingPool.withdraw(200, {from: account_three});
            balance_account_three = await this.libertas.balanceOf.call(account_three);
            balance_account_three = balance_account_three.toNumber();
            balance_account_three.should.equal(380);                                            // Check account3 balance is 380 after withdraw
        });
    });

    describe('Tipping Test', function() {
        it('should have valid contract address', function() {
            const address = this.tipping.address;
            address.should.not.equal(null);
        });

        it('should transfer funds from sender to receiver with fee calculation', async function() {
            let org_balance_account_one = await this.libertas.balanceOf.call(account_one);
            let org_balance_account_two = await this.libertas.balanceOf.call(account_two);
            
            await this.libertas.approve(this.tipping.address, 1000, {from: account_one});
            await this.tipping.transfer(account_two, 1000, {from: account_one});

            let balance_account_one = await this.libertas.balanceOf.call(account_one);
            let balance_account_two = await this.libertas.balanceOf.call(account_two);

            org_balance_account_one = org_balance_account_one.toNumber();
            balance_account_one = balance_account_one.toNumber();
            let diff_one = org_balance_account_one - balance_account_one;
            diff_one.should.equal(1000);

            org_balance_account_two = org_balance_account_two.toNumber();
            balance_account_two = balance_account_two.toNumber();
            let diff_two = balance_account_two - org_balance_account_two;
            diff_two.should.equal(900);

            let balance_staking_pool = await this.libertas.balanceOf.call(this.stakingPool.address);
            balance_staking_pool = balance_staking_pool.toNumber();
            balance_staking_pool.should.equal(45);

            let balance_vault = await this.libertas.balanceOf.call('0x0305c2119bBDC01F3F50c10f63e68920D3d61915');
            balance_vault = balance_vault.toNumber();
            balance_vault.should.equal(45);
            let balance_burn = await this.libertas.balanceOf.call('0x0000000000000000000000000000000000000000');
            balance_burn = balance_burn.toNumber();
            balance_burn.should.equal(10);
        });
    });
});