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
const nonfungiblePositionManagerAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
const dexFactoryV3Address = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const quoterV3Address = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6";

const MIN_TICK = -887272;
const MAX_TICK = -MIN_TICK;

function getMinTick(tickSpacing) {
    return Math.ceil(-887272 / tickSpacing) * tickSpacing;
}
function getMaxTick(tickSpacing) {
    return Math.floor(887272 / tickSpacing) * tickSpacing;
}

describe("Odeum token", () => {
    // Deploy all contracts before each test suite
    async function deploys() {
        [ownerAcc, poolAcc, clientAcc1, clientAcc2] = await ethers.getSigners();

        let odeumV2Tx = await ethers.getContractFactory("contracts/OdeumV2.sol:Odeum");
        let odeumV2 = await upgrades.deployProxy(odeumV2Tx, [
            ownerAcc.address,
            poolAcc.address,
            dexRouterV2Address
        ], {
            initializer: "configure",
            kind: "uups",
        });
        await odeumV2.deployed();

        let odeumV3Tx = await ethers.getContractFactory("contracts/OdeumV3.sol:Odeum");
        let odeumV3 = await upgrades.deployProxy(odeumV3Tx, [
            ownerAcc.address,
            poolAcc.address,
            dexRouterV3Address
        ], {
            initializer: "configure",
            kind: "uups",
        });
        await odeumV3.deployed();

        let tokenTx = await ethers.getContractFactory("MockToken");
        let token = await tokenTx.deploy();

        const dexRouterV2 = await ethers.getContractAt("IUniswapV2Router02", dexRouterV2Address);
        const dexRouterV3 = await ethers.getContractAt("ISwapRouter", dexRouterV3Address);

        let liquidityAmount = parseEther("1000");
        await token.mint(ownerAcc.address, liquidityAmount.mul(BigNumber.from(2)));
        await token.approve(dexRouterV2Address, liquidityAmount);
        await token.approve(nonfungiblePositionManagerAddress, liquidityAmount);
        await odeumV2.approve(dexRouterV2Address, liquidityAmount);
        await odeumV3.approve(nonfungiblePositionManagerAddress, liquidityAmount);

        await dexRouterV2.addLiquidity(
            odeumV2.address,
            token.address,
            liquidityAmount,
            liquidityAmount,
            0,
            0,
            ownerAcc.address,
            await time.latest() + 10000
        );

        const TICK_SPACING = 60;
        const dexFactoryV3 = await ethers.getContractAt(dexFactoryV3Artifact.abi, dexFactoryV3Address);
        console.log("create pool");
        await dexFactoryV3.createPool(odeumV3.address, token.address, 3000);
        console.log("pool created");
        const sqrtPriceX96 = BigNumber.from(2).pow(BigNumber.from(96));
        const dexPairV3 = await ethers.getContractAt(dexPoolV3Artifact.abi, await dexFactoryV3.getPool(odeumV3.address, token.address, 3000));
        await dexPairV3.initialize(sqrtPriceX96);
        console.log("pool initialized");

        let mintParams = {
            token0: token.address,
            token1: odeumV3.address,
            fee: 3000,
            tickLower: getMinTick(TICK_SPACING),
            tickUpper: getMaxTick(TICK_SPACING),
            amount0Desired: liquidityAmount,
            amount1Desired: liquidityAmount,
            amount0Min: 2,
            amount1Min: 2,
            recipient: ownerAcc.address,
            deadline: await time.latest() + 10000
        }
        let nonfungiblePositionManager = await ethers.getContractAt(nonfungiblePositionManagerArtifact.abi, nonfungiblePositionManagerAddress);
        console.log("mint liquidity");
        await nonfungiblePositionManager.mint(mintParams);
        console.log("liquidity minted");

        let dexFactoryV2 = await ethers.getContractAt("IUniswapV2Factory", await dexRouterV2.factory());
        let pairV2Address = await dexFactoryV2.getPair(odeumV2.address, token.address);
        let pairV3Address = dexPairV3.address;
        let quoterV3 = await ethers.getContractAt(quoterV3Artifact.abi, quoterV3Address);
        console.log(await odeumV3.balanceOf(pairV3Address));
        console.log(await token.balanceOf(pairV3Address));

        return {
            odeumV2,
            odeumV3,
            token,
            dexRouterV2,
            dexRouterV3,
            dexFactoryV2,
            pairV2Address,
            pairV3Address,
            quoterV3
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

    async function swapV3(dexRouter, tokenIn, tokenOut, amountIn, receiver) {
        await tokenIn.connect(receiver).approve(dexRouter.address, amountIn);
        let swapParams = {
            tokenIn: tokenIn.address,
            tokenOut: tokenOut.address,
            fee: 3000,
            recipient: receiver.address,
            deadline: await time.latest() + 10000,
            amountIn: amountIn,
            amountOutMinimum: 2,
            sqrtPriceLimitX96: 0
        };
        await dexRouter.connect(receiver).exactInputSingle(swapParams);
    }

    describe("Deployment", () => {
        it("Should have a correct name", async () => {
            let { odeumV2 } = await loadFixture(deploys);
            expect(await odeumV2.name()).to.equal("ODEUM");
        });

        it("Should have a correct symbol", async () => {
            let { odeumV2 } = await loadFixture(deploys);
            expect(await odeumV2.symbol()).to.equal("ODEUM");
        });

        it("Should have correct decimals", async () => {
            let { odeumV2 } = await loadFixture(deploys);
            expect(await odeumV2.decimals()).to.equal(18);
        });

        it("Should have correct dex address", async () => {
            let { odeumV2 } = await loadFixture(deploys);
            expect(await odeumV2.dexRouter()).to.equal(dexRouterV2Address);
        });

        it("Should have a correct total supply", async () => {
            let { odeumV2 } = await loadFixture(deploys);
            expect(await odeumV2.totalSupply()).to.equal(
                // 100 Million of tokens with 18 decimals each
                ethers.BigNumber.from("100000000").mul(
                    ethers.BigNumber.from("1000000000000000000")
                )
            );
        });

        it("Should be excluded from fee", async () => {
            let { odeumV2 } = await loadFixture(deploys);
            expect(await odeumV2.isAccountExcludedFromFee(odeumV2.address)).to.be.true;
        });

        it("Should revert reinitialization", async () => {
            let { odeumV2, dexRouterV2 } = await loadFixture(deploys);
            await expect(odeumV2.configure(
                ownerAcc.address,
                poolAcc.address,
                dexRouterV2.address
            )).to.be.revertedWith("Initializable: contract is already initialized");
        });

        it("Should revert initialization if dexRouter is zero", async () => {
            let odeumV2Tx = await ethers.getContractFactory("contracts/OdeumV2.sol:Odeum");
            await expect(upgrades.deployProxy(odeumV2Tx, [
                ownerAcc.address,
                poolAcc.address,
                zeroAddress
            ], {
                initializer: "configure",
                kind: "uups",
            })).to.be.revertedWith("Odeum: the address must not be null");
        });
    });

    describe("Burn", () => {
        it("Should increase burnt tokens counter", async () => {
            let { odeumV2 } = await loadFixture(deploys);
            let startBurnt = await odeumV2.totalBurnt();
            let startSupply = await odeumV2.totalSupply();
            let burnAmount = parseEther("10");
            await odeumV2.connect(ownerAcc).transfer(zeroAddress, burnAmount);
            let endBurnt = await odeumV2.totalBurnt();
            let endSupply = await odeumV2.totalSupply();
            expect(endBurnt).to.equal(burnAmount);
            expect(endBurnt.sub(startBurnt)).to.equal(burnAmount);
            expect(startSupply.sub(endSupply)).to.equal(burnAmount);
        });
    });

    describe("Fee", () => {
        describe("Include/Exclude pair", () => {
            it("Should include pair in fee", async () => {
                let { odeumV2 } = await loadFixture(deploys);
                let pair = clientAcc1;
    
                expect(await odeumV2.isPairIncludedInFee(pair.address)).to.be.false;
    
                await expect(odeumV2.includePairInFee(pair.address))
                    .to.be.emit(odeumV2, "PairIncludedInFee").withArgs(pair.address);
                
                expect(await odeumV2.isPairIncludedInFee(pair.address)).to.be.true;
            });
    
            it("Should exclude pair from fee", async () => {
                let { odeumV2 } = await loadFixture(deploys);
                let pair = clientAcc1;
    
                await odeumV2.includePairInFee(pair.address);
                
                expect(await odeumV2.isPairIncludedInFee(pair.address)).to.be.true;
    
                await expect(odeumV2.excludePairFromFee(pair.address))
                    .to.be.emit(odeumV2, "PairExcludedfromFee").withArgs(pair.address);
    
                expect(await odeumV2.isPairIncludedInFee(pair.address)).to.be.false;
            });

            it("Should revert include zero address in fee", async () => {
                let { odeumV2 } = await loadFixture(deploys);
    
                await expect(odeumV2.includePairInFee(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert include included pair in fee", async () => {
                let { odeumV2 } = await loadFixture(deploys);
                let pair = clientAcc1;
                await odeumV2.includePairInFee(pair.address);

                await expect(odeumV2.includePairInFee(pair.address))
                    .to.be.revertedWith("Odeum: pair already included in fee");
            });

            it("Should revert include pair in fee by not owner", async () => {
                let { odeumV2, pairV2Address } = await loadFixture(deploys);
    
                await expect(odeumV2.connect(clientAcc1).includePairInFee(pairV2Address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should revert exclude pair from fee", async () => {
                let { odeumV2 } = await loadFixture(deploys);
    
                await expect(odeumV2.excludePairFromFee(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert exclude excluded pair from fee", async () => {
                let { odeumV2 } = await loadFixture(deploys);
                let pair = clientAcc1;

                await expect(odeumV2.excludePairFromFee(pair.address))
                    .to.be.revertedWith("Odeum: pair already excluded from fee");
            });

            it("Should revert exclude pair from fee by not owner", async () => {
                let { odeumV2, pairV2Address } = await loadFixture(deploys);
    
                await expect(odeumV2.connect(clientAcc1).excludePairFromFee(pairV2Address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("Include/Exclude account", () => {
            it("Should include account in fee", async () => {
                let { odeumV2 } = await loadFixture(deploys);
                await odeumV2.excludeAccountFromFee(clientAcc1.address);

                expect(await odeumV2.isAccountExcludedFromFee(clientAcc1.address)).to.be.true;
    
                await expect(odeumV2.includeAccountInFee(clientAcc1.address))
                    .to.be.emit(odeumV2, "AccountIncludedInFee").withArgs(clientAcc1.address);
                
                expect(await odeumV2.isAccountExcludedFromFee(clientAcc1.address)).to.be.false;
            });

            it("Should exclude account from fee", async () => {
                let { odeumV2 } = await loadFixture(deploys);

                expect(await odeumV2.isAccountExcludedFromFee(clientAcc1.address)).to.be.false;
    
                await expect(odeumV2.excludeAccountFromFee(clientAcc1.address))
                    .to.be.emit(odeumV2, "AccountExcludedFromFee").withArgs(clientAcc1.address);
                
                expect(await odeumV2.isAccountExcludedFromFee(clientAcc1.address)).to.be.true;
            });

            it("Should revert include account in fee for zero address", async () => {
                let { odeumV2 } = await loadFixture(deploys);
    
                await expect(odeumV2.includeAccountInFee(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert exclude account from fee for zero address", async () => {
                let { odeumV2 } = await loadFixture(deploys);
    
                await expect(odeumV2.excludeAccountFromFee(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert include account in fee if already included", async () => {
                let { odeumV2 } = await loadFixture(deploys);
    
                await expect(odeumV2.includeAccountInFee(clientAcc1.address))
                    .to.be.revertedWith("Odeum: account already included in fee");
            });

            it("Should revert exclude account in fee if already excluded", async () => {
                let { odeumV2 } = await loadFixture(deploys);
                await odeumV2.excludeAccountFromFee(clientAcc1.address);
    
                await expect(odeumV2.excludeAccountFromFee(clientAcc1.address))
                    .to.be.revertedWith("Odeum: account already excluded from fee");
            });

            it("Should revert include account in fee if called by not owner", async () => {
                let { odeumV2 } = await loadFixture(deploys);
    
                await expect(odeumV2.connect(clientAcc1).includeAccountInFee(clientAcc1.address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should revert exclude account from fee if called by not owner", async () => {
                let { odeumV2 } = await loadFixture(deploys);
    
                await expect(odeumV2.connect(clientAcc1).excludeAccountFromFee(clientAcc1.address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });
        });

        describe("Set tax withdraw token", () => {
            it("Should set tax withdraw token", async () => {
                let { odeumV2, token } = await loadFixture(deploys);

                expect(await odeumV2.taxWithdrawToken()).to.be.equal(zeroAddress);

                await expect(odeumV2.setTaxWithdrawToken(token.address))
                    .to.be.emit(odeumV2, "TaxWithdrawTokenSet").withArgs(token.address);

                expect(await odeumV2.taxWithdrawToken()).to.be.equal(token.address);
            });

            it("Should set tax withdraw poolFee for V3", async () => {
                let { odeumV3, token } = await loadFixture(deploys);

                expect(await odeumV3.taxWithdrawPoolFee()).to.be.equal(0);

                await expect(odeumV3.setTaxWithdrawPoolFee(3000))
                    .to.be.emit(odeumV3, "TaxWithdrawPoolFeeSet").withArgs(3000);

                expect(await odeumV3.taxWithdrawPoolFee()).to.be.equal(3000);
            });

            it("Should revert set tax withdraw token address zero", async () => {
                let { odeumV2, token } = await loadFixture(deploys);

                await expect(odeumV2.setTaxWithdrawToken(zeroAddress))
                    .to.be.revertedWith("Odeum: the address must not be null");
            });

            it("Should revert set tax withdraw token if called by not owner", async () => {
                let { odeumV2, token } = await loadFixture(deploys);

                await expect(odeumV2.connect(clientAcc1).setTaxWithdrawToken(token.address))
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should revert set tax withdraw poolFee zero for V3", async () => {
                let { odeumV3, token } = await loadFixture(deploys);

                await expect(odeumV3.setTaxWithdrawPoolFee(0))
                    .to.be.revertedWith("Odeum: poolFee must not be null");
            });
        });

        describe("Collect", () => {
            it("Should collect fee on sell for V2", async () => {
                let { odeumV2, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeumV2.includePairInFee(pairV2Address);

                let sellAmount = parseEther("1");
                let expectedFeeAmount = sellAmount.mul(await odeumV2.taxFee()).div(await odeumV2.MAX_BP());

                let ownerBalanceBefore = await odeumV2.balanceOf(ownerAcc.address);
                let pairBalanceBefore = await odeumV2.balanceOf(pairV2Address);
                let odeumBalanceBefore = await odeumV2.balanceOf(odeumV2.address);

                await swapV2(dexRouterV2, odeumV2, token, sellAmount, ownerAcc);

                expect(await odeumV2.collectedFee()).to.be.equal(expectedFeeAmount);
                expect(await odeumV2.balanceOf(odeumV2.address)).to.be.equal(odeumBalanceBefore.add(expectedFeeAmount));
                expect(await odeumV2.balanceOf(ownerAcc.address)).to.be.equal(ownerBalanceBefore.sub(sellAmount.add(expectedFeeAmount)));
                expect(await odeumV2.balanceOf(pairV2Address)).to.be.equal(pairBalanceBefore.add(sellAmount));
            })

            it("Should collect fee on sell for V3", async () => {
                let { odeumV3, dexRouterV3, token, pairV3Address } = await loadFixture(deploys);
                await odeumV3.includePairInFee(pairV3Address);

                let sellAmount = parseEther("1");
                let expectedFeeAmount = sellAmount.mul(await odeumV3.taxFee()).div(await odeumV3.MAX_BP());

                let ownerBalanceBefore = await odeumV3.balanceOf(ownerAcc.address);
                let pairBalanceBefore = await odeumV3.balanceOf(pairV3Address);
                let odeumBalanceBefore = await odeumV3.balanceOf(odeumV3.address);

                await swapV3(dexRouterV3, odeumV3, token, sellAmount, ownerAcc);

                expect(await odeumV3.collectedFee()).to.be.equal(expectedFeeAmount);
                expect(await odeumV3.balanceOf(odeumV3.address)).to.be.equal(odeumBalanceBefore.add(expectedFeeAmount));
                expect(await odeumV3.balanceOf(ownerAcc.address)).to.be.equal(ownerBalanceBefore.sub(sellAmount.add(expectedFeeAmount)));
                expect(await odeumV3.balanceOf(pairV3Address)).to.be.equal(pairBalanceBefore.add(sellAmount));
            })

            it("Should collect fee on buy for V2", async () => {
                let { odeumV2, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeumV2.includePairInFee(pairV2Address);

                let buyAmount = parseEther("1");
                await token.mint(clientAcc2.address, buyAmount);
                let expectedOdeumAmount = await dexRouterV2.getAmountOut(
                    buyAmount,
                    await odeumV2.balanceOf(pairV2Address),
                    await token.balanceOf(pairV2Address)
                );
                let expectedFeeAmount = expectedOdeumAmount.mul(await odeumV2.taxFee()).div(await odeumV2.MAX_BP());

                let clientBalanceBefore = await odeumV2.balanceOf(clientAcc2.address);
                let pairBalanceBefore = await odeumV2.balanceOf(pairV2Address);
                let odeumBalanceBefore = await odeumV2.balanceOf(odeumV2.address);

                await swapV2(dexRouterV2, token, odeumV2, buyAmount, clientAcc2);

                expect(await odeumV2.collectedFee()).to.be.equal(expectedFeeAmount);
                expect(await odeumV2.balanceOf(odeumV2.address)).to.be.equal(odeumBalanceBefore.add(expectedFeeAmount));
                expect(await odeumV2.balanceOf(clientAcc2.address)).to.be.equal(clientBalanceBefore.add(expectedOdeumAmount.sub(expectedFeeAmount)));
                expect(await odeumV2.balanceOf(pairV2Address)).to.be.equal(pairBalanceBefore.sub(expectedOdeumAmount));
            })

            it("Should collect fee on buy for V3", async () => {
                let { odeumV3, dexRouterV3, dexRouterV2, token, pairV3Address } = await loadFixture(deploys);
                await odeumV3.includePairInFee(pairV3Address);

                let buyAmount = parseEther("1");
                await token.mint(clientAcc2.address, buyAmount);
                let expectedOdeumAmount = await dexRouterV2.getAmountOut(
                    buyAmount,
                    await odeumV3.balanceOf(pairV3Address),
                    await token.balanceOf(pairV3Address)
                );
                let expectedFeeAmount = expectedOdeumAmount.mul(await odeumV3.taxFee()).div(await odeumV3.MAX_BP());

                let clientBalanceBefore = await odeumV3.balanceOf(clientAcc2.address);
                let pairBalanceBefore = await odeumV3.balanceOf(pairV3Address);
                let odeumBalanceBefore = await odeumV3.balanceOf(odeumV3.address);

                await swapV3(dexRouterV3, token, odeumV3, buyAmount, clientAcc2);

                expect(await odeumV3.collectedFee()).to.be.equal(expectedFeeAmount);
                expect(await odeumV3.balanceOf(odeumV3.address)).to.be.equal(odeumBalanceBefore.add(expectedFeeAmount));
                expect(await odeumV3.balanceOf(clientAcc2.address)).to.be.equal(clientBalanceBefore.add(expectedOdeumAmount.sub(expectedFeeAmount)));
                expect(await odeumV3.balanceOf(pairV3Address)).to.be.equal(pairBalanceBefore.sub(expectedOdeumAmount));
            })

            it("Should not take fee on sell for excluded account", async () => {
                let { odeumV2, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeumV2.includePairInFee(pairV2Address);
                await odeumV2.excludeAccountFromFee(clientAcc1.address);

                let sellAmount = parseEther("1");
                await odeumV2.transfer(clientAcc1.address, sellAmount);

                let clientBalanceBefore = await odeumV2.balanceOf(clientAcc1.address);
                let pairBalanceBefore = await odeumV2.balanceOf(pairV2Address);
                let odeumBalanceBefore = await odeumV2.balanceOf(odeumV2.address);

                await swapV2(dexRouterV2, odeumV2, token, sellAmount, clientAcc1);

                expect(await odeumV2.collectedFee()).to.be.equal(0);
                expect(await odeumV2.balanceOf(odeumV2.address)).to.be.equal(odeumBalanceBefore);
                expect(await odeumV2.balanceOf(clientAcc1.address)).to.be.equal(clientBalanceBefore.sub(sellAmount));
                expect(await odeumV2.balanceOf(pairV2Address)).to.be.equal(pairBalanceBefore.add(sellAmount));
            })

            it("Should not take fee on buy for excluded account", async () => {
                let { odeumV2, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeumV2.includePairInFee(pairV2Address);
                await odeumV2.excludeAccountFromFee(clientAcc2.address);

                let buyAmount = parseEther("1");
                await token.mint(clientAcc2.address, buyAmount);
                let expectedOdeumAmount = await dexRouterV2.getAmountOut(
                    buyAmount,
                    await odeumV2.balanceOf(pairV2Address),
                    await token.balanceOf(pairV2Address)
                );

                let clientBalanceBefore = await odeumV2.balanceOf(clientAcc2.address);
                let pairBalanceBefore = await odeumV2.balanceOf(pairV2Address);
                let odeumBalanceBefore = await odeumV2.balanceOf(odeumV2.address);

                await swapV2(dexRouterV2, token, odeumV2, buyAmount, clientAcc2);

                expect(await odeumV2.collectedFee()).to.be.equal(0);
                expect(await odeumV2.balanceOf(odeumV2.address)).to.be.equal(odeumBalanceBefore);
                expect(await odeumV2.balanceOf(clientAcc2.address)).to.be.equal(clientBalanceBefore.add(expectedOdeumAmount));
                expect(await odeumV2.balanceOf(pairV2Address)).to.be.equal(pairBalanceBefore.sub(expectedOdeumAmount));
            })

            it("Should revert take fee on sell if not anought tokens to pay fee", async () => {
                let { odeumV2, dexRouterV2, token } = await loadFixture(deploys);
                let pair = clientAcc2;
                await odeumV2.includePairInFee(pair.address);

                let sellAmount = parseEther("1");
                await odeumV2.transfer(clientAcc1.address, sellAmount);

                await expect(odeumV2.connect(clientAcc1).transfer(pair.address, sellAmount)).to.be.revertedWith(
                    "Odeum: Not enough tokens"
                );
            })

            it("Should revert transfer if not anought tokens", async () => {
                let { odeumV2, dexRouterV2, token } = await loadFixture(deploys);
                let pair = clientAcc2;
                await odeumV2.includePairInFee(pair.address);

                let sellAmount = parseEther("1");

                await expect(odeumV2.connect(clientAcc1).transfer(pair.address, sellAmount)).to.be.revertedWith(
                    "Odeum: transfer amount exceeds balance"
                );
            })
        });

        describe("Withdraw", () => {
            it("Should withdraw fee for V2", async () => {
                let { odeumV2, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeumV2.includePairInFee(pairV2Address);
                await odeumV2.setTaxWithdrawToken(token.address);

                let sellAmount = parseEther("1");
                await swapV2(dexRouterV2, odeumV2, token, sellAmount, ownerAcc);

                let odeumWithdrawAmount = await odeumV2.collectedFee();
                let expectedTokenAmount = await dexRouterV2.getAmountOut(
                    odeumWithdrawAmount,
                    await odeumV2.balanceOf(pairV2Address),
                    await token.balanceOf(pairV2Address)
                );

                let ownerTokenBalanceBefore = await token.balanceOf(ownerAcc.address);

                await expect(odeumV2.withdrawFee())
                    .to.be.emit(odeumV2, "FeeWithdrawn").withArgs(
                        odeumWithdrawAmount,
                        expectedTokenAmount
                    );

                expect(await token.balanceOf(ownerAcc.address)).to.be.equal(ownerTokenBalanceBefore.add(expectedTokenAmount));
                expect(await token.balanceOf(odeumV2.address)).to.be.equal(0);
                expect(await odeumV2.balanceOf(odeumV2.address)).to.be.equal(0);
                expect(await odeumV2.collectedFee()).to.be.equal(0);
            });

            it("Should withdraw fee for V3", async () => {
                let { odeumV3, dexRouterV3, dexRouterV2, token, pairV3Address } = await loadFixture(deploys);
                await odeumV3.includePairInFee(pairV3Address);
                await odeumV3.setTaxWithdrawToken(token.address);
                await odeumV3.setTaxWithdrawPoolFee(3000);

                let sellAmount = parseEther("1");
                await swapV3(dexRouterV3, odeumV3, token, sellAmount, ownerAcc);

                let odeumWithdrawAmount = await odeumV3.collectedFee();
                let expectedTokenAmount = await dexRouterV2.getAmountOut(
                    odeumWithdrawAmount,
                    await odeumV3.balanceOf(pairV3Address),
                    await token.balanceOf(pairV3Address)
                );
                let ownerTokenBalanceBefore = await token.balanceOf(ownerAcc.address);

                await expect(odeumV3.withdrawFee())
                    .to.be.emit(odeumV3, "FeeWithdrawn");

                expect((await token.balanceOf(ownerAcc.address)).sub(ownerTokenBalanceBefore)).to.be.closeTo(expectedTokenAmount, parseEther("0.000001"));
                expect(await token.balanceOf(odeumV3.address)).to.be.equal(0);
                expect(await odeumV3.balanceOf(odeumV3.address)).to.be.equal(0);
                expect(await odeumV3.collectedFee()).to.be.equal(0);
            });

            it("Should withdraw fee with odeum token for V2", async () => {
                let { odeumV2, dexRouterV2, token, pairV2Address } = await loadFixture(deploys);
                await odeumV2.includePairInFee(pairV2Address);
                await odeumV2.setTaxWithdrawToken(odeumV2.address);

                let sellAmount = parseEther("1");
                await swapV2(dexRouterV2, odeumV2, token, sellAmount, ownerAcc);

                let odeumWithdrawAmount = await odeumV2.collectedFee();

                let ownerTokenBalanceBefore = await odeumV2.balanceOf(ownerAcc.address);

                await expect(odeumV2.withdrawFee())
                    .to.be.emit(odeumV2, "FeeWithdrawn").withArgs(
                        odeumWithdrawAmount,
                        odeumWithdrawAmount
                    );

                expect(await odeumV2.balanceOf(ownerAcc.address)).to.be.equal(ownerTokenBalanceBefore.add(odeumWithdrawAmount));
                expect(await token.balanceOf(odeumV2.address)).to.be.equal(0);
                expect(await odeumV2.balanceOf(odeumV2.address)).to.be.equal(0);
                expect(await odeumV2.collectedFee()).to.be.equal(0);
            });

            it("Should withdraw fee with odeum token for V3", async () => {
                let { odeumV3, dexRouterV3, dexRouterV2, token, pairV3Address } = await loadFixture(deploys);
                await odeumV3.includePairInFee(pairV3Address);
                await odeumV3.setTaxWithdrawToken(odeumV3.address);

                let sellAmount = parseEther("1");
                await swapV3(dexRouterV3, odeumV3, token, sellAmount, ownerAcc);

                let odeumWithdrawAmount = await odeumV3.collectedFee();
                let ownerTokenBalanceBefore = await odeumV3.balanceOf(ownerAcc.address);

                await expect(odeumV3.withdrawFee())
                    .to.be.emit(odeumV3, "FeeWithdrawn").withArgs(
                        odeumWithdrawAmount,
                        odeumWithdrawAmount
                    );

                expect((await odeumV3.balanceOf(ownerAcc.address)).sub(ownerTokenBalanceBefore)).to.be.equal(odeumWithdrawAmount);
                expect(await token.balanceOf(odeumV3.address)).to.be.equal(0);
                expect(await odeumV3.balanceOf(odeumV3.address)).to.be.equal(0);
                expect(await odeumV3.collectedFee()).to.be.equal(0);
            });

            it("Should revert withdraw fee if called by not owner for V2", async () => {
                let { odeumV2 } = await loadFixture(deploys);

                await expect(odeumV2.connect(clientAcc1).withdrawFee())
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should revert withdraw fee if called by not owner for V3", async () => {
                let { odeumV3 } = await loadFixture(deploys);

                await expect(odeumV3.connect(clientAcc1).withdrawFee())
                    .to.be.revertedWith("Ownable: caller is not the owner");
            });

            it("Should revert withdraw fee if withdraw token not setted", async () => {
                let { odeumV2 } = await loadFixture(deploys);

                await expect(odeumV2.withdrawFee())
                    .to.be.revertedWith("Odeum: taxWithdrawToken not set");
            });

            it("Should revert withdraw fee if no collected tokens", async () => {
                let { odeumV2, token } = await loadFixture(deploys);
                await odeumV2.setTaxWithdrawToken(token.address);

                await expect(odeumV2.withdrawFee())
                    .to.be.revertedWith("Odeum: no tokens to withdraw");
            });

            it("Should revert withdraw fee if pool fee not setted for V3", async () => {
                let { odeumV3, token } = await loadFixture(deploys);
                await odeumV3.setTaxWithdrawToken(token.address);

                await expect(odeumV3.withdrawFee())
                    .to.be.revertedWith("Odeum: taxWithdrawPoolFee not set");
            });
        });
    });
});
