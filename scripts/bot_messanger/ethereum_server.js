const HDWalletProvider = require('@truffle/hdwallet-provider');
const { BN, ether, constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;
const nodeIpc = require('node-ipc');

const Bridge = artifacts.require("Bridge");

module.exports = (callback) => {

  const ipc = nodeIpc.default;

  ipc.config.id = 'ethereumBridge';
  ipc.config.retry = 1500;

  ipc.serve(
    () => {

      console.log('Serving...');

      // ipc.server.emit(
      //   {
      //     address : '127.0.0.1', //any hostname will work
      //     port    : ipc.config.networkPort
      //   },
      //   'message',
      //   {
      //     from    : ipc.config.id,
      //     message : 'Hello'
      //   }
      // );

      // ipc.server.emit(
      //   socket,
      //   'message',
      //   ''
      // );

      ipc.server.on(
        'message',
        (data, socket) => {
          ipc.log('got a message : '.debug, data);
          ipc.server.emit(
            socket,
            'message',
            'Hello, Fantom bridge! Ethereum Bridge is serving you!'
          );
        }
      );

      ipc.server.on(
        'socket.disconnected',
        (socket, destroyedSocketID) => {
          ipc.log('client ' + destroyedSocketID + ' has disconnected!');
          callback();
        }
      );

      Bridge.at(process.env.BRIDGE_ON_ETHEREUM_ADDRESS).then((instance) => {

        instance.events.RequestBridgingToEnd()
          .on("connected", (subscriptionId) => {
            ipc.log(`Connected to ${subscriptionId} subscription id.`);
          })
          .on('data', (event) => {
            const eventData = event.returnValues;
            ipc.of.server.emit(
              {
                address: '127.0.0.1',
                port: ipc.config.networkPort
              },
              "RequestBridgingToEnd",
              `${eventData._tokenAtStart}|${eventData._from}|${eventData._to}|${eventData._amount}|LIBERTAS|LIBERTAS`
            );
          })
          .on('error', (error, receipt) => { // If the transaction was rejected by the network with a receipt, the second parameter will be the receipt.
            ipc.log(receipt);
            callback();
          });

        ipc.of.server.on(
          "RequestBridgingToStart",
          (data) => {
            ipc.log("calling perform bridging to start: ", data);
            const params = data.split('|');
            instance.performBridgingToStart(
              params[0],
              params[1],
              new BN(params[2])
            ).then((receipt) => {
              ipc.log(`bridging to end performed with args: ${params} at ${receipt.transactionHash}`, data);
            }).catch((error) => {
              console.error(error);
              callback();
            });
          }
        );

      });
    }
  );

  ipc.server.start();
}
