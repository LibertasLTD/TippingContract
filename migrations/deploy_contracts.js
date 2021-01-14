const LibertasToken = artifacts.require("LibertasToken");
const StakingPool = artifacts.require("StakingPool");
const Tipping = artifacts.require("Tipping");
const address = require('../address.json');

module.exports = async function (deployer, _network) {
  await deployer.deploy(LibertasToken);
  await deployer.deploy(StakingPool, LibertasToken.address);
  await deployer.deploy(Tipping, StakingPool.address, LibertasToken.address, address[_network].usdt, address[_network].weth);
};
