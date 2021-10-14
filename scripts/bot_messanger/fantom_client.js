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

        ipc.of.ethereumBridge.on(
          "RequestBridgingToEnd",
          (data) => {
            ipc.log("calling perform bridging to end: ", data);
          }
        );

        const timerId = setInterval(
          () => {
            try {
              const eventData = obtainEventData(instance, "RequestBridgingToStart");
              if (checkEvent(eventData)) {
                ipc.of.ethereumBridge.emit(
                  "RequestBridgingToStart",
                  `${eventData.startToken}|${eventData.from}|${eventData.to}|${eventData.amount}`
                );
              }
            } catch (e) {
              clearTimer(timedId);
              callback()
            }
          },
          process.env.BOT_MESSANGER_POLLING_TIME
        );
      });
    }
  );
}
