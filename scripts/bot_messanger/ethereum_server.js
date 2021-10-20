const HDWalletProvider = require('@truffle/hdwallet-provider');
const { BN, ether, constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;
const nodeIpc = require('node-ipc');

const Bridge = artifacts.require("Bridge");

module.exports = (callback) => {

  const ipc = nodeIpc.default;

  ipc.config.id = 'ethereumBridge';
  ipc.config.retry = 1500;

  let bridge;

  ipc.serve(
    () => {

      ipc.server.on(
        'socket.disconnected',
        (socket, destroyedSocketID) => {
          ipc.log('client ' + destroyedSocketID + ' has disconnected!');
          callback();
        }
      );

      ipc.server.on(
        "message",
        (data, socket) => {
          ipc.log("calling perform bridging to start: ", data);
          const params = data.split('|');
          bridge.performBridgingToStart(
            params[0],
            params[1],
            params[2],
            new BN(params[3])
          ).then((receipt) => {
            ipc.log(`bridging to end performed with args: ${params} at ${receipt.transactionHash}`, data);
          }).catch((error) => {
            ipc.log(error);
            callback();
          });
        }
      );
      Bridge.at(process.env.BRIDGE_ON_ETHEREUM_ADDRESS).then((instance) => {
        bridge = instance;
        instance.RequestBridgingToEnd()
          .on("connected", (subscriptionId) => {
            ipc.log(`Connected to ${subscriptionId} subscription id.`);
          })
          .on('data', (event) => {
            const eventData = event.returnValues;
            ipc.log(`Gotta send event: ${event.event} at tx: ${event.transactionHash}`);
            ipc.server.broadcast(
              "message",
              {
                from: ipc.config.id,
                message: `${eventData._tokenAtStart}|${eventData._from}|${eventData._to}|${eventData._amount}|LIBERTAS|LIBERTAS`
              }
            );
          })
          .on('error', (error, receipt) => { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            ipc.log(error, '\n', receipt);
            callback();
          });
      });
    }
  );

  ipc.server.start();
}
