const HDWalletProvider = require('@truffle/hdwallet-provider');
const { BN, ether, constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;

const Bridge = artifacts.require("Bridge");
const LibertasUpgradeableProxy = artifacts.require("LibertasUpgradeableProxy");
const IERC20 = artifacts.require("IERC20");

module.exports = (callback) => {
  Bridge.at(process.env.BRIDGE_ON_ETHEREUM_ADDRESS).then((instance) => {
      console.log(`Got bridge instance at ${instance.address}`);
      web3.eth.getAccounts().then((accounts) => {
        console.log(`Got account: ${accounts[0]}`);
        IERC20.at(LibertasUpgradeableProxy.address).then((token) => {
          const amountToBridge = new BN('100');
          console.log(`Got token: ${token.address}`);
          token.approve(instance.address, amountToBridge, { from: accounts[0] }).then(() => {
            token.balanceOf(accounts[0]).then((balance) => {
              console.log(`Approved: ${amountToBridge}, with account balance: ${balance}`);
              instance.requestBridgingToEnd(token.address, accounts[0], amountToBridge, { from: accounts[0] })
                .then((receipt) => {
                  console.log(receipt);
                  callback();
                }).catch((err) => {
                  console.error(err);
                  callback();
                });
            });
          });
        });
      });
  });
}
