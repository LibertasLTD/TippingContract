const HDWalletProvider = require('@truffle/hdwallet-provider');
const { BN, ether, constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;
const nodeIpc = require('node-ipc');
const { checkEvent, obtainEventData } = require('./utils.js');

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

        ipc.of.ethereumBridge.on(
          "RequestBridgingToStart",
          (data) => {
            ipc.log("calling perform bridging to start: ", data);
          }
        );

        const timerId = setInterval(
          () => {
            try {
              const eventData = obtainEventData(instance, "RequestBridgingToEnd");
              if (checkEvent(eventData)) {
                ipc.of.ethereumBridge.emit(
                  "RequestBridgingToEnd",
                  `${eventData.endToken}|${eventData.from}|${eventData.to}|${eventData.amount}`
                );
              }
            } catch (e) {
              clearTimer(timedId);
              callback();
            }
          },
          process.env.BOT_MESSANGER_POLLING_TIME
        );
      });
    }
  );

  ipc.server.start();
}
