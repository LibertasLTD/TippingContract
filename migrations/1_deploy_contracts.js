const LibertasToken = artifacts.require("LibertasToken");
const StakingPool = artifacts.require("StakingPool");
const Tipping = artifacts.require("Tipping");
const address = require('../address.json');

module.exports = async function (deployer, _network) {
  if (_network != "mainnet") {
    await deployer.deploy(LibertasToken);
    const instanceLibertas = await LibertasToken.deployed();
    await deployer.deploy(StakingPool, instanceLibertas.address);
    const instanceStaking = await StakingPool.deployed();
    await deployer.deploy(Tipping, instanceStaking.address, instanceLibertas.address, address[_network].usdt, address[_network].weth);
  } else {
    await deployer.deploy(StakingPool, address[_network].libertas);
    const instanceStaking = await StakingPool.deployed();
    await deployer.deploy(Tipping, instanceStaking.address, address[_network].libertas, address[_network].usdt, address[_network].weth);
  }
};