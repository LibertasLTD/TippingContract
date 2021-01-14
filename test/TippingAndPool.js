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
    });

    describe('Tipping Test', function() {
        it('should have valid contract address', function() {
            const address = this.tipping.address;
            address.should.not.equal(null);
        });

        it('should transfer funds from sender to receiver with fee calculation', async function() {
            const account_one = accounts[0];
            const account_two = accounts[1];
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