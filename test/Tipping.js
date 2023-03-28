const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { parseUnits, parseEther } = ethers.utils;
const zeroAddress = ethers.constants.AddressZero;


/* NOTICE:
* Complicated scenarions of work of Tipping contract are tested
* in `StakingAndTipping.js` file
* The puprose of this file is to increase test coverage of `Tipping.sol` contract
*/



describe("Tipping contract", () => {
    // Deploy all contracts before each test suite
    async function deploys() {
        [
            ownerAcc,
            clientAcc1,
            clientAcc2,
            clientAcc3,
            clientAcc4,
            burnAcc,
            teamAcc,
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
            zeroAddress,
            10,
            45,
            45
        );
        let tipping = await tippingProto.deployed();

        await staking.connect(ownerAcc).setTipping(tipping.address);

        // After odeum was deployed, 100_000_000 tokens were minter to owner.
        // We need to transfer them to test accounts as well

        await odeum
            .connect(ownerAcc)
            .approve(clientAcc1.address, parseEther("10000"));
        await odeum
            .connect(ownerAcc)
            .transfer(clientAcc1.address, parseEther("10000"));

        await odeum
            .connect(ownerAcc)
            .approve(clientAcc2.address, parseEther("50000"));
        await odeum
            .connect(ownerAcc)
            .transfer(clientAcc2.address, parseEther("50000"));

        await odeum
            .connect(ownerAcc)
            .approve(clientAcc3.address, parseEther("100000"));
        await odeum
            .connect(ownerAcc)
            .transfer(clientAcc3.address, parseEther("100000"));

        await odeum
            .connect(ownerAcc)
            .approve(clientAcc4.address, parseEther("100000"));
        await odeum
            .connect(ownerAcc)
            .transfer(clientAcc4.address, parseEther("100000"));

        return {
            odeum,
            staking,
            tipping,
        };
    }

    describe("Deployment", () => {
        it("Should have correct parameters after deployment", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            expect(await tipping._burnRate()).to.equal(10);
            expect(await tipping._fundRate()).to.equal(45);
            expect(await tipping._rewardRate()).to.equal(45);
            expect(await tipping._STAKING_VAULT()).to.equal(staking.address);
            expect(await tipping._ODEUM()).to.equal(odeum.address);
            expect(await tipping._FUND_VAULT()).to.equal(ownerAcc.address);
            expect(await tipping._VAULT_TO_BURN()).to.equal(zeroAddress);

        });
    });

    describe("Setters", () => {
        describe("Addresses", () => {
            // Staking
            it("Should change staking vault address", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                expect(await tipping.setStakingVaultAddress(clientAcc1.address))
                .to.emit(tipping, "StakingAddressChanged")
                .withArgs(clientAcc1.address);

                expect(await tipping._STAKING_VAULT()).to.equal(clientAcc1.address);

            });
            it("Should fail to change staking vault address", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                await expect(tipping.setStakingVaultAddress(zeroAddress))
                    .to.be.revertedWith("Tipping: Invalid staking address!");

            });
            // Odeum
            it("Should change odeum address", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                expect(await tipping.setOdeumAddress(clientAcc1.address))
                .to.emit(tipping, "OdeumAddressChanged")
                .withArgs(clientAcc1.address);

                expect(await tipping._ODEUM()).to.equal(clientAcc1.address);

            });
            it("Should fail to change odeum address", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                await expect(tipping.setOdeumAddress(zeroAddress))
                    .to.be.revertedWith("Tipping: Invalid odeum address!");

            });
            // Burn
            it("Should change burn address", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                expect(await tipping.setVaultToBurnAddress(clientAcc1.address))
                    .to.emit(tipping, "BurnAddressChanged")
                    .withArgs(clientAcc1.address);

                expect(await tipping._VAULT_TO_BURN()).to.equal(clientAcc1.address);

            });
            // Team wallet
            it("Should change team wallet address", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                expect(await tipping.setFundVaultAddress(clientAcc1.address))
                .to.emit(tipping, "FundAddressChanged")
                .withArgs(clientAcc1.address);

                expect(await tipping._FUND_VAULT()).to.equal(clientAcc1.address);

            });
            it("Should fail to change team wallet address", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                await expect(tipping.setFundVaultAddress(zeroAddress))
                    .to.be.revertedWith("Tipping: Invalid fund vault address!");

            });
        });
        describe("Rates", () => {
            // Burn rate
            it("Should change burn rate", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                expect(await tipping.setBurnRate(777))
                .to.emit(tipping, "BurnRateChanged")
                .withArgs(777);

                expect(await tipping._burnRate()).to.equal(777);

            });
            // Fund rate
            it("Should change fund rate", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                expect(await tipping.setFundRate(777))
                .to.emit(tipping, "FundRateChanged")
                .withArgs(777);

                expect(await tipping._fundRate()).to.equal(777);

            });
            // Reward rate
            it("Should change reward rate", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                expect(await tipping.setRewardRate(777))
                .to.emit(tipping, "RewardRateChanged")
                .withArgs(777);

                expect(await tipping._rewardRate()).to.equal(777);

            });
            // Invalid rate
            it("Should fail to set invalid rate", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                await expect(tipping.setRewardRate((await tipping.MAX_RATE_BP()) + 1))
                .to.be.revertedWith("Tipping: Rate too high!");
            });
        })
    });


    describe("Transfer", () => {
        it("Users should be able to send a tip and have it split", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let senderBalance1 = await odeum.balanceOf(clientAcc1.address);
            let receiverBalance1 = await odeum.balanceOf(clientAcc2.address);
            let teamBalance1 = await odeum.balanceOf(ownerAcc.address);
            let stakingBalance1 = await odeum.balanceOf(staking.address);
            let totalSupply1 = await odeum.totalSupply();

            let tip = parseEther("10000");

            await odeum.connect(clientAcc1).approve(tipping.address, tip);

            expect(await tipping.connect(clientAcc1).transfer(clientAcc2.address, tip))
                .to.emit(tipping, "SplitTransfer")
                .withArgs(clientAcc2.address, tip);

            let senderBalance2 = await odeum.balanceOf(clientAcc1.address);
            let receiverBalance2 = await odeum.balanceOf(clientAcc2.address);
            let teamBalance2 = await odeum.balanceOf(ownerAcc.address);
            let stakingBalance2 = await odeum.balanceOf(staking.address);
            let totalSupply2 = await odeum.totalSupply();

            expect(senderBalance1.sub(senderBalance2)).to.equal(tip);
            expect(receiverBalance2.sub(receiverBalance1)).to.equal(
                parseEther("9000")
            );
            expect(teamBalance2.sub(teamBalance1)).to.equal(parseEther("450"));
            expect(stakingBalance2.sub(stakingBalance1)).to.equal(
                parseEther("450")
            );
            expect(totalSupply1.sub(totalSupply2)).to.equal(parseEther("100"));
        });
    });
});
