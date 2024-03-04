require("dotenv").config();
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const deployResult = await deploy("OdeumV3", {
      from: deployer,
          args: [
              process.env.OWNER_WALLET_ADDRESS,
              process.env.POOL_WALLET_ADDRESS,
              process.env.ROUTER_V2_ADDRESS,
          ]
    });
    if (deployResult.newlyDeployed) {
        log(`OdeumV3 deployed at ${deployResult.address}`);
    }
};
module.exports.tags = ['Deploy'];

