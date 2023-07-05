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
            10, // 1% burnt
            100, // 10% to team
            90 // 9% community (staking)
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

    describe("Interactions", () => {
        // #1
        it("Users should be able to stake their tokens into the staking contract.", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let stake1 = parseEther("10000");
            let stake2 = parseEther("25000");
            let stake3 = parseEther("50000");

            let startBalance1 = await odeum.balanceOf(clientAcc1.address);
            let startBalance2 = await odeum.balanceOf(clientAcc2.address);
            let startBalance3 = await odeum.balanceOf(clientAcc3.address);
            let stakingStartBalance = await odeum.balanceOf(staking.address);

            await odeum.connect(clientAcc1).approve(staking.address, stake1);
            await odeum.connect(clientAcc2).approve(staking.address, stake2);
            await odeum.connect(clientAcc3).approve(staking.address, stake3);

            await staking.connect(clientAcc1).deposit(stake1);
            await staking.connect(clientAcc2).deposit(stake2);
            await staking.connect(clientAcc3).deposit(stake3);

            expect(await staking.getStake(clientAcc1.address)).to.equal(stake1);
            expect(await staking.getStake(clientAcc2.address)).to.equal(stake2);
            expect(await staking.getStake(clientAcc3.address)).to.equal(stake3);

            let endBalance1 = await odeum.balanceOf(clientAcc1.address);
            let endBalance2 = await odeum.balanceOf(clientAcc2.address);
            let endBalance3 = await odeum.balanceOf(clientAcc3.address);
            let stakingEndBalance = await odeum.balanceOf(staking.address);

            expect(startBalance1.sub(endBalance1)).to.equal(stake1);
            expect(startBalance2.sub(endBalance2)).to.equal(stake2);
            expect(startBalance3.sub(endBalance3)).to.equal(stake3);
            expect(stakingEndBalance.sub(stakingStartBalance)).to.equal(
                stake1.add(stake2).add(stake3)
            );
        });

        // #2
        it("Users should be able to withdraw their tokens after stake", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let startBalance1 = await odeum.balanceOf(clientAcc1.address);
            let startBalance2 = await odeum.balanceOf(clientAcc2.address);
            let startBalance3 = await odeum.balanceOf(clientAcc3.address);
            let stakingStartBalance = await odeum.balanceOf(staking.address);

            let stake1 = parseEther("10000");
            let stake2 = parseEther("25000");
            let stake3 = parseEther("50000");

            await odeum.connect(clientAcc1).approve(staking.address, stake1);
            await odeum.connect(clientAcc2).approve(staking.address, stake2);
            await odeum.connect(clientAcc3).approve(staking.address, stake3);

            await staking.connect(clientAcc1).deposit(stake1);
            await staking.connect(clientAcc2).deposit(stake2);
            await staking.connect(clientAcc3).deposit(stake3);

            await staking.connect(clientAcc1).withdraw(stake1);
            await staking.connect(clientAcc2).withdraw(stake2);
            await staking.connect(clientAcc3).withdraw(stake3);

            expect(await staking.getStake(clientAcc1.address)).to.equal(0);
            expect(await staking.getStake(clientAcc2.address)).to.equal(0);
            expect(await staking.getStake(clientAcc3.address)).to.equal(0);

            let endBalance1 = await odeum.balanceOf(clientAcc1.address);
            let endBalance2 = await odeum.balanceOf(clientAcc2.address);
            let endBalance3 = await odeum.balanceOf(clientAcc3.address);
            let stakingEndBalance = await odeum.balanceOf(staking.address);

            expect(startBalance1).to.equal(endBalance1);
            expect(startBalance2).to.equal(endBalance2);
            expect(startBalance3).to.equal(endBalance3);
            expect(stakingStartBalance).to.equal(stakingEndBalance);
        });

        // #3
        it("There should be a method to expose the total stake amount", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let startBalance1 = await odeum.balanceOf(clientAcc1.address);
            let startBalance2 = await odeum.balanceOf(clientAcc2.address);
            let startBalance3 = await odeum.balanceOf(clientAcc3.address);

            let stake1 = parseEther("10000");
            let stake2 = parseEther("25000");
            let stake3 = parseEther("50000");

            await odeum.connect(clientAcc1).approve(staking.address, stake1);
            await odeum.connect(clientAcc2).approve(staking.address, stake2);
            await odeum.connect(clientAcc3).approve(staking.address, stake3);

            await staking.connect(clientAcc1).deposit(stake1);
            await staking.connect(clientAcc2).deposit(stake2);
            await staking.connect(clientAcc3).deposit(stake3);

            expect(await staking.totalStake()).to.equal(
                stake1.add(stake2).add(stake3)
            );
        });

        // #4
        it("There should be a method to expose each user's stake amount", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let startBalance1 = await odeum.balanceOf(clientAcc1.address);
            let startBalance2 = await odeum.balanceOf(clientAcc2.address);
            let startBalance3 = await odeum.balanceOf(clientAcc3.address);

            let stake1 = parseEther("10000");
            let stake2 = parseEther("25000");
            let stake3 = parseEther("50000");

            await odeum.connect(clientAcc1).approve(staking.address, stake1);
            await odeum.connect(clientAcc2).approve(staking.address, stake2);
            await odeum.connect(clientAcc3).approve(staking.address, stake3);

            await staking.connect(clientAcc1).deposit(stake1);
            await staking.connect(clientAcc2).deposit(stake2);
            await staking.connect(clientAcc3).deposit(stake3);

            expect(await staking.getStake(clientAcc1.address)).to.equal(stake1);
            expect(await staking.getStake(clientAcc2.address)).to.equal(stake2);
            expect(await staking.getStake(clientAcc3.address)).to.equal(stake3);
        });

        // #5
        it("Users should be able to send a tip and have it split", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let senderBalance1 = await odeum.balanceOf(clientAcc1.address);
            let receiverBalance1 = await odeum.balanceOf(clientAcc2.address);
            let teamBalance1 = await odeum.balanceOf(ownerAcc.address);
            let stakingBalance1 = await odeum.balanceOf(staking.address);
            let totalSupply1 = await odeum.totalSupply();

            let tip = parseEther("10000");

            await odeum.connect(clientAcc1).approve(tipping.address, tip);

            await tipping.connect(clientAcc1).transfer(clientAcc2.address, tip);

            let senderBalance2 = await odeum.balanceOf(clientAcc1.address);
            let receiverBalance2 = await odeum.balanceOf(clientAcc2.address);
            let teamBalance2 = await odeum.balanceOf(ownerAcc.address);
            let stakingBalance2 = await odeum.balanceOf(staking.address);
            let totalSupply2 = await odeum.totalSupply();

            expect(senderBalance1.sub(senderBalance2)).to.equal(tip);
            expect(receiverBalance2.sub(receiverBalance1)).to.equal(
                parseEther("8000")
            );
            expect(teamBalance2.sub(teamBalance1)).to.equal(parseEther("1000"));
            expect(stakingBalance2.sub(stakingBalance1)).to.equal(
                parseEther("900")
            );
            expect(totalSupply1.sub(totalSupply2)).to.equal(parseEther("100"));
        });

        // #6.1
        it("Users should be able to see their available rewards for staking", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let stake = parseEther("10000");
            let tip = parseEther("100");
            await odeum.connect(clientAcc1).approve(staking.address, stake);
            await odeum.connect(ownerAcc).approve(tipping.address, tip);

            await staking.connect(clientAcc1).deposit(stake);
            await tipping.connect(ownerAcc).transfer(clientAcc2.address, tip);

            expect(
                await staking.getAvailableReward(clientAcc1.address)
            ).not.to.equal(0);
        });

        // #6.2
        it("Users should be able to see their claimed rewards for staking", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let stake = parseEther("10000");
            let tip = parseEther("100");
            await odeum.connect(clientAcc1).approve(staking.address, stake);
            await odeum.connect(ownerAcc).approve(tipping.address, tip);

            await staking.connect(clientAcc1).deposit(stake);
            await tipping.connect(ownerAcc).transfer(clientAcc2.address, tip);

            expect(await staking.claimedRewards(clientAcc1.address)).to.equal(
                0
            );

            await staking.connect(clientAcc1).withdraw(stake);

            expect(
                await staking.claimedRewards(clientAcc1.address)
            ).not.to.equal(0);
        });

        // #7
        it("Should be possible to see total claimed rewards for staking", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let stake = parseEther("10000");
            let tip = parseEther("100");
            await odeum.connect(clientAcc1).approve(staking.address, stake);
            await odeum.connect(ownerAcc).approve(tipping.address, tip);

            await staking.connect(clientAcc1).deposit(stake);
            await tipping.connect(ownerAcc).transfer(clientAcc2.address, tip);

            expect(await staking.totalClaimed()).to.equal(0);

            await staking.connect(clientAcc1).withdraw(stake);

            expect(await staking.totalClaimed()).not.to.equal(0);
        });

        // #8
        it("Tips should be split proportionally to stakes", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let stake1 = parseEther("1000");
            let stake2 = parseEther("2000");

            await odeum.connect(clientAcc1).approve(staking.address, stake1);
            await odeum.connect(clientAcc2).approve(staking.address, stake2);

            await staking.connect(clientAcc1).deposit(stake1);
            await staking.connect(clientAcc2).deposit(stake2);

            let startBalance1 = await odeum.balanceOf(clientAcc1.address);
            let startBalance2 = await odeum.balanceOf(clientAcc2.address);

            let tip = parseEther("10000");

            await odeum.connect(clientAcc3).approve(tipping.address, tip);
            await tipping.connect(clientAcc3).transfer(clientAcc4.address, tip);

            await staking.connect(clientAcc1).claim();
            await staking.connect(clientAcc2).claim();

            let endBalance1 = await odeum.balanceOf(clientAcc1.address);
            let endBalance2 = await odeum.balanceOf(clientAcc2.address);

            // 9% of tip get split
            expect(endBalance1.sub(startBalance1)).to.equal(parseEther("300"));
            expect(endBalance2.sub(startBalance2)).to.equal(parseEther("600"));
        });

        // #9
        it("Users should be able to see how many tips they got", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let tip = parseEther("10000");
            await odeum.connect(clientAcc1).approve(tipping.address, tip);
            await tipping.connect(clientAcc1).transfer(clientAcc2.address, tip);

            expect(await tipping.userTips(clientAcc2.address)).to.equal(
                parseEther("8000")
            );
        });

        // #10
        it("Percentages should be adjustable", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            expect(await tipping._burnRate()).to.equal(10);
            expect(await tipping._fundRate()).to.equal(100);
            expect(await tipping._rewardRate()).to.equal(90);

            await tipping.connect(ownerAcc).setBurnRate(15);
            await tipping.connect(ownerAcc).setFundRate(10);
            await tipping.connect(ownerAcc).setRewardRate(10);

            expect(await tipping._burnRate()).to.equal(15);
            expect(await tipping._fundRate()).to.equal(10);
            expect(await tipping._rewardRate()).to.equal(10);

            let stakingBalance1 = await odeum.balanceOf(staking.address);

            let tip = parseEther("10000");

            await odeum.connect(clientAcc1).approve(tipping.address, tip);
            await tipping.connect(clientAcc1).transfer(clientAcc2.address, tip);

            let stakingBalance2 = await odeum.balanceOf(staking.address);
            expect(stakingBalance2.sub(stakingBalance1)).to.equal(
                parseEther("100")
            );
        });

        // #11
        it("Rewards that have been sent to the pool should be stored if there are no stakers", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let stake1 = parseEther("1000");
            let stake2 = parseEther("2000");

            await odeum.connect(clientAcc1).approve(staking.address, stake1);
            await odeum.connect(clientAcc2).approve(staking.address, stake2);

            let tip = parseEther("10000");

            await odeum.connect(clientAcc3).approve(tipping.address, tip);
            await tipping.connect(clientAcc3).transfer(clientAcc4.address, tip);
          
            await staking.connect(clientAcc1).deposit(stake1);
            await staking.connect(clientAcc2).deposit(stake2);

            let startBalance1 = await odeum.balanceOf(clientAcc1.address);
            let startBalance2 = await odeum.balanceOf(clientAcc2.address);
            
            let rewardAcc = await staking.rewardAcc(); 
            expect(rewardAcc*1).to.be.equal(tip * 0.09)

            await odeum.connect(clientAcc3).approve(tipping.address, tip);
            await tipping.connect(clientAcc3).transfer(clientAcc4.address, tip);

            await staking.connect(clientAcc1).claim();
            await staking.connect(clientAcc2).claim();

            let endBalance1 = await odeum.balanceOf(clientAcc1.address);
            let endBalance2 = await odeum.balanceOf(clientAcc2.address);

            // 9% of tip get split
            // (10000 + 10000) * 0.09 
            expect(endBalance1.sub(startBalance1)).to.equal(parseEther("600"));
            expect(endBalance2.sub(startBalance2)).to.equal(parseEther("1200"));

            rewardAcc = await staking.rewardAcc(); 
            expect(rewardAcc).to.be.equal(0);
        });
    });
});
