# README

## Description
All the smart-contracts are compiled using solidity version 0.7.0:

LibertasToken - ERC20 token in Ethereum (name: "LIBERTAS", symbol: "LIBS").

BridgedStandardERC20 - ERC20 token in Fantom.

Bridge - the bridge contract, which allows transferring tokens between Ethereum and Fantom.

StakingPool - allows staking Libertas tokens for reward.

Tipping - with this contract, users can send tips to content creators, with each transaction:
- 4.5% distributed among contributors
- 4.5% are sent to the customer's wallet (there is no one on Fantom yet)
- 1% - burned
- 90% - are sent to the wallet of the content creator

All available configuration parameters are in the `.env` file.

## INSTALL
### Truffle and other tools
Install truffle: **npm install -g truffle**

Install truffle: **npm install -g ganache-cli**

Install truffle-plugin-verify: **npm -D truffle-plugin-verify**

Install dependencies: **cd `<path to the cloned repo>` && yarn**

## RUN
Create the .env file in the project's root directory,
paste following variables into the .env file, specify correct API keys and mnemonics:
```
ALCHEMY_RINKEBY_KEY=
ALCHEMY_MAINNET_KEY=
MNEMONIC=
MNEMONIC_FANTOM=
ETHERSCAN_API_KEY=
FTMSCAN_API_KEY=
BRIDGE_ON_ETHEREUM_ADDRESS=
BRIDGE_ON_FANTOM_ADDRESS=
```

Open a terminal window, cd to project's root and run the following commands:

**truffle compile**

**ganache-cli -e 1000**

## RUN UNIT TESTS
Open a new terminal window, run: **truffle test**

## VERIFY
Fantom: **yarn verify_fantom --network** `<network>`

Ethereum: **yarn verify_ethereum --network** `<network>`

P.S. Verification doesn't work for the Fantom testnet

## TEST BRIDGE (LOCAL FORK)
// run ganache fork of fantom testnet

**yarn fork_fantom_testnet**

// deploy smart-contracts into the fork

**truffle migrate --network fantom_ganache_fork**

### RUN TEST

**yarn test**

## DEPLOYED SMART CONTRACTS ADDRESSES

## ETHEREUM 
MAINNET
* Bridge: Not deployed yet.
* Tipping: 
* StakingPool: 
* LibertasUpgradeableProxy: 
* LibertasToken: https://etherscan.io/address/0x49184E6dAe8C8ecD89d8Bdc1B950c597b8167c90
* LibertasProxyAdmin: 

RINKEBY
* Bridge: https://rinkeby.etherscan.io/address/0x19f3d469CDd58B183F1BeE060ae1eAc09aC77666#code
* Tipping: https://rinkeby.etherscan.io/address/0xaf95972f59A003d5f4058B95139F703aB8856292#code
* StakingPool: https://rinkeby.etherscan.io/address/0xb167F4bd8c279428E19272B32e23f91671D212df#code
* LibertasUpgradeableProxy: https://rinkeby.etherscan.io/address/0x006024948d6dD73c47Ce4203659beCC10c8CAe8C#code
* LibertasToken: https://rinkeby.etherscan.io/address/0x9ff0537bb8461e6f9e66680aa83780940ba45253#code
* LibertasProxyAdmin: https://rinkeby.etherscan.io/address/0x75c9969BbbA173Cc24E1f2f3D0832c325d6Cca38#code

## FANTOM
MAINNET
* Bridge: Not deployed yet.
* BridgedStandardERC20: Not deployed yet.
* Tipping: Not deployed yet.
* StakingPool: Not deployed yet.

TESTNET
* Bridge: https://testnet.ftmscan.com/address/0x4862425a8b4450D5a761D966fEd03beb05DCcB7c#code
* BridgedStandardERC20: https://testnet.ftmscan.com/address/0xC46bD9Dd919D314e8A5Fe83DAA7B0Ed397E408d5#code
* Tipping: https://testnet.ftmscan.com/address/0x96e630D1E64a8D9de624CbdEC0Dad5C256EE38Ad#code
* StakingPool: https://testnet.ftmscan.com/address/0xA5baF406e12A4b7907ee04A052cDC55027A370f0#code
