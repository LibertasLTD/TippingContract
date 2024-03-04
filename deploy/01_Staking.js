module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const odeumV3 = await get("OdeumV3")
  const deployResult = await deploy("StakingPool", {
      from: deployer,
          args: [
              odeumV3.address
          ]
    });
    if (deployResult.newlyDeployed) {
        log(`Staking pool deployed at ${deployResult.address}`);
    }
};
module.exports.tags = ['Deploy'];


