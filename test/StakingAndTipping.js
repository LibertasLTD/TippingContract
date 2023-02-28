const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { parseUnits, parseEther } = ethers.utils;
const zeroAddress = ethers.constants.AddressZero;

describe("Odeum interacting with Staking and Tipping", () => {

    // Deploy all contracts before each test suite
    async function deploys() {
        [
            ownerAcc,
            clientAcc1,
            clientAcc2,
            clientAcc3,
            clientAcc4,
            burnAcc,
            teamAcc
        ] = await ethers.getSigners();

        let odeumTx = await ethers.getContractFactory("Odeum");
        let odeum = await upgrades.deployProxy(odeumTx, [ownerAcc.address], {
            initializer: "configure",
            kind: "uups",
        });
        await odeum.deployed();

        let stakingTx = await ethers.getContractFactory("StakingPool");
        let stakingProto = await stakingTx.deploy(odeum.address);
        let staking = await stakingProto.deployed();

        let tippingTx = await ethers.getContractFactory("Tipping");
        let tippingProto = await tippingTx.deploy(
            staking.address,
            odeum.address,
            ownerAcc.address,
            // TODO should it be any other address???
            zeroAddress,
            10,
            45,
            45
        );
        let tipping = await tippingProto.deployed();



        // After odeum was deployed, 100_000_000 tokens were minter to owner.
        // We need to transfer them to test accounts as well

        await odeum.connect(ownerAcc).approve(clientAcc1.address, parseEther("10000"))
        await odeum.connect(ownerAcc).transfer(clientAcc1.address, parseEther("10000"))

        await odeum.connect(ownerAcc).approve(clientAcc2.address, parseEther("50000"))
        await odeum.connect(ownerAcc).transfer(clientAcc2.address, parseEther("50000"))

        await odeum.connect(ownerAcc).approve(clientAcc3.address, parseEther("100000"))
        await odeum.connect(ownerAcc).transfer(clientAcc3.address, parseEther("100000"))

        await odeum.connect(ownerAcc).approve(clientAcc4.address, parseEther("100000"))
        await odeum.connect(ownerAcc).transfer(clientAcc4.address, parseEther("100000"))

        return {
            odeum,
            staking,
            tipping
        };
    }

    describe("Interactions", () => {
        it("A user should be able to stake their tokens into the staking contract.", async () => {
            let { odeum, staking, tipping } = await loadFixture(
                deploys
            );

            let stake1 = parseEther("10000");
            let stake2 = parseEther("25000");
            let stake3 = parseEther("50000");

            await odeum.connect(clientAcc1).approve(staking.address, stake1);
            await odeum.connect(clientAcc2).approve(staking.address, stake2);
            await odeum.connect(clientAcc3).approve(staking.address, stake3);

            await staking.connect(clientAcc1).deposit(stake1);
            await staking.connect(clientAcc2).deposit(stake2);
            await staking.connect(clientAcc3).deposit(stake3);

            let amount1 = (await staking.userInfo(clientAcc1.address)).amount;
            let amount2 = (await staking.userInfo(clientAcc2.address)).amount;
            let amount3 = (await staking.userInfo(clientAcc3.address)).amount;
            expect(amount1).to.equal(stake1);
            expect(amount2).to.equal(stake2);
            expect(amount3).to.equal(stake3);
        });

    });

});
