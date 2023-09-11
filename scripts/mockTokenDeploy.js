const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const delay = require("delay");
require("dotenv").config();

async function main() {
    console.log(`[NOTICE!] Chain of deployment: ${network.name}`);
    console.log(`[MockToken]: Start of Deployment...`);

    const tokenTx = await ethers.getContractFactory("MockToken");
    const token = await tokenTx.deploy();
    await token.deployed();

    console.log(`[MockToken]: ${token.address}`);

    await delay(90000);

    console.log(`[MockToken]: Start of Verification...`);

    try {
        await hre.run("verify:verify", {
            address: token.address,
        });
    } catch (error) {}
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
