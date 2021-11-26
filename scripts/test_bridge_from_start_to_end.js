const { BN, ether, constants } = require('@openzeppelin/test-helpers');
const fs = require("fs");
const { ZERO_ADDRESS } = constants;
const libertasTokenAddressJSON = JSON.parse(fs.readFileSync('../libertas_token_address.json', 'utf8'));

const Bridge = artifacts.require("Bridge");
const LibertasToken = libertasTokenAddressJSON.libertasTokenAddress;
const IERC20 = artifacts.require("IERC20");

module.exports = (callback) => {
    Bridge.at(process.env.BRIDGE_ON_ETHEREUM_ADDRESS).then((instance) => {
        console.log(`Got bridge instance at ${instance.address}`);
        web3.eth.getAccounts().then((accounts) => {
            console.log(`Got account: ${accounts[0]}`);
            IERC20.at(LibertasToken).then((token) => {
                const amountToBridge = new BN('100');
                console.log(`Got token: ${token.address}`);
                token.approve(instance.address, amountToBridge, { from: accounts[0] }).then(() => {
                    token.balanceOf(accounts[0]).then((balance) => {
                        console.log(`Approved: ${amountToBridge}, with account balance: ${balance}`);
                        instance.requestBridgingToEnd(token.address, accounts[0], amountToBridge, { from: accounts[0] })
                            .then((receipt) => {
                                console.log(receipt);
                                token.balanceOf(accounts[0]).then((newBalance) => {
                                    console.log(`Performed request bridging to end with new balance of: ${newBalance}`);
                                    callback();
                                });
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
