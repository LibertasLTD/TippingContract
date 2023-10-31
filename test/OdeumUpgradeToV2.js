const { ethers } = require("hardhat");
const { expect, anyValue } = require("chai");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");
const nonfungiblePositionManagerArtifact = require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json");
const dexFactoryV3Artifact = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json");
const dexPoolV3Artifact = require("@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json");
const quoterV3Artifact = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/IQuoter.sol/IQuoter.json");
const { TickMath } = require("@uniswap/v3-sdk");
const { BigNumber } = require("ethers");
const { parseUnits, parseEther } = ethers.utils;
const zeroAddress = ethers.constants.AddressZero;

const dexRouterV2Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
const dexRouterV3Address = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

describe("Odeum token", () => {
    // Deploy all contracts before each test suite
    async function deploys() {
        [ownerAcc, poolAcc, clientAcc1, clientAcc2] = await ethers.getSigners();

        let odeumTx = await ethers.getContractFactory("contracts/OdeumArbitrum.sol:Odeum");
        let odeum = await upgrades.deployProxy(odeumTx, [
            ownerAcc.address,
            poolAcc.address,
            dexRouterV3Address
        ], {
            initializer: "configure",
            kind: "uups",
        });
        await odeum.deployed();

        let newImpl = await ethers.getContractFactory("contracts/OdeumArbitrumV2.sol:Odeum");

        let newImplAddress = await upgrades.prepareUpgrade(
            odeum.address,
            newImpl,
            {
                kind: "uups",
            }
        );
        // Actually make an upgrade
        await upgrades.upgradeProxy(odeum.address, newImpl, {
            kind: "uups",
        });
        newImpl.attach(newImplAddress);

        odeum = await ethers.getContractAt("contracts/OdeumArbitrumV2.sol:Odeum", odeum.address);
        await odeum.setDexRouter(dexRouterV2Address);

        let tokenTx = await ethers.getContractFactory("MockToken");
        let token = await tokenTx.deploy();

        const dexRouterV2 = await ethers.getContractAt("IUniswapV2Router02", dexRouterV2Address);

        let liquidityAmount = parseEther("1000");
        await token.mint(ownerAcc.address, liquidityAmount.mul(BigNumber.from(2)));
        await token.approve(dexRouterV2Address, liquidityAmount);
        await odeum.approve(dexRouterV2Address, liquidityAmount);

        await dexRouterV2.addLiquidity(
            odeum.address,
            token.address,
            liquidityAmount,
            liquidityAmount,
            0,
            0,
            ownerAcc.address,
            await time.latest() + 10000
        );

        let dexFactoryV2 = await ethers.getContractAt("IUniswapV2Factory", await dexRouterV2.factory());
        let pairV2Address = await dexFactoryV2.getPair(odeum.address, token.address);

        return {
            odeum,
            token,
            dexRouterV2,
            dexFactoryV2,
            pairV2Address
        };
    }

    async function swapV2(dexRouter, tokenIn, tokenOut, amountIn, receiver) {
        await tokenIn.connect(receiver).approve(dexRouter.address, amountIn);
        await dexRouter.connect(receiver).swapExactTokensForTokensSupportingFeeOnTransferTokens(
            amountIn,
            0,
            [tokenIn.address, tokenOut.address],
            receiver.address,
            await time.latest() + 10000
        );
    }

    describe("Upgrade", () => {
        it("Should have a correct name", async () => {
            let { odeum } = await loadFixture(deploys);
            expect(await odeum.name()).to.equal("ODEUM");
        });

        it("Should have a correct symbol", async () => {
            let { odeum } = await loadFixture(deploys);
            expect(await odeum.symbol()).to.equal("ODEUM");
        });

        it("Should have correct decimals", async () => {
            let { odeum } = await loadFixture(deploys);
            expect(await odeum.decimals()).to.equal(18);
        });

        it("Should have correct dex address", async () => {
            let { odeum } = await loadFixture(deploys);
            expect(await odeum.dexRouter()).to.equal(dexRouterV2Address);
        });

        it("Should have a correct total supply", async () => {
            let { odeum } = await loadFixture(deploys);
            expect(await odeum.totalSupply()).to.equal(
                // 100 Million of tokens with 18 decimals each
                ethers.BigNumber.from("100000000").mul(
                    ethers.BigNumber.from("1000000000000000000")
                )
            );
        });

        it("Should have a correct balances", async () => {
            let { odeum } = await loadFixture(deploys);
            expect(await odeum.balanceOf(ownerAcc.address)).to.equal(
                ethers.BigNumber.from("89999000").mul(
                    ethers.BigNumber.from("1000000000000000000")
                )
            );
            expect(await odeum.balanceOf(poolAcc.address)).to.equal(
                ethers.BigNumber.from("10000000").mul(
                    ethers.BigNumber.from("1000000000000000000")
                )
            );
        });

        it("Should be excluded from fee", async () => {
            let { odeum } = await loadFixture(deploys);
            expect(await odeum.isAccountExcludedFromFee(odeum.address)).to.be.true;
        });

        it("Should revert reinitialization", async () => {
            let { odeum, dexRouterV2 } = await loadFixture(deploys);
            await expect(odeum.configure(
                ownerAcc.address,
                poolAcc.address,
                dexRouterV2.address
            )).to.be.revertedWith("Initializable: contract is already initialized");
        });
    });

    describe("DexRouter", () => {
        it("Should set dexRouter address", async () => {
            let { odeum } = await loadFixture(deploys);

            expect(await odeum.dexRouter()).to.be.equal(dexRouterV2Address);
            await expect(odeum.setDexRouter(dexRouterV3Address)).to.be.emit(odeum, "DexRouterChanged").withArgs(dexRouterV3Address);
            expect(await odeum.dexRouter()).to.be.equal(dexRouterV3Address);
        });

        it("Should revert set dexRouter address to zero", async () => {
            let { odeum } = await loadFixture(deploys);

            await expect(odeum.setDexRouter(zeroAddress)).to.be.revertedWith("Odeum: the address must not be null");
        });

        it("Should revert set dexRouter address by not owner", async () => {
            let { odeum } = await loadFixture(deploys);

            await expect(odeum.connect(clientAcc1).setDexRouter(dexRouterV3Address)).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });

    describe("Burn", () => {
        it("Should increase burnt tokens counter", async () => {
            let { odeum } = await loadFixture(deploys);
            let startBurnt = await odeum.totalBurnt();
            let startSupply = await odeum.totalSupply();
            let burnAmount = parseEther("10");
            await odeum.connect(ownerAcc).transfer(zeroAddress, burnAmount);
            let endBurnt = await odeum.totalBurnt();
            let endSupply = await odeum.totalSupply();
            expect(endBurnt).to.equal(burnAmount);
            expect(endBurnt.sub(startBurnt)).to.equal(burnAmount);
            expect(startSupply.sub(endSupply)).to.equal(burnAmount);
        });
    });

    describe("Fee", () => {
        describe("Include/Exclude pair", () => {
            it("Should include pair in fee", async () => {
                let { odeum } = await loadFixture(deploys);
                let pair = clientAcc1;
    
                expect(await odeum.isPairIncludedInFee(pair.address)).to.be.false;
    
                await expect(odeum.includePairInFee(pair.address))
                    .to.be.emit(odeum, "PairIncludedInFee").withArgs(pair.address);
                
                expect(await odeum.isPairIncludedInFee(pair.address)).to.be.true;
            });
    
            it("Should exclude pair from fee", async () => {
                let { odeum } = await loadFixture(deploys);
                let pair = clientAcc1;
    
                await odeum.includePairInFee(pair.address);
                
                expect(await odeum.isPairIncludedInFee(pair.address)).to.be.true;
    
                await expect(odeum.excludePairFromFee(pair.address))
                    .to.be.emit(odeum, "PairExcludedfromFee").withArgs(pair.address);
    
                expect(await odeum.isPairIncludedInFee(pair.address)).to.be.false;
            });

            it("Should revert include zero address in fee", async () => {
                let { odeum } = await loadFixture(deploys);
    
                await expect(odeum.includePairInFee(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert include included pair in fee", async () => {
                let { odeum } = await loadFixture(deploys);
                let pair = clientAcc1;
                await odeum.includePairInFee(pair.address);

                await expect(odeum.includePairInFee(pair.address))
                    .to.be.revertedWith("Odeum: pair already included in fee");
            });

            it("Should revert include pair in fee by not owner", async () => {
                let { odeum, pairV2Address } = await loadFixture(deploys);
    
                await expect(odeum.connect(clientAcc1).includePairInFee(pairV2Address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should revert exclude pair from fee", async () => {
                let { odeum } = await loadFixture(deploys);
    
                await expect(odeum.excludePairFromFee(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert exclude excluded pair from fee", async () => {
                let { odeum } = await loadFixture(deploys);
                let pair = clientAcc1;

                await expect(odeum.excludePairFromFee(pair.address))
                    .to.be.revertedWith("Odeum: pair already excluded from fee");
            });

            it("Should revert exclude pair from fee by not owner", async () => {
                let { odeum, pairV2Address } = await loadFixture(deploys);
    
                await expect(odeum.connect(clientAcc1).excludePairFromFee(pairV2Address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("Include/Exclude account", () => {
            it("Should include account in fee", async () => {
                let { odeum } = await loadFixture(deploys);
                await odeum.excludeAccountFromFee(clientAcc1.address);

                expect(await odeum.isAccountExcludedFromFee(clientAcc1.address)).to.be.true;
    
                await expect(odeum.includeAccountInFee(clientAcc1.address))
                    .to.be.emit(odeum, "AccountIncludedInFee").withArgs(clientAcc1.address);
                
                expect(await odeum.isAccountExcludedFromFee(clientAcc1.address)).to.be.false;
            });

            it("Should exclude account from fee", async () => {
                let { odeum } = await loadFixture(deploys);

                expect(await odeum.isAccountExcludedFromFee(clientAcc1.address)).to.be.false;
    
                await expect(odeum.excludeAccountFromFee(clientAcc1.address))
                    .to.be.emit(odeum, "AccountExcludedFromFee").withArgs(clientAcc1.address);
                
                expect(await odeum.isAccountExcludedFromFee(clientAcc1.address)).to.be.true;
            });

            it("Should revert include account in fee for zero address", async () => {
                let { odeum } = await loadFixture(deploys);
    
                await expect(odeum.includeAccountInFee(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert exclude account from fee for zero address", async () => {
                let { odeum } = await loadFixture(deploys);
    
                await expect(odeum.excludeAccountFromFee(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert include account in fee if already included", async () => {
                let { odeum } = await loadFixture(deploys);
    
                await expect(odeum.includeAccountInFee(clientAcc1.address))
                    .to.be.revertedWith("Odeum: account already included in fee");
            });

            it("Should revert exclude account in fee if already excluded", async () => {
                let { odeum } = await loadFixture(deploys);
                await odeum.excludeAccountFromFee(clientAcc1.address);
    
                await expect(odeum.excludeAccountFromFee(clientAcc1.address))
                    .to.be.revertedWith("Odeum: account already excluded from fee");
            });

            it("Should revert include account in fee if called by not owner", async () => {
                let { odeum } = await loadFixture(deploys);
    
                await expect(odeum.connect(clientAcc1).includeAccountInFee(clientAcc1.address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should revert exclude account from fee if called by not owner", async () => {
                let { odeum } = await loadFixture(deploys);
    
                await expect(odeum.connect(clientAcc1).excludeAccountFromFee(clientAcc1.address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("Set tax withdraw token", () => {
            it("Should set tax withdraw token", async () => {
                let { odeum, token } = await loadFixture(deploys);

                expect(await odeum.taxWithdrawToken()).to.be.equal(zeroAddress);

                await expect(odeum.setTaxWithdrawToken(token.address))
                    .to.be.emit(odeum, "TaxWithdrawTokenSet").withArgs(token.address);

                expect(await odeum.taxWithdrawToken()).to.be.equal(token.address);
            });

            it("Should set tax withdraw poolFee for V3", async () => {
                let { odeum, token } = await loadFixture(deploys);

                expect(await odeum.taxWithdrawPoolFee()).to.be.equal(0);

                await expect(odeum.setTaxWithdrawPoolFee(3000))
                    .to.be.emit(odeum, "TaxWithdrawPoolFeeSet").withArgs(3000);

                expect(await odeum.taxWithdrawPoolFee()).to.be.equal(3000);
            });

            it("Should revert set tax withdraw token address zero", async () => {
                let { odeum, token } = await loadFixture(deploys);

                await expect(odeum.setTaxWithdrawToken(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert set tax withdraw token if called by not owner", async () => {
                let { odeum, token } = await loadFixture(deploys);

                await expect(odeum.connect(clientAcc1).setTaxWithdrawToken(token.address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should revert set tax withdraw poolFee zero for V3", async () => {
                let { odeum, token } = await loadFixture(deploys);

                await expect(odeum.setTaxWithdrawPoolFee(0))
                    .to.be.revertedWith("Odeum: poolFee must not be null");
            });
        });

        describe("Collect", () => {
            it("Should collect fee on sell", async () => {
                let { odeum, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeum.includePairInFee(pairV2Address);

                let sellAmount = parseEther("1");
                let expectedFeeAmount = sellAmount.mul(await odeum.taxFee()).div(await odeum.MAX_BP());

                let ownerBalanceBefore = await odeum.balanceOf(ownerAcc.address);
                let pairBalanceBefore = await odeum.balanceOf(pairV2Address);
                let odeumBalanceBefore = await odeum.balanceOf(odeum.address);

                await swapV2(dexRouterV2, odeum, token, sellAmount, ownerAcc);

                expect(await odeum.collectedFee()).to.be.equal(expectedFeeAmount);
                expect(await odeum.balanceOf(odeum.address)).to.be.equal(odeumBalanceBefore.add(expectedFeeAmount));
                expect(await odeum.balanceOf(ownerAcc.address)).to.be.equal(ownerBalanceBefore.sub(sellAmount));
                expect(await odeum.balanceOf(pairV2Address)).to.be.equal(pairBalanceBefore.add(sellAmount.sub(expectedFeeAmount)));
            })

            it("Should collect fee on buy", async () => {
                let { odeum, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeum.includePairInFee(pairV2Address);

                let buyAmount = parseEther("1");
                await token.mint(clientAcc2.address, buyAmount);
                let expectedOdeumAmount = await dexRouterV2.getAmountOut(
                    buyAmount,
                    await odeum.balanceOf(pairV2Address),
                    await token.balanceOf(pairV2Address)
                );
                let expectedFeeAmount = expectedOdeumAmount.mul(await odeum.taxFee()).div(await odeum.MAX_BP());

                let clientBalanceBefore = await odeum.balanceOf(clientAcc2.address);
                let pairBalanceBefore = await odeum.balanceOf(pairV2Address);
                let odeumBalanceBefore = await odeum.balanceOf(odeum.address);

                await swapV2(dexRouterV2, token, odeum, buyAmount, clientAcc2);

                expect(await odeum.collectedFee()).to.be.equal(expectedFeeAmount);
                expect(await odeum.balanceOf(odeum.address)).to.be.equal(odeumBalanceBefore.add(expectedFeeAmount));
                expect(await odeum.balanceOf(clientAcc2.address)).to.be.equal(clientBalanceBefore.add(expectedOdeumAmount.sub(expectedFeeAmount)));
                expect(await odeum.balanceOf(pairV2Address)).to.be.equal(pairBalanceBefore.sub(expectedOdeumAmount));
            })

            it("Should not take fee on sell for excluded account", async () => {
                let { odeum, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeum.includePairInFee(pairV2Address);
                await odeum.excludeAccountFromFee(clientAcc1.address);

                let sellAmount = parseEther("1");
                await odeum.transfer(clientAcc1.address, sellAmount);

                let clientBalanceBefore = await odeum.balanceOf(clientAcc1.address);
                let pairBalanceBefore = await odeum.balanceOf(pairV2Address);
                let odeumBalanceBefore = await odeum.balanceOf(odeum.address);

                await swapV2(dexRouterV2, odeum, token, sellAmount, clientAcc1);

                expect(await odeum.collectedFee()).to.be.equal(0);
                expect(await odeum.balanceOf(odeum.address)).to.be.equal(odeumBalanceBefore);
                expect(await odeum.balanceOf(clientAcc1.address)).to.be.equal(clientBalanceBefore.sub(sellAmount));
                expect(await odeum.balanceOf(pairV2Address)).to.be.equal(pairBalanceBefore.add(sellAmount));
            })

            it("Should not take fee on buy for excluded account", async () => {
                let { odeum, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeum.includePairInFee(pairV2Address);
                await odeum.excludeAccountFromFee(clientAcc2.address);

                let buyAmount = parseEther("1");
                await token.mint(clientAcc2.address, buyAmount);
                let expectedOdeumAmount = await dexRouterV2.getAmountOut(
                    buyAmount,
                    await odeum.balanceOf(pairV2Address),
                    await token.balanceOf(pairV2Address)
                );

                let clientBalanceBefore = await odeum.balanceOf(clientAcc2.address);
                let pairBalanceBefore = await odeum.balanceOf(pairV2Address);
                let odeumBalanceBefore = await odeum.balanceOf(odeum.address);

                await swapV2(dexRouterV2, token, odeum, buyAmount, clientAcc2);

                expect(await odeum.collectedFee()).to.be.equal(0);
                expect(await odeum.balanceOf(odeum.address)).to.be.equal(odeumBalanceBefore);
                expect(await odeum.balanceOf(clientAcc2.address)).to.be.equal(clientBalanceBefore.add(expectedOdeumAmount));
                expect(await odeum.balanceOf(pairV2Address)).to.be.equal(pairBalanceBefore.sub(expectedOdeumAmount));
            })

            it("Should revert take fee on sell if not anought tokens", async () => {
                let { odeum, dexRouterV2, token } = await loadFixture(deploys);
                let pair = clientAcc2;
                await odeum.includePairInFee(pair.address);

                let sellAmount = parseEther("1");
                await odeum.transfer(clientAcc1.address, sellAmount);

                await expect(odeum.connect(clientAcc1).transfer(pair.address, sellAmount.mul(BigNumber.from(2)))).to.be.revertedWith(
                    "Odeum: transfer amount exceeds balance"
                );
            })

            it("Should revert transfer if not anought tokens", async () => {
                let { odeum, dexRouterV2, token } = await loadFixture(deploys);
                let pair = clientAcc2;
                await odeum.includePairInFee(pair.address);

                let sellAmount = parseEther("1");

                await expect(odeum.connect(clientAcc1).transfer(pair.address, sellAmount)).to.be.revertedWith(
                    "Odeum: transfer amount exceeds balance"
                );
            })
        });

        describe("Withdraw", () => {
            it("Should withdraw fee", async () => {
                let { odeum, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeum.includePairInFee(pairV2Address);
                await odeum.setTaxWithdrawToken(token.address);

                let sellAmount = parseEther("1");
                await swapV2(dexRouterV2, odeum, token, sellAmount, ownerAcc);

                let odeumWithdrawAmount = await odeum.collectedFee();
                let expectedTokenAmount = await dexRouterV2.getAmountOut(
                    odeumWithdrawAmount,
                    await odeum.balanceOf(pairV2Address),
                    await token.balanceOf(pairV2Address)
                );

                let ownerTokenBalanceBefore = await token.balanceOf(ownerAcc.address);

                await expect(odeum.withdrawFee())
                    .to.be.emit(odeum, "FeeWithdrawn").withArgs(
                        odeumWithdrawAmount,
                        expectedTokenAmount
                    );

                expect(await token.balanceOf(ownerAcc.address)).to.be.equal(ownerTokenBalanceBefore.add(expectedTokenAmount));
                expect(await token.balanceOf(odeum.address)).to.be.equal(0);
                expect(await odeum.balanceOf(odeum.address)).to.be.equal(0);
                expect(await odeum.collectedFee()).to.be.equal(0);
            });

            it("Should withdraw fee with odeum token", async () => {
                let { odeum, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeum.includePairInFee(pairV2Address);
                await odeum.setTaxWithdrawToken(odeum.address);

                let sellAmount = parseEther("1");
                await swapV2(dexRouterV2, odeum, token, sellAmount, ownerAcc);

                let odeumWithdrawAmount = await odeum.collectedFee();

                let ownerTokenBalanceBefore = await odeum.balanceOf(ownerAcc.address);

                await expect(odeum.withdrawFee())
                    .to.be.emit(odeum, "FeeWithdrawn").withArgs(
                        odeumWithdrawAmount,
                        odeumWithdrawAmount
                    );

                expect(await odeum.balanceOf(ownerAcc.address)).to.be.equal(ownerTokenBalanceBefore.add(odeumWithdrawAmount));
                expect(await token.balanceOf(odeum.address)).to.be.equal(0);
                expect(await odeum.balanceOf(odeum.address)).to.be.equal(0);
                expect(await odeum.collectedFee()).to.be.equal(0);
            });

            it("Should revert withdraw fee if called by not owner for V2", async () => {
                let { odeum } = await loadFixture(deploys);

                await expect(odeum.connect(clientAcc1).withdrawFee())
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should revert withdraw fee if withdraw token not setted", async () => {
                let { odeum } = await loadFixture(deploys);

                await expect(odeum.withdrawFee())
                    .to.be.revertedWith("Odeum: taxWithdrawToken not set");
            });

            it("Should revert withdraw fee if no collected tokens", async () => {
                let { odeum, token } = await loadFixture(deploys);
                await odeum.setTaxWithdrawToken(token.address);

                await expect(odeum.withdrawFee())
                    .to.be.revertedWith("Odeum: no tokens to withdraw");
            });
        });
    });
});
