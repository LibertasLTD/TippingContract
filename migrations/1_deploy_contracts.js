const fs = require('fs');
const { constants } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;

const Bridge = artifacts.require("Bridge");
const BridgedStandardERC20 = artifacts.require("BridgedStandardERC20");
// const LibertasUpgradeableProxy = artifacts.require("LibertasUpgradeableProxy");
// const LibertasProxyAdmin = artifacts.require("LibertasProxyAdmin");

const LibertasToken = artifacts.require("LibertasToken");
const StakingPool = artifacts.require("StakingPool");
const Tipping = artifacts.require("Tipping");

module.exports = async (deployer, network, accounts) => {

  //const libertasTokenMainnetAddress = "0x49184E6dAe8C8ecD89d8Bdc1B950c597b8167c90";
  const libertasTokenFantomMainnetAddress = "0x9122F3f35aA2324463b637eC94780bBCAb1c5a8C";
  // const testOdeumAddress = "0x02e047d5b9391fcCF993316b5447547F8bd166ba";
  const bot_massenger = "0x8D587adbDA67F08827e8313a8Ecc929c753F5850";
  const owner = accounts[0];
  const team_wallet = "0x0305c2119bBDC01F3F50c10f63e68920D3d61915";
  const burn_wallet = "0x44b48AB426251b53DC9EfC20f5668D89aaF3542F";

  const deployTippingAndStaking = async (libertasTokenAddress) => {
    await deployer.deploy(StakingPool, libertasTokenAddress);
    await deployer.deploy(Tipping, StakingPool.address, libertasTokenAddress, team_wallet, burn_wallet, "10", "45", "45");
    var staking = await StakingPool.deployed();
    await staking.grantRole("0x00", Tipping.address, {from: owner});
  }

  // const deployUpgradeableLibertasToken = async () => {
  //   await deployer.deploy(LibertasProxyAdmin);
  //   await deployer.deploy(LibertasToken);
  //   await deployer.deploy(
  //     LibertasUpgradeableProxy,
  //     LibertasToken.address,
  //     LibertasProxyAdmin.address,
  //     owner
  //   );
  //   return LibertasUpgradeableProxy.address;
  // }

  const deployBridgeAtEnd = async (libertasTokenAddress) => {
    await deployer.deploy(BridgedStandardERC20);

    await deployer.deploy(
      Bridge,
      false, // direction - if true then deploy on ethereum, false - on fantom
        BridgedStandardERC20.address,
        bot_massenger, // дать bot_massenger
      libertasTokenAddress,
      "LIBERTAS",
      "ODEUM"
    );

    console.log('Bridge ADDRESS: ' + Bridge.address);
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
        bot_massenger,
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
    testnetLibertasTokenAddress = readLibertasTokenAddress();
    // testnetLibertasTokenAddress = await deployUpgradeableLibertasToken();
    await deployTippingAndStaking(testnetLibertasTokenAddress);
    const bridgeAddress = await deployBridgeAtStart(testnetLibertasTokenAddress);

    console.log(`Deployed libertas on rinkeby: ${testnetLibertasTokenAddress}`);
    console.log(`Deployed bridge on rinkeby: ${bridgeAddress}`);
    writeLibertasTokenAddress(testnetLibertasTokenAddress);

  } else if (network == "fantom_testnet" || network == "fantom_ganache_fork") {

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
