const { ethers, network, upgrades } = require("hardhat");
require("dotenv").config();

const FUND_WALLET_ADDRESS = process.env.FUND_WALLET_ADDRESS;

const zeroAddress = ethers.constants.AddressZero;

async function main() {
   let tipping = await ethers.getContractAt("Tipping", "0x0d774A1F8f3EC56eE793510FFD1e36578126c129"); 
    await tipping.setFundVaultAddress(FUND_WALLET_ADDRESS);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
