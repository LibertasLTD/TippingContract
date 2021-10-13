const HDWalletProvider = require('@truffle/hdwallet-provider');
const { BN, ether, constants } = require('@openzeppelin/test-helpers')
const { ZERO_ADDRESS } = constants

const Bridge = artifacts.require("Bridge");
const BridgedStandardERC20 = artifacts.require("BridgedStandardERC20");

const isInTestingMode = process.env.BOT_MESSANGER_TESTING_MODE === "true";
const rinkebyURL = `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_RINKEBY_KEY}`;
const mainnetURL = `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_MAINNET_KEY}`;
const fantomTestNetURL = `https://rpc.testnet.fantom.network`;
const fantomMainnet = `https://rpc.ftm.tools/`;

module.exports = async (callback) => {

  // let ethWeb3;
  let fanWeb3;

  if (isInTestingMode) {
    // ethWeb3 = new Web3(new HDWalletProvider(process.env.MNEMONIC, rinkebyURL));
    fanWeb3 = new Web3(new HDWalletProvider(process.env.MNEMONIC, fantomTestNetURL));
  } else {
    // ethWeb3 = new Web3(new HDWalletProvider(process.env.MNEMONIC, mainnetURL));
    fanWeb3 = new Web3(new HDWalletProvider(process.env.MNEMONIC, fantomMainnet));
  }

  console.log(ethWeb3);
  console.log(fanWeb3);

}
