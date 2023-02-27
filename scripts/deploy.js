const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const delay = require("delay");
require("dotenv").config();

// JSON file to keep information about previous deployments
const fileName = "./deployOutput.json";
const OUTPUT_DEPLOY = require(fileName);

let contractName;
let token;
let tokenUpgradeable;

async function main() {
    console.log(`[NOTICE!] Chain of deployment: ${network.name}`);

    // ====================================================

    // Contract #1: CRSTL

    contractName = "CRSTL";
    console.log(`[${contractName}]: Start of Deployment...`);
    _contractProto = await ethers.getContractFactory(contractName);
    contractDeployTx = await _contractProto.deploy("CREESTL", "CRSTL", 18);
    token = await contractDeployTx.deployed();
    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].address = token.address;

    // Verify
    console.log(`[${contractName}]: Start of Verification...`);

    await delay(90000);

    if (network.name === "polygon_mainnet") {
        url = "https://polygonscan.com/address/" + token.address + "#code";
    } else if (network.name === "polygon_testnet") {
        url =
            "https://mumbai.polygonscan.com/address/" + token.address + "#code";
    }

    OUTPUT_DEPLOY[network.name][contractName].verification = url;

    try {
        await hre.run("verify:verify", {
            address: token.address,
            constructorArguments: ["CREESTL", "CRSTL", 18],
        });
    } catch (error) {
        console.error(error);
    }
    console.log(`[${contractName}]: Verification Finished!`);

    // ====================================================

    // Contract #2: CRSTLUpgradeable

    // Deploy proxy and implementation
    contractName = "CRSTLUpgradeable";
    console.log(`[${contractName}]: Start of Deployment...`);
    _contractProto = await ethers.getContractFactory(contractName);
    tokenUpgradeable = await upgrades.deployProxy(
        _contractProto,
        ["CREESTLUpgradeable", "CRSTLU", 18],
        {
            initializer: "initialize",
            kind: "uups",
        }
    );
    await tokenUpgradeable.deployed();
    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].proxyAddress =
        tokenUpgradeable.address;

    await delay(90000);

    // Verify implementation
    console.log(`[${contractName}][Implementation]: Start of Verification...`);

    let tokenUpgradeableImplAddress =
        await upgrades.erc1967.getImplementationAddress(
            tokenUpgradeable.address
        );
    OUTPUT_DEPLOY[network.name][contractName].implementationAddress =
        tokenUpgradeableImplAddress;
    if (network.name === "polygon_mainnet") {
        url =
            "https://polygonscan.com/address/" +
            tokenUpgradeableImplAddress +
            "#code";
    } else if (network.name === "polygon_testnet") {
        url =
            "https://mumbai.polygonscan.com/address/" +
            tokenUpgradeableImplAddress +
            "#code";
    }
    OUTPUT_DEPLOY[network.name][contractName].implementationVerification = url;
    try {
        await hre.run("verify:verify", {
            address: tokenUpgradeableImplAddress,
        });
    } catch (error) {}

    // Initialize implementation if it has not been initialized yet
    let tokenUpgradeableImpl = await ethers.getContractAt(
        "CRSTLUpgradeable",
        tokenUpgradeableImplAddress
    );
    try {
        await tokenUpgradeableImpl.initialize("CRSTLUpgradeable", "CRSTLU", 18);
    } catch (error) {}
    console.log(`[${contractName}][Implementation]: Verification Finished!`);

    // Verify proxy
    console.log(`[${contractName}][Proxy]: Start of Verification...`);
    if (network.name === "polygon_mainnet") {
        url =
            "https://polygonscan.com/address/" +
            tokenUpgradeable.address +
            "#code";
    } else if (network.name === "polygon_testnet") {
        url =
            "https://mumbai.polygonscan.com/address/" +
            tokenUpgradeable.address +
            "#code";
    }
    OUTPUT_DEPLOY[network.name][contractName].proxyVerification = url;

    try {
        await hre.run("verify:verify", {
            address: tokenUpgradeable.address,
        });
    } catch (error) {}
    console.log(`[${contractName}][Proxy]: Verification Finished!`);

    // ====================================================

    fs.writeFileSync(
        path.resolve(__dirname, fileName),
        JSON.stringify(OUTPUT_DEPLOY, null, "  ")
    );

    console.log(
        `\n***Deployment and verification are completed!***\n***See Results in "${
            __dirname + fileName
        }" file***`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
