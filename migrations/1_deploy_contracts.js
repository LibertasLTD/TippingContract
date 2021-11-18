const fs = require('fs');
const { constants } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;

const Bridge = artifacts.require("Bridge");
const BridgedStandardERC20 = artifacts.require("BridgedStandardERC20");
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

  const deployBridgeAtEnd = async (libertasTokenAddress) => {
    await deployer.deploy(BridgedStandardERC20);
    await deployer.deploy(
      Bridge,
      false, // direction - if true then deploy on ethereum, false - on fantom
      BridgedStandardERC20.address,
      owner,
      libertasTokenAddress,
      "LIBERTAS",
      "LIBS"
    );
    const bridge = await Bridge.deployed();
    const bridgedLibertasTokenAddress = await bridge.getEndTokenByStartToken(libertasTokenAddress);
    console.log(`BridgedLibertasToken deployed: ${bridgedLibertasTokenAddress}`);
    return [Bridge.address, bridgedLibertasTokenAddress];
  }

  const deployBridgeAtStart = async (libertasTokenAddress) => {
    await deployer.deploy(
      Bridge,
      true, // direction - if true then deploy on ethereum, false - on fantom
      ZERO_ADDRESS,
      owner,
      libertasTokenAddress,
      "LIBERTAS",
      "LIBS"
    );
    return Bridge.address;
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
    const bridgeAddress = await deployBridgeAtStart(testnetLibertasTokenAddress);

    console.log(`Deployed libertas on rinkeby: ${testnetLibertasTokenAddress}`);
    console.log(`Deployed bridge on rinkeby: ${bridgeAddress}`);
    writeLibertasTokenAddress(testnetLibertasTokenAddress);

  } else if (network === "fantom_testnet" || network === "fantom_testnet-fork" || network === "fantom_ganache_fork") {

    testnetLibertasTokenAddress = readLibertasTokenAddress();
    const addresses = await deployBridgeAtEnd(testnetLibertasTokenAddress);
    await deployTippingAndStaking(addresses[1]);

    console.log(`Using libertas on rinkeby as start: ${testnetLibertasTokenAddress}`);
    console.log(`Using libertas bridged version on fantom testnet: ${addresses[1]}`);
    console.log(`Deployed bridge on fantom testnet: ${addresses[0]}`);

  } else if (network === "mainnet" || network === "mainnet-fork") {

    await deployTippingAndStaking(libertasTokenMainnetAddress);
    const bridgeAddress = await deployBridgeAtStart(libertasTokenMainnetAddress);

    console.log(`Using libertas on mainnet: ${libertasTokenMainnetAddress}`);
    console.log(`Deployed bridge on mainnet: ${bridgeAddress}`);

  } else if (network === "fantom" || network === "fantom-fork") {

    const addresses = await deployBridgeAtEnd(libertasTokenMainnetAddress);
    await deployTippingAndStaking(addresses[1]);

    console.log(`Using libertas on mainnet: ${libertasTokenMainnetAddress}`);
    console.log(`Using libertas bridged version on fantom: ${addresses[1]}`);
    console.log(`Deployed bridge on fantom: ${addresses[0]}`);
  } else if (network === "development" || network === "soliditycoverage") {
    console.log('Using migrations from test...');
  } else {
    throw new Error(`Network ${network} is not supported!`);

  }

};
