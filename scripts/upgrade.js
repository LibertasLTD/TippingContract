const { ethers, network, upgrades } = require("hardhat");
const fs = require("fs");
const path = require("path");
const delay = require("delay");
require("dotenv").config();

// JSON file to keep information about previous deployments
const fileName = "./deployOutput.json";
const OUTPUT_DEPLOY = require(fileName);

// List of contracts that need to be upgraded
let oldContractNames = [
    "contracts/OdeumFantom.sol:Odeum",
];

// List of new versions of upgraded contracts
let newContractNames = [
    "contracts/OdeumFantom.sol:OdeumV2",
];

if (oldContractNames.length != newContractNames.length) {
    console.error("Arrays length must be equal!");
    process.exit(1);
}

async function main() {
    for (let i = 0; i < oldContractNames.length; i++) {
        let contractName = oldContractNames[i];

        // Get the address of the already deployed proxy
        let proxyAddress =
            OUTPUT_DEPLOY[network.name][contractName].proxyAddress;

        if (proxyAddress.length == 0) {
            console.error("Invalid existing proxy address!");
            process.exit(1);
        }
        console.assert(
            proxyAddress.length > 0,
            "Invalid existing proxy address!"
        );
        // Get factory of upgraded contract
        let newImpl = await ethers.getContractFactory(newContractNames[i]);

        console.log(
            `[${contractName}][Proxy]: Start migrating to a new implementation contract...`
        );
        // Hardhat Upgrades plugin will run some checks for upgradeable
        // contract compatibility and that may result in an error
        let newImplAddress;
        try {
            // Get the address of the new implementation
            newImplAddress = await upgrades.prepareUpgrade(
                proxyAddress,
                newImpl,
                {
                    kind: "uups",
                }
            );
            // Actually make an upgrade
            await upgrades.upgradeProxy(proxyAddress, newImpl, {
                kind: "uups",
            });
            newImpl.attach(newImplAddress);
        } catch (e) {
            // If one of the contracts can not be upgraded, that's a critical error
            console.error(e);
            process.exit(1);
        }
        console.log(`[${contractName}][Proxy]: Migration finished!`);

        await delay(90000);

        OUTPUT_DEPLOY[network.name][contractName].implementationAddress =
            newImplAddress;

        let url;
        if (network.name === "polygon_mainnet") {
            url = "https://polygonscan.com/address/" + newImplAddress + "#code";
        } else if (network.name === "polygon_testnet") {
            url =
                "https://mumbai.polygonscan.com/address/" +
                newImplAddress +
                "#code";
        }
        OUTPUT_DEPLOY[network.name][contractName].implementationVerification =
            url;

        console.log(
            `[${contractName}][Implementation]: Start verifying a new implementation...`
        );
        try {
            await hre.run("verify:verify", {
                address: newImplAddress,
                // No costructor needed for upgrading already existing contract
            });
        } catch (e) {
            // If new implementation verification fails that means that this script
            // was executed when the bytecode of the contract was not changed, i.e.
            // the implementation stays the same (it has already been verified)
            // That is not a critical error
        }

        console.log(
            `[${contractName}][Implementation]: Verification finished!`
        );
    }

    fs.writeFileSync(
        path.resolve(__dirname, fileName),
        JSON.stringify(OUTPUT_DEPLOY, null, "  ")
    );

    console.log(
        `\n***Proxy upgrade and verification are completed!***\n***See Results in "${
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
