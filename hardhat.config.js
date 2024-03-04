require("dotenv").config();
require("@nomiclabs/hardhat-ethers");
require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-etherscan");
require("@nomicfoundation/hardhat-chai-matchers");
require("hardhat-tracer");
require("hardhat-deploy");
require("hardhat-contract-sizer");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("@primitivefi/hardhat-dodoc");

const { 
    ACC_PRIVATE_KEY,
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
    namedAccounts: {
        deployer: {
            default: 0,
        }
    },
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
            forking: {
                url: `https://rpc.ankr.com/eth`,
            }
        },
        localhost: {
            url: "http://127.0.0.1:8545",
        },
        arbitrum_mainnet: {
            url: `https://rpc.ankr.com/arbitrum`,
            accounts: [ACC_PRIVATE_KEY],
            verify: {
                etherscan: {
                    apiKey: ARBISCAN_API_KEY
                }
            },
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
    skipFiles: ["node_modules"],
    gasReporter: {
        enabled: true,
        currency: 'USD',
        coinmarketcap: "59edb5da-236a-4b3d-84e2-0241fd89b641",
        url: "https://arb1.arbitrum.io/rpc",
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
};
