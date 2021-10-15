const HDWalletProvider = require("@truffle/hdwallet-provider");
const { BN, ether, constants } = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;
const nodeIpc = require("node-ipc");

const Bridge = artifacts.require("Bridge");

module.exports = (callback) => {

  const ipc = nodeIpc.default;

  ipc.config.id = "fantomBridge";
  ipc.config.retry = 1500;

  ipc.connectTo(
    "ethereumBridge",
    () => {

      ipc.of.ethereum.on(
        "connect",
        () => {
          ipc.log("## connected to ethereum bridge ##".rainbow, ipc.config.delay);
          ipc.of.ethereumBridge.emit(
            "message",
            `Fantom bridge is connected!`
          );
        }
      );

      ipc.of.ethereumBridge.on(
        "disconnect",
        () => {
          ipc.log("disconnected from ethereum bridge".notice);
          callback();
        }
      );

      ipc.of.ethereumBridge.on(
        "message",
        (data) => {
          ipc.log("got a message from ethereum bridge : ".debug, data);
        }
      );

      Bridge.at(process.env.BRIDGE_ON_FANTOM_ADDRESS).then((instance) => {

        instance.events.RequestBridgingToStart()
          .on("connected", (subscriptionId) => {
            ipc.log(`Connected to ${subscriptionId} subscription id.`);
          })
          .on('data', (event) => {
            const eventData = event.returnValues;
            ipc.of.ethereumBridge.emit(
              "RequestBridgingToStart",
              `${eventData._tokenAtEnd}|${eventData._from}|${eventData._to}|${eventData._amount}`
            );
          })
          .on('error', (error, receipt) => { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            ipc.log(receipt);
            callback();
          });

        ipc.of.ethereumBridge.on(
          "RequestBridgingToEnd",
          (data) => {
            ipc.log("calling perform bridging to end: ", data);
            const params = data.split('|');
            instance.performBridgingToEnd(
              params[0],
              params[1],
              new BN(params[2]),
              params[3],
              params[4],
            ).then((receipt) => {
              ipc.log(`bridging to end performed with args: ${params}`, data);
            }).catch((error) => {
              ipc.log(error);
              callback();
            });
          }
        );

      });
    }
  );
}
