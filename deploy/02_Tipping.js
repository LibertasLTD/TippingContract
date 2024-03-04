require("dotenv").config();
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log, get } = deployments;
  const { deployer } = await getNamedAccounts();

  const odeumV3 = await get("OdeumV3");
  const tipping = await ethers.getContractAt("Tipping", process.env.TIPPING_ADDRESS);
  await tipping.setOdeumAddress(odeumV3.address);
  log(`Tipping configured`);
};
module.exports.tags = ['Config'];



