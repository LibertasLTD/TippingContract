const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Odeum token", () => {

    // Deploy all contracts before each test suite
    async function deploys() {
        [ownerAcc] = await ethers.getSigners();

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

        it("Should have a correct total supply", async () => {
            let { odeum } = await loadFixture(
                deploys
            );
            expect(await odeum.totalSupply()).to.equal(
                // 100 Million of tokens with 18 decimals each
                ethers.BigNumber.from("100000000").mul(ethers.BigNumber.from("1000000000000000000"))
            );
        });
    });

});
