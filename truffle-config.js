require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
     host: "127.0.0.1",     // Localhost (default: none)
     port: 8545,            // Standard Ethereum port (default: none)
     network_id: "*",       // Any network (default: none)
    },
    kovan: {
      provider: function() {
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://eth-kovan.alchemyapi.io/v2/${process.env.ALCHEMY_KOVAN_KEY}`
        )
      },
      network_id: 42
    },
    rinkeby: {
      provider: function() {
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://eth-rinkeby.alchemyapi.io/v2/${process.env.ALCHEMY_RINKEBY_KEY}`
        )
      },
      network_id: 4
    },
    mainnet: {
      provider: function() {
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_MAINNET_KEY}`
        )
      },
      gas: 5000000,
      gasPrice: 25000000000,
      confirmations: 2,
      network_id: 1
    },
    fantom_testnet: {
      provider: function() {
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://rpc.testnet.fantom.network`
        )
      },
      network_id: 0xfa2
    },
    fantom: {
      provider: function() {
        return new HDWalletProvider(
          process.env.MNEMONIC,
          `https://rpc.ftm.tools/`
        )
      },
      network_id: 250
    },
  },
  mocha: {
    timeout: 120000
  },
  compilers: {
    solc: {
      version: "0.7.0",
      settings: {
        optimizer: {
          enabled: false,
          runs: 200
        }
      }
    }
  },
  plugins: [
    'truffle-plugin-verify'
  ],
  api_keys: {
    etherscan: process.env.ETHERSCAN_API_KEY
  }
};
