require('dotenv').config();
const { BN, ether, constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;
const ganache = require("ganache-cli");

const port = 8545;

const server = ganache.server({
  ws: true,
  mnemonic: process.env.MNEMONIC,
  default_balance_ether: 10,
  fork: "https://rpc.ftm.tools/"
});

server.listen(port, (err, blockchain) => {
  if (err) {
    console.log(err);
  } else {
    console.log(blockchain);
  }
});
