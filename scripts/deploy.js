const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const delay = require("delay");
require("dotenv").config();

const zeroAddress = ethers.constants.AddressZero;

// JSON file to keep information about previous deployments
const fileName = "./deployOutput.json";
const OUTPUT_DEPLOY = require(fileName);

let contractName;
let odeum;
let stakingPool;
let tipping;


async function main() {
    console.log(`[NOTICE!] Chain of deployment: ${network.name}`);

    let [owner] = await ethers.getSigners();

    // ====================================================

    // Contract #1: Odeum

    // Deploy proxy and implementation
    contractName = "Odeum";
    console.log(`[${contractName}]: Start of Deployment...`);
    _contractProto = await ethers.getContractFactory(contractName);
    odeum = await upgrades.deployProxy(
        _contractProto,
        // TODO change it to real team's wallet afterwards
        [owner.address],
        {
            initializer: "configure",
            kind: "uups",
        }
    );
    await odeum.deployed();
    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].proxyAddress =
        odeum.address;

    await delay(90000);

    // Verify implementation
    console.log(`[${contractName}][Implementation]: Start of Verification...`);

    let odeumImplAddress =
        await upgrades.erc1967.getImplementationAddress(
            odeum.address
        );
    OUTPUT_DEPLOY[network.name][contractName].implementationAddress =
        odeumImplAddress;
    if (network.name === "fantom_mainnet") {
        url =
            "https://ftmscan.com/address/" +
            odeumImplAddress +
            "#code";
    } else if (network.name === "fantom_testnet") {
        url =
            "https://testnet.ftmscan.com/address/" +
            odeumImplAddress +
            "#code";
    }
    OUTPUT_DEPLOY[network.name][contractName].implementationVerification = url;
    try {
        await hre.run("verify:verify", {
            address: odeumImplAddress,
        });
    } catch (error) {}

    // Initialize implementation if it has not been initialized yet
    let odeumImpl = await ethers.getContractAt(
        "Odeum",
        odeumImplAddress
    );
    try {
        await odeumImpl.initialize(owner.address);
    } catch (error) {}
    console.log(`[${contractName}][Implementation]: Verification Finished!`);

    // Verify proxy
    console.log(`[${contractName}][Proxy]: Start of Verification...`);
    if (network.name === "fantom_mainnet") {
        url =
            "https://ftmscan.com/address/" +
            odeum.address +
            "#code";
    } else if (network.name === "fantom_testnet") {
        url =
            "https://testnet.ftmscan.com/address/" +
            odeum.address +
            "#code";
    }
    OUTPUT_DEPLOY[network.name][contractName].proxyVerification = url;

    try {
        await hre.run("verify:verify", {
            address: odeum.address,
        });
    } catch (error) {}
    console.log(`[${contractName}][Proxy]: Verification Finished!`);

    // ====================================================

    // Contract #2: StakingPool

    contractName = "StakingPool";
    console.log(`[${contractName}]: Start of Deployment...`);
    _contractProto = await ethers.getContractFactory(contractName);
    contractDeployTx = await _contractProto.deploy(odeum.address);
    stakingPool = await contractDeployTx.deployed();
    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].address = stakingPool.address;

    // Verify
    console.log(`[${contractName}]: Start of Verification...`);

    await delay(90000);

    if (network.name === "fantom_mainnet") {
        url = "https://ftmscan.com/address/" + stakingPool.address + "#code";
    } else if (network.name === "fantom_testnet") {
        url =
            "https://testnet.ftmscan.com/address/" + stakingPool.address + "#code";
    }

    OUTPUT_DEPLOY[network.name][contractName].verification = url;

    try {
        await hre.run("verify:verify", {
            address: stakingPool.address,
            constructorArguments: [odeum.address],
        });
    } catch (error) {
        console.error(error);
    }
    console.log(`[${contractName}]: Verification Finished!`);

    // ====================================================

    // Contract #3: Tipping

    contractName = "Tipping";
    console.log(`[${contractName}]: Start of Deployment...`);
    _contractProto = await ethers.getContractFactory(contractName);
    contractDeployTx = await _contractProto.deploy(
        stakingPool.address,
        odeum.address,
        // TODO change it to team wallet
        owner.address,
        zeroAddress,
        10,
        45,
        45
    );
    tipping = await contractDeployTx.deployed();
    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].address = tipping.address;

    // Verify
    console.log(`[${contractName}]: Start of Verification...`);

    await delay(90000);

    if (network.name === "fantom_mainnet") {
        url = "https://ftmscan.com/address/" + tipping.address + "#code";
    } else if (network.name === "fantom_testnet") {
        url =
            "https://testnet.ftmscan.com/address/" + stakingPool.address + "#code";
    }

    OUTPUT_DEPLOY[network.name][contractName].verification = url;

    try {
        await hre.run("verify:verify", {
            address: tipping.address,
            constructorArguments: [
                stakingPool.address,
                odeum.address,
                // TODO change it to team wallet
                owner.address,
                zeroAddress,
                10,
                45,
                45
            ],
        });
    } catch (error) {
        console.error(error);
    }
    console.log(`[${contractName}]: Verification Finished!`);

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
