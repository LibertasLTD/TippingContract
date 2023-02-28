const { BN, ether, constants } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;

const Bridge = artifacts.require("Bridge");
const IERC20 = artifacts.require("IERC20");

const readLibertasTokenAddress = () => {
  return require("../libertas_token_address.json")["libertasTokenAddress"];
};

module.exports = (callback) => {
  Bridge.at(process.env.BRIDGE_ON_FANTOM_ADDRESS).then((instance) => {
    console.log(`Got bridge instance at ${instance.address}`);
    web3.eth.getAccounts().then((accounts) => {
      console.log(`Got account: ${accounts[0]}`);
      const startToken = readLibertasTokenAddress();
      console.log(`Got start token: ${startToken}`);
      instance.getEndTokenByStartToken(startToken).then((endToken) => {
        IERC20.at(endToken).then((token) => {
          const amountToBridge = new BN("100");
          console.log(`Got token: ${token.address}`);
          token
            .approve(instance.address, amountToBridge, { from: accounts[0] })
            .then(() => {
              token.balanceOf(accounts[0]).then((balance) => {
                console.log(
                  `Approved: ${amountToBridge}, with account balance: ${balance}`
                );
                instance
                  .requestBridgingToStart(
                    startToken,
                    token.address,
                    accounts[0],
                    amountToBridge,
                    { from: accounts[0] }
                  )
                  .then((receipt) => {
                    console.log(receipt);
                    token.balanceOf(accounts[0]).then((newBalance) => {
                      console.log(
                        `Performed requesting bridge to start with new balance of ${newBalance}`
                      );
                      callback();
                    });
                  })
                  .catch((err) => {
                    console.error(err);
                    callback();
                  });
              });
            });
        });
      });
    });
  });
};
