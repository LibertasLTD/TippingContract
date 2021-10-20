const fs = require('fs');
const { constants } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;

const LibertasUpgradeableProxy = artifacts.require("LibertasUpgradeableProxy");
const LibertasProxyAdmin = artifacts.require("LibertasProxyAdmin");

const LibertasToken = artifacts.require("LibertasToken");
const StakingPool = artifacts.require("StakingPool");
const Tipping = artifacts.require("Tipping");

module.exports = async (deployer, network, accounts) => {

  const libertasTokenMainnetAddress = "0x49184E6dAe8C8ecD89d8Bdc1B950c597b8167c90";
  const owner = accounts[0];

  const deployTippingAndStaking = async (libertasTokenAddress) => {
    await deployer.deploy(StakingPool, libertasTokenAddress);
    await deployer.deploy(Tipping, StakingPool.address, libertasTokenAddress, owner, "10", "45", "45");
  }

  const deployUpgradeableLibertasToken = async () => {
    await deployer.deploy(LibertasProxyAdmin);
    await deployer.deploy(LibertasToken);
    await deployer.deploy(
      LibertasUpgradeableProxy,
      LibertasToken.address,
      LibertasProxyAdmin.address,
      owner
    );
    return LibertasUpgradeableProxy.address;
  }

  let testnetLibertasTokenAddress;

  const writeLibertasTokenAddress = (libertasTokenAddress) => {
    const json = {
      libertasTokenAddress
    };
    const data = JSON.stringify(json);
    fs.writeFileSync('./libertas_token_address.json', data);
  }

  const readLibertasTokenAddress = () => {
    return require('../libertas_token_address.json')['libertasTokenAddress'];
  }

  if (network === "rinkeby" || network === "rinkeby-fork") {
    testnetLibertasTokenAddress = await deployUpgradeableLibertasToken();
    await deployTippingAndStaking(testnetLibertasTokenAddress);
    console.log(`Deployed libertas on rinkeby: ${testnetLibertasTokenAddress}`);
    writeLibertasTokenAddress(testnetLibertasTokenAddress);
  } else if (network === "fantom_testnet" || network === "fantom_testnet-fork" || network === "fantom_ganache_fork") {
    testnetLibertasTokenAddress = readLibertasTokenAddress();
    await deployTippingAndStaking(addresses[1]);
    console.log(`Using libertas on rinkeby as start: ${testnetLibertasTokenAddress}`);
  } else if (network === "mainnet" || network === "mainnet-fork") {
    await deployTippingAndStaking(libertasTokenMainnetAddress);
    console.log(`Using libertas on mainnet: ${libertasTokenMainnetAddress}`);
  } else if (network === "fantom" || network === "fantom-fork") {
    await deployTippingAndStaking(addresses[1]);
    console.log(`Using libertas on mainnet: ${libertasTokenMainnetAddress}`);
  } else if (network === "development") {
    console.log('Using migrations from test...');
  } else {
    throw new Error(`Network ${network} is not supported!`);

  }

};
