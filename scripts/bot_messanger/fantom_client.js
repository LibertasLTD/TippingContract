const HDWalletProvider = require("@truffle/hdwallet-provider");
const { BN, ether, constants } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;
const nodeIpc = require("node-ipc");

const Bridge = artifacts.require("Bridge");

let bridge;

module.exports = (callback) => {

    const ipc = nodeIpc.default;

    ipc.config.id = "fantomBridge";
    ipc.config.retry = 1500;

    ipc.connectTo(
        "ethereumBridge",
        () => {

            ipc.of.ethereumBridge.on(
                "message",
                (data) => {
                    ipc.log("calling perform bridging to end: ", data);
                    const params = data.message.split('|');
                    bridge.performBridgingToEnd(
                        params[0],
                        params[1],
                        new BN(params[3]),
                        params[4],
                        params[5]
                    ).then((receipt) => {
                        ipc.log(`bridging to end performed with args: ${params}`);
                    }).catch((error) => {
                        ipc.log(error);
                        callback();
                    });
                }
            );

            ipc.of.ethereumBridge.on(
                "connect",
                () => {
                    ipc.log("## connected to ethereum bridge ##".rainbow, ipc.config.delay);
                    Bridge.at(process.env.BRIDGE_ON_FANTOM_ADDRESS).then((instance) => {
                        bridge = instance;
                        instance.RequestBridgingToStart()
                            .on("connected", (subscriptionId) => {
                                ipc.log(`Connected to ${subscriptionId} subscription id.`);
                            })
                            .on('data', (event) => {
                                const eventData = event.returnValues;
                                ipc.log(`Gotta send event: ${event.event} at tx: ${event.transactionHash}`);
                                ipc.of.ethereumBridge.emit(
                                    "message",
                                    `${eventData._tokenAtStart}|${eventData._tokenAtEnd}|${eventData._from}|${eventData._to}|${eventData._amount}`
                                );
                            })
                            .on('error', (error, receipt) => { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
                                ipc.log(receipt);
                                callback();
                            });
                    });
                }
            );

            ipc.of.ethereumBridge.on(
                "disconnect",
                () => {
                    ipc.log("disconnected from ethereum bridge".notice);
                    callback();
                }
            );
        }
    );
}
