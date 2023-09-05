const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { parseUnits, parseEther } = ethers.utils;
const zeroAddress = ethers.constants.AddressZero;

describe("Odeum interacting with Staking and Tipping", () => {
    // Deploy all contracts before each test suite
    async function deploys() {
        [ownerAcc, poolAcc, dex, clientAcc1, clientAcc2, clientAcc3] =
            await ethers.getSigners();

        let odeumTx = await ethers.getContractFactory("contracts/OdeumV2.sol:Odeum");
        let odeum = await upgrades.deployProxy(odeumTx, [ownerAcc.address, poolAcc.address, dex.address], {
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

        return {
            odeum,
            staking,
            tipping,
        };
    }

    describe("Setters", () => {
        it("Should set tipping contract address", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            await expect(await staking.setTipping(clientAcc1.address))
                .to.emit(staking, "TippingAddressChanged")
                .withArgs(anyValue);

            expect(await staking.tipping()).to.equal(clientAcc1.address);
        });
        it("Should fail to set tipping contract address", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            await expect(staking.setTipping(zeroAddress)).to.be.revertedWith(
                "Staking: Invalid tipping address!"
            );
        });
    });
    describe("Getters", () => {
        describe("Rewards", () => {
            it("Should get available reward", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                let stake = parseEther("10000");
                let tip = parseEther("100");
                await odeum.connect(clientAcc1).approve(staking.address, stake);
                await odeum.connect(ownerAcc).approve(tipping.address, tip);

                await staking.connect(clientAcc1).deposit(stake);
                await tipping
                    .connect(ownerAcc)
                    .tip(clientAcc2.address, tip);

                expect(
                    await staking.getAvailableReward(clientAcc1.address)
                ).not.to.equal(0);
            });
            it("Should fail to get available reward", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                await expect(
                    staking.getAvailableReward(zeroAddress)
                ).to.be.revertedWith("Staking: Invalid user address!");
            });
        });

        describe("Stakes", () => {
            it("Should get stake of the user", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                let stake = parseEther("10000");
                await odeum.connect(clientAcc1).approve(staking.address, stake);
                await staking.connect(clientAcc1).deposit(stake);

                expect(await staking.getStake(clientAcc1.address)).to.equal(
                    stake
                );
            });
            it("Should fail to get stake of the user", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                await expect(staking.getStake(zeroAddress)).to.be.revertedWith(
                    "Staking: Invalid user address!"
                );
            });
            it("Should get the number of stakers", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                let stake = parseEther("500");
                await odeum
                    .connect(clientAcc1)
                    .approve(staking.address, stake.mul(2));
                await staking.connect(clientAcc1).deposit(stake);

                expect(await staking.getStakersCount()).to.equal(1);

                await staking.connect(clientAcc1).deposit(stake);

                expect(await staking.getStakersCount()).to.equal(1);

                await odeum.connect(clientAcc2).approve(staking.address, stake);
                await staking.connect(clientAcc2).deposit(stake);

                expect(await staking.getStakersCount()).to.equal(2);
            });
        });
    });

    describe("Modifiers", () => {
        describe("Supply reward", () => {
            it("Should allow only tipping contract to supply reward", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                let reward = parseEther("500");
                await odeum.connect(ownerAcc).approve(staking.address, reward);

                await expect(staking.supplyReward(reward)).to.be.revertedWith(
                    "Staking: Caller is not Tipping!"
                );
            });
        });
        describe("Claim pending reward", async () => {
            it("Should claim pending reward on each deposit", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                let stake = parseEther("50");
                await odeum
                    .connect(clientAcc1)
                    .approve(staking.address, stake.mul(5));
                let tip = parseEther("10");
                await odeum.connect(ownerAcc).approve(tipping.address, tip);
                // No reward for client yet. `odeumPerShare` not set yet
                await staking.connect(clientAcc1).deposit(stake);
                // `odeumPerShare` gets calculated on transfer
                await tipping
                    .connect(ownerAcc)
                    .tip(clientAcc2.address, tip);

                expect(
                    await staking.getAvailableReward(clientAcc1.address)
                ).not.to.equal(0);
                // Next deposit will calculate and claim the reward
                await staking.connect(clientAcc1).deposit(stake);
                // Now no reward should be available
                expect(
                    await staking.getAvailableReward(clientAcc1.address)
                ).to.equal(0);
            });

            it("Should claim pending reward on each withdraw", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                let stake = parseEther("50");
                await odeum
                    .connect(clientAcc1)
                    .approve(staking.address, stake.mul(5));
                let tip = parseEther("10");
                await odeum.connect(ownerAcc).approve(tipping.address, tip);
                // No reward for client yet. `odeumPerShare` not set yet
                await staking.connect(clientAcc1).deposit(stake);
                // `odeumPerShare` gets calculated on transfer
                await tipping
                    .connect(ownerAcc)
                    .tip(clientAcc2.address, tip);

                expect(
                    await staking.getAvailableReward(clientAcc1.address)
                ).not.to.equal(0);
                // Next withdraw will calculate and claim the reward
                await staking.connect(clientAcc1).withdraw(stake);
                // Now no reward should be available
                expect(
                    await staking.getAvailableReward(clientAcc1.address)
                ).to.equal(0);
            });

            it("Should claim pending reward on each claim", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                let stake = parseEther("50");
                await odeum
                    .connect(clientAcc1)
                    .approve(staking.address, stake.mul(5));
                let tip = parseEther("10");
                await odeum.connect(ownerAcc).approve(tipping.address, tip);
                // No reward for client yet. `odeumPerShare` not set yet
                await staking.connect(clientAcc1).deposit(stake);
                // `odeumPerShare` gets calculated on transfer
                await tipping
                    .connect(ownerAcc)
                    .tip(clientAcc2.address, tip);

                expect(
                    await staking.getAvailableReward(clientAcc1.address)
                ).not.to.equal(0);
                // Next claim will calculate and claim the reward
                await staking.connect(clientAcc1).claim();
                // Now no reward should be available
                expect(
                    await staking.getAvailableReward(clientAcc1.address)
                ).to.equal(0);
            });
        });
        describe("Update reward", async () => {
            it("Should update last reward of user on each deposit", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                let stake = parseEther("50");
                await odeum
                    .connect(clientAcc1)
                    .approve(staking.address, stake.mul(5));
                let tip = parseEther("10");
                await odeum.connect(ownerAcc).approve(tipping.address, tip);
                // No reward for client yet. `odeumPerShare` not set yet
                await staking.connect(clientAcc1).deposit(stake);
                // `odeumPerShare` gets calculated on transfer
                await tipping
                    .connect(ownerAcc)
                    .tip(clientAcc2.address, tip);

                expect(
                    (await staking.userInfo(clientAcc1.address)).lastReward
                ).to.equal(0);
                // Next deposit will calculate and claim the reward
                await staking.connect(clientAcc1).deposit(stake);
                expect(
                    (await staking.userInfo(clientAcc1.address)).lastReward
                ).not.to.equal(0);
            });

            it("Should update last reward of user on each withdraw", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                let stake = parseEther("50");
                await odeum
                    .connect(clientAcc1)
                    .approve(staking.address, stake.mul(5));
                let tip = parseEther("10");
                await odeum.connect(ownerAcc).approve(tipping.address, tip);
                // No reward for client yet. `odeumPerShare` not set yet
                await staking.connect(clientAcc1).deposit(stake);
                // `odeumPerShare` gets calculated on transfer
                await tipping
                    .connect(ownerAcc)
                    .tip(clientAcc2.address, tip);

                expect(
                    (await staking.userInfo(clientAcc1.address)).lastReward
                ).to.equal(0);
                // Next withdraw will calculate and claim the reward
                await staking.connect(clientAcc1).withdraw(stake);
                // Last reward equals 0 here because withdraw decreases the `user.amount` to 0
                expect(
                    (await staking.userInfo(clientAcc1.address)).lastReward
                ).to.equal(0);
            });

            it("Should update last reward of user on each claim", async () => {
                let { odeum, staking, tipping } = await loadFixture(deploys);

                let stake = parseEther("50");
                await odeum
                    .connect(clientAcc1)
                    .approve(staking.address, stake.mul(5));
                let tip = parseEther("10");
                await odeum.connect(ownerAcc).approve(tipping.address, tip);
                // No reward for client yet. `odeumPerShare` not set yet
                await staking.connect(clientAcc1).deposit(stake);
                // `odeumPerShare` gets calculated on transfer
                await tipping
                    .connect(ownerAcc)
                    .tip(clientAcc2.address, tip);

                expect(
                    (await staking.userInfo(clientAcc1.address)).lastReward
                ).to.equal(0);
                // Next claim will calculate and claim the reward
                await staking.connect(clientAcc1).claim();
                expect(
                    (await staking.userInfo(clientAcc1.address)).lastReward
                ).not.to.equal(0);
            });
        });
    });

    describe("Deposit", () => {
        it("Should deposit funds and update stats", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let initialStakingBalance = await odeum.balanceOf(staking.address);
            let initialOwnerBalance = await odeum.balanceOf(ownerAcc.address);
            let initialOwnerAmount = (await staking.userInfo(ownerAcc.address))
                .amount;
            let initialTotalStake = await staking.totalStake();

            let stake = parseEther("500");
            await odeum.connect(ownerAcc).approve(staking.address, stake);
            expect(await staking.connect(ownerAcc).deposit(stake))
                .to.emit(staking, "Deposit")
                .withArgs(anyValue, anyValue);

            let endStakingBalance = await odeum.balanceOf(staking.address);
            let endOwnerBalance = await odeum.balanceOf(ownerAcc.address);
            let endOwnerAmount = (await staking.userInfo(ownerAcc.address))
                .amount;
            let endTotalStake = await staking.totalStake();

            expect(endStakingBalance.sub(initialStakingBalance)).to.equal(
                stake
            );
            expect(initialOwnerBalance.sub(endOwnerBalance)).to.equal(stake);
            expect(endOwnerAmount.sub(initialOwnerAmount)).to.equal(stake);
            expect(endTotalStake.sub(initialTotalStake)).to.equal(stake);
        });

        it("Should not update stats when depositing zero amount", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let initialStakingBalance = await odeum.balanceOf(staking.address);
            let initialOwnerBalance = await odeum.balanceOf(ownerAcc.address);
            let initialOwnerAmount = (await staking.userInfo(ownerAcc.address))
                .amount;
            let initialTotalStake = await staking.totalStake();

            let stake = parseEther("0");
            await odeum.connect(ownerAcc).approve(staking.address, stake);
            expect(await staking.connect(ownerAcc).deposit(stake))
                .to.emit(staking, "Deposit")
                .withArgs(anyValue, anyValue);

            let endStakingBalance = await odeum.balanceOf(staking.address);
            let endOwnerBalance = await odeum.balanceOf(ownerAcc.address);
            let endOwnerAmount = (await staking.userInfo(ownerAcc.address))
                .amount;
            let endTotalStake = await staking.totalStake();

            expect(endStakingBalance).to.equal(initialStakingBalance);
            expect(endOwnerBalance).to.equal(initialOwnerBalance);
            expect(endOwnerAmount).to.equal(initialOwnerAmount);
            expect(endTotalStake).to.equal(initialTotalStake);
        });
    });

    describe("Withdraw", () => {
        it("Should withdraw funds and update stats", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let initialStakingBalance = await odeum.balanceOf(staking.address);
            let initialClientBalance = await odeum.balanceOf(
                clientAcc1.address
            );
            let initialClientAmount = (
                await staking.userInfo(clientAcc1.address)
            ).amount;
            let initialTotalStake = await staking.totalStake();

            let stake = parseEther("500");
            await odeum.connect(clientAcc1).approve(staking.address, stake);
            let tip = parseEther("10");
            await odeum.connect(ownerAcc).approve(tipping.address, tip);

            await staking.connect(clientAcc1).deposit(stake);
            await tipping.connect(ownerAcc).tip(clientAcc2.address, tip);

            let middleStakingBalance = await odeum.balanceOf(staking.address);
            let middleClientBalance = await odeum.balanceOf(clientAcc1.address);
            let middleClientAmount = (
                await staking.userInfo(clientAcc1.address)
            ).amount;
            let middleTotalStake = await staking.totalStake();

            // Some tokens have been transferred to staking through tipping as well. That's
            // why balances difference here is greater than stake amount
            expect(middleStakingBalance.sub(initialStakingBalance)).to.be.gt(
                stake
            );
            expect(initialClientBalance.sub(middleClientBalance)).to.equal(
                stake
            );
            expect(middleClientAmount.sub(initialClientAmount)).to.equal(stake);
            expect(middleTotalStake.sub(initialTotalStake)).to.equal(stake);

            // First withdraw half of deposit
            // Claim reward as well
            expect(await staking.connect(clientAcc1).withdraw(stake.div(2)))
                .to.emit(staking, "Withdraw")
                .withArgs(anyValue, anyValue);

            middleStakingBalance = await odeum.balanceOf(staking.address);
            middleClientBalance = await odeum.balanceOf(clientAcc1.address);
            middleClientAmount = (await staking.userInfo(clientAcc1.address))
                .amount;
            middleTotalStake = await staking.totalStake();

            // Claiming reward transfers tokens received from tipping to the client. That's why
            // half of deposit is left
            expect(middleStakingBalance.sub(initialStakingBalance)).to.eq(
                stake.div(2)
            );
            expect(initialClientBalance.sub(middleClientBalance)).to.be.lt(
                stake.div(2)
            );
            expect(middleClientAmount.sub(initialClientAmount)).to.equal(
                stake.div(2)
            );
            expect(middleTotalStake.sub(initialTotalStake)).to.equal(
                stake.div(2)
            );

            // Withdraw second half of deposit now
            expect(await staking.connect(clientAcc1).withdraw(stake.div(2)))
                .to.emit(staking, "Withdraw")
                .withArgs(anyValue, anyValue);

            let endStakingBalance = await odeum.balanceOf(staking.address);
            let endClientBalance = await odeum.balanceOf(clientAcc1.address);
            let endClientAmount = (await staking.userInfo(clientAcc1.address))
                .amount;
            let endTotalStake = await staking.totalStake();

            // Part from tipping still stays on stakind balance
            // making initial and end balance unequal
            expect(endStakingBalance).to.eq(initialStakingBalance);
            // Client received some profit from transfer through Tipping.
            expect(endClientBalance).to.be.gt(initialClientBalance);
            expect(endClientAmount).to.equal(initialClientAmount);
            expect(endTotalStake).to.equal(initialTotalStake);
        });

        it("Should not update stats when withdrawing zero amount", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let stake = parseEther("500");
            await odeum.connect(clientAcc1).approve(staking.address, stake);
            await staking.connect(clientAcc1).deposit(stake);

            let initialStakingBalance = await odeum.balanceOf(staking.address);
            let initialClientBalance = await odeum.balanceOf(
                clientAcc1.address
            );
            let initialClientAmount = (
                await staking.userInfo(clientAcc1.address)
            ).amount;
            let initialTotalStake = await staking.totalStake();

            await staking.connect(clientAcc1).withdraw(parseEther("0"));

            let endStakingBalance = await odeum.balanceOf(staking.address);
            let endClientBalance = await odeum.balanceOf(clientAcc1.address);
            let endClientAmount = (await staking.userInfo(clientAcc1.address))
                .amount;
            let endTotalStake = await staking.totalStake();

            expect(endStakingBalance).to.eq(initialStakingBalance);
            expect(initialClientBalance).to.eq(endClientBalance);
            expect(endClientAmount).to.eq(initialClientAmount);
            expect(endTotalStake).to.eq(initialTotalStake);
        });

        it("Should fail to withdraw if not deposit was made", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            await expect(
                staking.connect(clientAcc1).withdraw(parseEther("500"))
            ).to.be.revertedWith("Staking: Too high withdraw amount!");
        });
    });

    describe("Emergency withdraw", () => {
        it("Should do an emergency withdraw and update stats", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let stake = parseEther("500");
            await odeum.connect(clientAcc1).approve(staking.address, stake);
            await staking.connect(clientAcc1).deposit(stake);

            let initialStakingBalance = await odeum.balanceOf(staking.address);
            let initialClientBalance = await odeum.balanceOf(
                clientAcc1.address
            );
            let initialClientAmount = (
                await staking.userInfo(clientAcc1.address)
            ).amount;
            let initialTotalStake = await staking.totalStake();
            let initialStakersLength = await staking.getStakersCount();

            await expect(await staking.connect(clientAcc1).emergencyWithdraw())
                .to.emit(staking, "EmergencyWithdraw")
                .withArgs(anyValue, anyValue);

            let endStakingBalance = await odeum.balanceOf(staking.address);
            let endClientBalance = await odeum.balanceOf(clientAcc1.address);
            let endClientAmount = (await staking.userInfo(clientAcc1.address))
                .amount;
            let endTotalStake = await staking.totalStake();
            let endStakersLength = await staking.getStakersCount();

            expect(initialStakingBalance.sub(endStakingBalance)).to.eq(stake);
            expect(endStakingBalance).to.eq(0);
            expect(endClientBalance.sub(initialClientBalance)).to.eq(stake);
            expect(initialClientAmount.sub(endClientAmount)).to.eq(stake);
            expect(endClientAmount).to.eq(0);
            expect(initialTotalStake.sub(endTotalStake)).to.eq(stake);
            expect(endTotalStake).to.eq(0);
            expect(initialStakersLength.sub(endStakersLength)).to.eq(1);
            expect(endStakersLength).to.eq(0);
        });
    });

    describe("Claim", () => {
        it("Should claim pending reward and update stats", async () => {
            let { odeum, staking, tipping } = await loadFixture(deploys);

            let stake = parseEther("50");
            await odeum
                .connect(clientAcc1)
                .approve(staking.address, stake.mul(5));
            let tip = parseEther("10");
            await odeum.connect(ownerAcc).approve(tipping.address, tip);

            // No reward for client yet. `odeumPerShare` not set yet
            await staking.connect(clientAcc1).deposit(stake);
            // `odeumPerShare` gets calculated on transfer
            await tipping.connect(ownerAcc).tip(clientAcc2.address, tip);

            let initialStakingBalance = await odeum.balanceOf(staking.address);
            let initialClientBalance = await odeum.balanceOf(
                clientAcc1.address
            );
            let initialReward = await staking.getAvailableReward(
                clientAcc1.address
            );

            // Next claim will calculate and claim the reward
            await expect(staking.connect(clientAcc1).claim())
                .to.emit(staking, "Claim")
                .withArgs(anyValue, anyValue);
            // Now no reward should be available

            let endStakingBalance = await odeum.balanceOf(staking.address);
            let endClientBalance = await odeum.balanceOf(clientAcc1.address);
            let endReward = await staking.getAvailableReward(
                clientAcc1.address
            );

            expect(initialStakingBalance.sub(endStakingBalance)).to.eq(
                initialReward
            );
            expect(endClientBalance.sub(initialClientBalance)).to.eq(
                initialReward
            );
            expect(endReward).to.eq(0);
        });
    });
});
