const { ethers } = require("hardhat");
const { expect, anyValue } = require("chai");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const { BigNumber } = require("ethers");
const { parseUnits, parseEther } = ethers.utils;
const zeroAddress = ethers.constants.AddressZero;

const dexRouterV2Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

describe("Odeum token", () => {
    // Deploy all contracts before each test suite
    async function deploys() {
        [ownerAcc, poolAcc, clientAcc1, clientAcc2] = await ethers.getSigners();

        let odeumV3Tx = await ethers.getContractFactory("OdeumV3");
        let odeumV3 = await odeumV3Tx.deploy(
            ownerAcc.address,
            poolAcc.address,
            dexRouterV2Address
        );
        await odeumV3.deployed();

        let tokenTx = await ethers.getContractFactory("MockToken");
        let token = await tokenTx.deploy();

        const dexRouterV2 = await ethers.getContractAt("IUniswapV2Router02", dexRouterV2Address);

        let liquidityAmount = parseEther("1000");
        await token.mint(ownerAcc.address, liquidityAmount.mul(BigNumber.from(2)));
        await token.approve(dexRouterV2Address, liquidityAmount);
        await odeumV3.approve(dexRouterV2Address, liquidityAmount);

        await dexRouterV2.addLiquidity(
            odeumV3.address,
            token.address,
            liquidityAmount,
            liquidityAmount,
            0,
            0,
            ownerAcc.address,
            await time.latest() + 10000
        );

        let dexFactoryV2 = await ethers.getContractAt("IUniswapV2Factory", await dexRouterV2.factory());
        let pairV2Address = await dexFactoryV2.getPair(odeumV3.address, token.address);

        return {
            odeumV3,
            token,
            dexRouterV2,
            dexFactoryV2,
            pairV2Address,
        };
    }

    async function swapV2(dexRouter, tokenIn, tokenOut, amountIn, receiver) {
        await tokenIn.connect(receiver).approve(dexRouter.address, amountIn);
        await dexRouter.connect(receiver).swapExactTokensForTokens(
            amountIn,
            0,
            [tokenIn.address, tokenOut.address],
            receiver.address,
            await time.latest() + 10000
        );
    }

    describe("Deployment", () => {
        it("Should have a correct name", async () => {
            let { odeumV3 } = await loadFixture(deploys);
            expect(await odeumV3.name()).to.equal("ODEUM");
        });

        it("Should have a correct symbol", async () => {
            let { odeumV3 } = await loadFixture(deploys);
            expect(await odeumV3.symbol()).to.equal("ODEUM");
        });

        it("Should have correct decimals", async () => {
            let { odeumV3 } = await loadFixture(deploys);
            expect(await odeumV3.decimals()).to.equal(18);
        });

        it("Should have correct dex address", async () => {
            let { odeumV3 } = await loadFixture(deploys);
            expect(await odeumV3.dexRouter()).to.equal(dexRouterV2Address);
        });

        it("Should have a correct total supply", async () => {
            let { odeumV3 } = await loadFixture(deploys);
            expect(await odeumV3.totalSupply()).to.equal(
                // 100 Million of tokens with 18 decimals each
                ethers.BigNumber.from("100000000").mul(
                    ethers.BigNumber.from("1000000000000000000")
                )
            );
        });

        it("Should be excluded from fee", async () => {
            let { odeumV3 } = await loadFixture(deploys);
            expect(await odeumV3.isAccountExcludedFromFee(odeumV3.address)).to.be.true;
        });

        it("Should revert if dexRouter is zero", async () => {
            let odeumV3Tx = await ethers.getContractFactory("OdeumV3");
            await expect(odeumV3Tx.deploy(
                ownerAcc.address,
                poolAcc.address,
                zeroAddress
            )).to.be.revertedWith("Odeum: the address must not be null");
        });
    });

    describe("Burn", () => {
        it("Should increase burnt tokens counter", async () => {
            let { odeumV3 } = await loadFixture(deploys);
            let startBurnt = await odeumV3.totalBurnt();
            let startSupply = await odeumV3.totalSupply();
            let burnAmount = parseEther("10");
            await odeumV3.connect(ownerAcc).transfer(zeroAddress, burnAmount);
            let endBurnt = await odeumV3.totalBurnt();
            let endSupply = await odeumV3.totalSupply();
            expect(endBurnt).to.equal(burnAmount);
            expect(endBurnt.sub(startBurnt)).to.equal(burnAmount);
            expect(startSupply.sub(endSupply)).to.equal(burnAmount);
        });
    });

    describe("Fee", () => {
        describe("Include/Exclude pair", () => {
            it("Should include pair in fee", async () => {
                let { odeumV3 } = await loadFixture(deploys);
                let pair = clientAcc1;
    
                expect(await odeumV3.isPairIncludedInFee(pair.address)).to.be.false;
    
                await expect(odeumV3.includePairInFee(pair.address))
                    .to.be.emit(odeumV3, "PairIncludedInFee").withArgs(pair.address);
                
                expect(await odeumV3.isPairIncludedInFee(pair.address)).to.be.true;
            });
    
            it("Should exclude pair from fee", async () => {
                let { odeumV3 } = await loadFixture(deploys);
                let pair = clientAcc1;
    
                await odeumV3.includePairInFee(pair.address);
                
                expect(await odeumV3.isPairIncludedInFee(pair.address)).to.be.true;
    
                await expect(odeumV3.excludePairFromFee(pair.address))
                    .to.be.emit(odeumV3, "PairExcludedfromFee").withArgs(pair.address);
    
                expect(await odeumV3.isPairIncludedInFee(pair.address)).to.be.false;
            });

            it("Should revert include zero address in fee", async () => {
                let { odeumV3 } = await loadFixture(deploys);
    
                await expect(odeumV3.includePairInFee(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert include included pair in fee", async () => {
                let { odeumV3 } = await loadFixture(deploys);
                let pair = clientAcc1;
                await odeumV3.includePairInFee(pair.address);

                await expect(odeumV3.includePairInFee(pair.address))
                    .to.be.revertedWith("Odeum: pair already included in fee");
            });

            it("Should revert include pair in fee by not owner", async () => {
                let { odeumV3, pairV2Address } = await loadFixture(deploys);
    
                await expect(odeumV3.connect(clientAcc1).includePairInFee(pairV2Address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should revert exclude pair from fee", async () => {
                let { odeumV3 } = await loadFixture(deploys);
    
                await expect(odeumV3.excludePairFromFee(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert exclude excluded pair from fee", async () => {
                let { odeumV3 } = await loadFixture(deploys);
                let pair = clientAcc1;

                await expect(odeumV3.excludePairFromFee(pair.address))
                    .to.be.revertedWith("Odeum: pair already excluded from fee");
            });

            it("Should revert exclude pair from fee by not owner", async () => {
                let { odeumV3, pairV2Address } = await loadFixture(deploys);
    
                await expect(odeumV3.connect(clientAcc1).excludePairFromFee(pairV2Address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("Include/Exclude account", () => {
            it("Should include account in fee", async () => {
                let { odeumV3 } = await loadFixture(deploys);
                await odeumV3.excludeAccountFromFee(clientAcc1.address);

                expect(await odeumV3.isAccountExcludedFromFee(clientAcc1.address)).to.be.true;
    
                await expect(odeumV3.includeAccountInFee(clientAcc1.address))
                    .to.be.emit(odeumV3, "AccountIncludedInFee").withArgs(clientAcc1.address);
                
                expect(await odeumV3.isAccountExcludedFromFee(clientAcc1.address)).to.be.false;
            });

            it("Should exclude account from fee", async () => {
                let { odeumV3 } = await loadFixture(deploys);

                expect(await odeumV3.isAccountExcludedFromFee(clientAcc1.address)).to.be.false;
    
                await expect(odeumV3.excludeAccountFromFee(clientAcc1.address))
                    .to.be.emit(odeumV3, "AccountExcludedFromFee").withArgs(clientAcc1.address);
                
                expect(await odeumV3.isAccountExcludedFromFee(clientAcc1.address)).to.be.true;
            });

            it("Should revert include account in fee for zero address", async () => {
                let { odeumV3 } = await loadFixture(deploys);
    
                await expect(odeumV3.includeAccountInFee(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert exclude account from fee for zero address", async () => {
                let { odeumV3 } = await loadFixture(deploys);
    
                await expect(odeumV3.excludeAccountFromFee(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert include account in fee if already included", async () => {
                let { odeumV3 } = await loadFixture(deploys);
    
                await expect(odeumV3.includeAccountInFee(clientAcc1.address))
                    .to.be.revertedWith("Odeum: account already included in fee");
            });

            it("Should revert exclude account in fee if already excluded", async () => {
                let { odeumV3 } = await loadFixture(deploys);
                await odeumV3.excludeAccountFromFee(clientAcc1.address);
    
                await expect(odeumV3.excludeAccountFromFee(clientAcc1.address))
                    .to.be.revertedWith("Odeum: account already excluded from fee");
            });

            it("Should revert include account in fee if called by not owner", async () => {
                let { odeumV3 } = await loadFixture(deploys);
    
                await expect(odeumV3.connect(clientAcc1).includeAccountInFee(clientAcc1.address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should revert exclude account from fee if called by not owner", async () => {
                let { odeumV3 } = await loadFixture(deploys);
    
                await expect(odeumV3.connect(clientAcc1).excludeAccountFromFee(clientAcc1.address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("Set tax withdraw token", () => {
            it("Should set tax withdraw token", async () => {
                let { odeumV3, token } = await loadFixture(deploys);

                expect(await odeumV3.taxWithdrawToken()).to.be.equal(zeroAddress);

                await expect(odeumV3.setTaxWithdrawToken(token.address))
                    .to.be.emit(odeumV3, "TaxWithdrawTokenSet").withArgs(token.address);

                expect(await odeumV3.taxWithdrawToken()).to.be.equal(token.address);
            });

            it("Should revert set tax withdraw token address zero", async () => {
                let { odeumV3, token } = await loadFixture(deploys);

                await expect(odeumV3.setTaxWithdrawToken(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert set tax withdraw token if called by not owner", async () => {
                let { odeumV3, token } = await loadFixture(deploys);

                await expect(odeumV3.connect(clientAcc1).setTaxWithdrawToken(token.address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("Collect", () => {
            it("Should collect fee on sell for V2", async () => {
                let { odeumV3, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeumV3.includePairInFee(pairV2Address);

                let sellAmount = parseEther("1");
                let expectedFeeAmount = sellAmount.mul(await odeumV3.taxFee()).div(await odeumV3.MAX_BP());

                let ownerBalanceBefore = await odeumV3.balanceOf(ownerAcc.address);
                let pairBalanceBefore = await odeumV3.balanceOf(pairV2Address);
                let odeumBalanceBefore = await odeumV3.balanceOf(odeumV3.address);

                await swapV2(dexRouterV2, odeumV3, token, sellAmount, ownerAcc);

                expect(await odeumV3.collectedFee()).to.be.equal(expectedFeeAmount);
                expect(await odeumV3.balanceOf(odeumV3.address)).to.be.equal(odeumBalanceBefore.add(expectedFeeAmount));
                expect(await odeumV3.balanceOf(ownerAcc.address)).to.be.equal(ownerBalanceBefore.sub(sellAmount.add(expectedFeeAmount)));
                expect(await odeumV3.balanceOf(pairV2Address)).to.be.equal(pairBalanceBefore.add(sellAmount));
            })

            it("Should collect fee on buy for V2", async () => {
                let { odeumV3, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeumV3.includePairInFee(pairV2Address);

                let buyAmount = parseEther("1");
                await token.mint(clientAcc2.address, buyAmount);
                let expectedOdeumAmount = await dexRouterV2.getAmountOut(
                    buyAmount,
                    await odeumV3.balanceOf(pairV2Address),
                    await token.balanceOf(pairV2Address)
                );
                let expectedFeeAmount = expectedOdeumAmount.mul(await odeumV3.taxFee()).div(await odeumV3.MAX_BP());

                let clientBalanceBefore = await odeumV3.balanceOf(clientAcc2.address);
                let pairBalanceBefore = await odeumV3.balanceOf(pairV2Address);
                let odeumBalanceBefore = await odeumV3.balanceOf(odeumV3.address);

                await swapV2(dexRouterV2, token, odeumV3, buyAmount, clientAcc2);

                expect(await odeumV3.collectedFee()).to.be.equal(expectedFeeAmount);
                expect(await odeumV3.balanceOf(odeumV3.address)).to.be.equal(odeumBalanceBefore.add(expectedFeeAmount));
                expect(await odeumV3.balanceOf(clientAcc2.address)).to.be.equal(clientBalanceBefore.add(expectedOdeumAmount.sub(expectedFeeAmount)));
                expect(await odeumV3.balanceOf(pairV2Address)).to.be.equal(pairBalanceBefore.sub(expectedOdeumAmount));
            })

            it("Should not take fee on sell for excluded account", async () => {
                let { odeumV3, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeumV3.includePairInFee(pairV2Address);
                await odeumV3.excludeAccountFromFee(clientAcc1.address);

                let sellAmount = parseEther("1");
                await odeumV3.transfer(clientAcc1.address, sellAmount);

                let clientBalanceBefore = await odeumV3.balanceOf(clientAcc1.address);
                let pairBalanceBefore = await odeumV3.balanceOf(pairV2Address);
                let odeumBalanceBefore = await odeumV3.balanceOf(odeumV3.address);

                await swapV2(dexRouterV2, odeumV3, token, sellAmount, clientAcc1);

                expect(await odeumV3.collectedFee()).to.be.equal(0);
                expect(await odeumV3.balanceOf(odeumV3.address)).to.be.equal(odeumBalanceBefore);
                expect(await odeumV3.balanceOf(clientAcc1.address)).to.be.equal(clientBalanceBefore.sub(sellAmount));
                expect(await odeumV3.balanceOf(pairV2Address)).to.be.equal(pairBalanceBefore.add(sellAmount));
            })

            it("Should not take fee on buy for excluded account", async () => {
                let { odeumV3, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeumV3.includePairInFee(pairV2Address);
                await odeumV3.excludeAccountFromFee(clientAcc2.address);

                let buyAmount = parseEther("1");
                await token.mint(clientAcc2.address, buyAmount);
                let expectedOdeumAmount = await dexRouterV2.getAmountOut(
                    buyAmount,
                    await odeumV3.balanceOf(pairV2Address),
                    await token.balanceOf(pairV2Address)
                );

                let clientBalanceBefore = await odeumV3.balanceOf(clientAcc2.address);
                let pairBalanceBefore = await odeumV3.balanceOf(pairV2Address);
                let odeumBalanceBefore = await odeumV3.balanceOf(odeumV3.address);

                await swapV2(dexRouterV2, token, odeumV3, buyAmount, clientAcc2);

                expect(await odeumV3.collectedFee()).to.be.equal(0);
                expect(await odeumV3.balanceOf(odeumV3.address)).to.be.equal(odeumBalanceBefore);
                expect(await odeumV3.balanceOf(clientAcc2.address)).to.be.equal(clientBalanceBefore.add(expectedOdeumAmount));
                expect(await odeumV3.balanceOf(pairV2Address)).to.be.equal(pairBalanceBefore.sub(expectedOdeumAmount));
            })

            it("Should revert transfer if not anought tokens", async () => {
                let { odeumV3, dexRouterV2, token } = await loadFixture(deploys);
                let pair = clientAcc2;
                await odeumV3.includePairInFee(pair.address);

                let sellAmount = parseEther("1");

                await expect(odeumV3.connect(clientAcc1).transfer(pair.address, sellAmount)).to.be.revertedWith(
                    "Odeum: transfer amount exceeds balance"
                );
            })
        });

        describe("Withdraw", () => {
            it("Should withdraw fee for V2", async () => {
                let { odeumV3, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeumV3.includePairInFee(pairV2Address);
                await odeumV3.setTaxWithdrawToken(token.address);

                let sellAmount = parseEther("1");
                await swapV2(dexRouterV2, odeumV3, token, sellAmount, ownerAcc);

                let odeumWithdrawAmount = await odeumV3.collectedFee();
                let expectedTokenAmount = await dexRouterV2.getAmountOut(
                    odeumWithdrawAmount,
                    await odeumV3.balanceOf(pairV2Address),
                    await token.balanceOf(pairV2Address)
                );

                let ownerTokenBalanceBefore = await token.balanceOf(ownerAcc.address);

                await expect(odeumV3.withdrawFee())
                    .to.be.emit(odeumV3, "FeeWithdrawn").withArgs(
                        odeumWithdrawAmount,
                        expectedTokenAmount
                    );

                expect(await token.balanceOf(ownerAcc.address)).to.be.equal(ownerTokenBalanceBefore.add(expectedTokenAmount));
                expect(await token.balanceOf(odeumV3.address)).to.be.equal(0);
                expect(await odeumV3.balanceOf(odeumV3.address)).to.be.equal(0);
                expect(await odeumV3.collectedFee()).to.be.equal(0);
            });

            it("Should withdraw fee with odeum token for V2", async () => {
                let { odeumV3, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeumV3.includePairInFee(pairV2Address);
                await odeumV3.setTaxWithdrawToken(odeumV3.address);

                let sellAmount = parseEther("1");
                await swapV2(dexRouterV2, odeumV3, token, sellAmount, ownerAcc);

                let odeumWithdrawAmount = await odeumV3.collectedFee();

                let ownerTokenBalanceBefore = await odeumV3.balanceOf(ownerAcc.address);

                await expect(odeumV3.withdrawFee())
                    .to.be.emit(odeumV3, "FeeWithdrawn").withArgs(
                        odeumWithdrawAmount,
                        odeumWithdrawAmount
                    );

                expect(await odeumV3.balanceOf(ownerAcc.address)).to.be.equal(ownerTokenBalanceBefore.add(odeumWithdrawAmount));
                expect(await token.balanceOf(odeumV3.address)).to.be.equal(0);
                expect(await odeumV3.balanceOf(odeumV3.address)).to.be.equal(0);
                expect(await odeumV3.collectedFee()).to.be.equal(0);
            });

            it("Should revert withdraw fee if called by not owner for V2", async () => {
                let { odeumV3 } = await loadFixture(deploys);

                await expect(odeumV3.connect(clientAcc1).withdrawFee())
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should revert withdraw fee if withdraw token not setted", async () => {
                let { odeumV3 } = await loadFixture(deploys);

                await expect(odeumV3.withdrawFee())
                    .to.be.revertedWith("Odeum: taxWithdrawToken not set");
            });

            it("Should revert withdraw fee if no collected tokens", async () => {
                let { odeumV3, token } = await loadFixture(deploys);
                await odeumV3.setTaxWithdrawToken(token.address);

                await expect(odeumV3.withdrawFee())
                    .to.be.revertedWith("Odeum: no tokens to withdraw");
            });
        });
    });
});
