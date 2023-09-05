require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-tracer");
require("hardhat-contract-sizer");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("@primitivefi/hardhat-dodoc");

const { 
    FTMSCAN_API_KEY,
    ACC_PRIVATE_KEY,
    ALCHEMY_ETHERIUM_API_KEY,
    ALCHEMY_ARB_GOERLI_API_KEY,
    ALCHEMY_ARBITRUM_API_KEY,
    ARBISCAN_API_KEY
} = process.env;

module.exports = {
    solidity: {
        version: "0.8.18",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
            forking: {
                url: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_ETHERIUM_API_KEY}`,
                blockNumber: 18061880
            }
        },
        localhost: {
            url: "http://127.0.0.1:8545",
        },
        fantom_mainnet: {
            url: `https://rpc.ankr.com/fantom/`,
            accounts: [ACC_PRIVATE_KEY],
        },
        fantom_testnet: {
            url: `https://fantom-testnet.public.blastapi.io	`,
            accounts: [ACC_PRIVATE_KEY],
        },
        arbitrum_mainnet: {
            url: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_ARBITRUM_API_KEY}`,
            accounts: [ACC_PRIVATE_KEY],
        },
        arbitrum_testnet: {
            url: `https://arb-goerli.g.alchemy.com/v2/${ALCHEMY_ARB_GOERLI_API_KEY}`,
            accounts: [ACC_PRIVATE_KEY],
        },
    },
    mocha: {
        timeout: 20000000000,
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
    etherscan: {
        apiKey: {
            polygonMumbai: FTMSCAN_API_KEY,
        },
    },
    skipFiles: ["node_modules"],
    gasReporter: {
        enabled: true,
        url: "http://localhost:8545",
    },
    dodoc: {
        exclude: ["mock", "lin", "errors"],
        runOnCompile: false,
        freshOutput: true,
        outputDir: "./docs/contracts",
    },
    contractSizer: {
        alphaSort: true,
        disambiguatePaths: true,
        strict: true,
        runOnCompile: true,
    },
    etherscan: {
        apiKey: {
            fantom: FTMSCAN_API_KEY,
            ftmTestnet: FTMSCAN_API_KEY,
            arbitrumOne: ARBISCAN_API_KEY,
            arbitrumGoerli: ARBISCAN_API_KEY
        },
    },
};
