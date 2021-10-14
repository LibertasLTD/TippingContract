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
    const stakingPool = await deployer.deploy(StakingPool, libertasTokenAddress);
    await deployer.deploy(Tipping, stakingPool.address, libertasTokenAddress, "10", "45", "45");
  }

  const deployUpgradeableLibertasToken = async () => {
    const libertasProxyAdmin = await deployer.deploy(LibertasProxyAdmin);
    const libertas = await deployer.deploy(LibertasToken);
    const libertasUpgradeableProxy = await deployer.deploy(
      LibertasUpgradeableProxy,
      libertas.address,
      libertasProxyAdmin.address,
      owner
    );
    return libertasUpgradeableProxy.address;
  }

  // direction - if true then deploy on ethereum, false - on fantom
  const deployBridge = async (direction, libertasTokenAddress) => {
    const bridgedStandartERC20 = await deployer.deploy(BridgedStandardERC20);
    const bridge = await deployer.deploy(
      Bridge,
      direction,
      bridgedStandartERC20.address,
      owner,
      libertasTokenAddress
    );
    return bridge.address;
  }

  let testnetLibertasTokenAddress;

  if (network === "rinkeby") {

    testnetLibertasTokenAddress = await deployUpgradeableLibertasToken();
    await deployTippingAndStaking(libertasTokenAddress);
    const bridgeAddress = await deployBridge(true, libertasTokenAddress);

    console.log(`Deployed libertas on rinkeby: ${libertasTokenAddress}`);
    console.log(`Deployed bridge on rinkeby: ${bridgeAddress}`);

  } else if (network === "fantom_testnet") {

    const bridgeAddress = await deployBridge(false, testnetLibertasTokenAddress);
    await deployTippingAndStaking(testnetLibertasTokenAddress);

    console.log(`Using libertas on rinkeby: ${testnetLibertasTokenAddress}`);
    console.log(`Deployed bridge on fantom testnet: ${bridgeAddress}`);

  } else if (network === "mainnet") {

    await deployTippingAndStaking(libertasTokenMainnetAddress);
    const bridgeAddress = await deployBridge(true, libertasTokenMainnetAddress);

    console.log(`Using libertas on mainnet: ${libertasTokenAddress}`);
    console.log(`Deployed bridge on mainnet: ${bridgeAddress}`);

  } else if (network === "fantom") {

    const bridgeAddress = await deployBridge(false, libertasTokenMainnetAddress);
    await deployTippingAndStaking(libertasTokenMainnetAddress);

    console.log(`Using libertas on mainnet: ${libertasTokenMainnetAddress}`);
    console.log(`Deployed bridge on fantom: ${bridgeAddress}`);

  } else {
    throw new Error(`Network ${network} is not supported!`);
  }

};
