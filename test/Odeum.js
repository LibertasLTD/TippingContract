const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { parseUnits, parseEther } = ethers.utils;
const zeroAddress = ethers.constants.AddressZero;

describe("Odeum token", () => {
    // Deploy all contracts before each test suite
    async function deploys() {
        [ownerAcc, clientAcc1, clientAcc2] = await ethers.getSigners();

        let odeumTx = await ethers.getContractFactory("Odeum");
        let odeum = await upgrades.deployProxy(odeumTx, [ownerAcc.address], {
            initializer: "configure",
            kind: "uups",
        });
        await odeum.deployed();

        return {
            odeum,
        };
    }

    describe("Deployment", () => {
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

        it("Should have a correct total supply", async () => {
            let { odeum } = await loadFixture(deploys);
            expect(await odeum.totalSupply()).to.equal(
                // 100 Million of tokens with 18 decimals each
                ethers.BigNumber.from("100000000").mul(
                    ethers.BigNumber.from("1000000000000000000")
                )
            );
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
});
