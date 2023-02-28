const { ethers } = require("hardhat");
const { expect } = require("chai");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const parseEther = ethers.utils.parseEther;
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
            let { odeum } = await loadFixture(
                deploys
            );
            expect(await odeum.name()).to.equal("ODEUM");
        });

        it("Should have a correct symbol", async () => {
            let { odeum } = await loadFixture(
                deploys
            );
            expect(await odeum.symbol()).to.equal("ODEUM");
        });

        it("Should have correct decimals", async () => {
            let { odeum } = await loadFixture(
                deploys
            );
            expect(await odeum.decimals()).to.equal(18);
        });
    });

});
