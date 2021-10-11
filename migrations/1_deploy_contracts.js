const LibertasToken = artifacts.require("LibertasToken");
const StakingPool = artifacts.require("StakingPool");
const Tipping = artifacts.require("Tipping");

module.exports = async function (deployer, _network) {
  if (_network != "mainnet") {
    await deployer.deploy(LibertasToken);
    const instanceLibertas = await LibertasToken.deployed();
    await deployer.deploy(StakingPool, instanceLibertas.address);
    const instanceStaking = await StakingPool.deployed();
    await deployer.deploy(Tipping, instanceStaking.address, instanceLibertas.address, "10", "45", "45");
  } else {
    await deployer.deploy(StakingPool, "0x49184E6dAe8C8ecD89d8Bdc1B950c597b8167c90");
    const instanceStaking = await StakingPool.deployed();
    await deployer.deploy(Tipping, instanceStaking.address, "0x49184E6dAe8C8ecD89d8Bdc1B950c597b8167c90", "10", "45", "45");
  }
};