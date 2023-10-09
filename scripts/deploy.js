const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const delay = require("delay");
require("dotenv").config();

const OWNER_WALLET_ADDRESS = process.env.OWNER_WALLET_ADDRESS;
const TEAM_WALLET_ADDRESS = process.env.TEAM_WALLET_ADDRESS;
const POOL_WALLET_ADDRESS = process.env.POOL_WALLET_ADDRESS;

const zeroAddress = ethers.constants.AddressZero;

const INPUT = require("./deployInput.json");

// JSON file to keep information about previous deployments
const outputFileName = "./deployOutput.json";
const OUTPUT_DEPLOY = require(outputFileName);

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
    if (INPUT[network.name]["Uniswap"].isV2) {
        contractName = "contracts/OdeumFantom.sol:Odeum";
    } else {
        contractName = "contracts/OdeumArbitrum.sol:Odeum";
    }
    console.log(`[${contractName}]: Start of Deployment...`);
    _contractProto = await ethers.getContractFactory(contractName);
    odeum = await upgrades.deployProxy(_contractProto, [
        OWNER_WALLET_ADDRESS,
        POOL_WALLET_ADDRESS,
        INPUT[network.name]["Uniswap"].routerAddress
    ], {
        initializer: "configure",
        kind: "uups",
    });
    await odeum.deployed();
    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].proxyAddress = odeum.address;

    await delay(90000);

    // Verify implementation
    console.log(`[${contractName}][Implementation]: Start of Verification...`);

    let odeumImplAddress = await upgrades.erc1967.getImplementationAddress(
        odeum.address
    );
    OUTPUT_DEPLOY[network.name][contractName].implementationAddress =
        odeumImplAddress;
    if (network.name === "fantom_mainnet") {
        url = "https://ftmscan.com/address/" + odeumImplAddress + "#code";
    } else if (network.name === "fantom_testnet") {
        url =
            "https://testnet.ftmscan.com/address/" + odeumImplAddress + "#code";
    } else if (network.name === "arbitrum_mainnet") {
        url = "https://arbiscan.io/address/" + odeumImplAddress + "#code";
    } else if (network.name === "arbitrum_testnet") {
        url = "https://goerli.arbiscan.io/address/" + odeumImplAddress + "#code";
    }
    OUTPUT_DEPLOY[network.name][contractName].implementationVerification = url;
    try {
        await hre.run("verify:verify", {
            address: odeumImplAddress,
        });
    } catch (error) {}

    // Initialize implementation if it has not been initialized yet
    let odeumImpl = await ethers.getContractAt(contractName, odeumImplAddress);
    try {
        await odeumImpl.configure(
            OWNER_WALLET_ADDRESS,
            POOL_WALLET_ADDRESS,
            INPUT[network.name]["Uniswap"].routerAddress
        );
    } catch (error) {}
    console.log(`[${contractName}][Implementation]: Verification Finished!`);

    // Verify proxy
    console.log(`[${contractName}][Proxy]: Start of Verification...`);
    if (network.name === "fantom_mainnet") {
        url = "https://ftmscan.com/address/" + odeum.address + "#code";
    } else if (network.name === "fantom_testnet") {
        url = "https://testnet.ftmscan.com/address/" + odeum.address + "#code";
    } else if (network.name === "arbitrum_mainnet") {
        url = "https://arbiscan.io/address/" + odeum.address + "#code";
    } else if (network.name === "arbitrum_testnet") {
        url = "https://goerli.arbiscan.io/address/" + odeum.address + "#code";
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
            "https://testnet.ftmscan.com/address/" +
            stakingPool.address +
            "#code";
    } else if (network.name === "arbitrum_mainnet") {
        url = "https://arbiscan.io/address/" + stakingPool.address + "#code";
    } else if (network.name === "arbitrum_testnet") {
        url = "https://goerli.arbiscan.io/address/" + stakingPool.address + "#code";
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
        TEAM_WALLET_ADDRESS,
        zeroAddress,
        10, // 1% burnt
        100, // 10% to team
        90 // 9% to community (reward)
    );
    tipping = await contractDeployTx.deployed();
    // Set tipping address
    await stakingPool.connect(owner).setTipping(tipping.address);
    console.log(`[${contractName}]: Deployment Finished!`);
    OUTPUT_DEPLOY[network.name][contractName].address = tipping.address;

    // Verify
    console.log(`[${contractName}]: Start of Verification...`);

    await delay(90000);

    if (network.name === "fantom_mainnet") {
        url = "https://ftmscan.com/address/" + tipping.address + "#code";
    } else if (network.name === "fantom_testnet") {
        url =
            "https://testnet.ftmscan.com/address/" +
            tipping.address +
            "#code";
    } else if (network.name === "arbitrum_mainnet") {
        url = "https://arbiscan.io/address/" + tipping.address + "#code";
    } else if (network.name === "arbitrum_testnet") {
        url = "https://goerli.arbiscan.io/address/" + tipping.address + "#code";
    }

    OUTPUT_DEPLOY[network.name][contractName].verification = url;

    try {
        await hre.run("verify:verify", {
            address: tipping.address,
            constructorArguments: [
                stakingPool.address,
                odeum.address,
                TEAM_WALLET_ADDRESS,
                zeroAddress,
                10,
                100,
                90
            ],
        });
    } catch (error) {
        console.error(error);
    }
    console.log(`[${contractName}]: Verification Finished!`);

    // ====================================================
    fs.writeFileSync(
        path.resolve(__dirname, outputFileName),
        JSON.stringify(OUTPUT_DEPLOY, null, "  ")
    );

    console.log(
        `\n***Deployment and verification are completed!***\n***See Results in "${
            __dirname + outputFileName
        }" file***`
    );
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
