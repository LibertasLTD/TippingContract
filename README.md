## ODEUM

#### Table on contents

[Prereqiusites](#preqs)  
[Build](#build)  
[Test](#tests)  
[Run Scripts](#run)  
[Deploy](#deploy)  
[Networks](#networks)  
[Wallets](#wallets)  
[Smart Contracts Upgradeability](#proxy)  
[Structure of Deploy Output File](#output)  
[Logic](#logic)  
[[Known Issues]](#issues)

<a name="preqs">

#### Prerequisites

- Install [Git](https://git-scm.com/)
- Install [Node.js](https://nodejs.org/en/download/)
- Clone this repository with `git clone <repo URL>`
- Navigate to the directory with the cloned code
- Install Hardhat with `npm install --save-dev hardhat`
- Install all required dependencies with `npm install`
- Create a file called `.env` in the root of the project with the same contents as `.env.template`
- Place your secret API keys, private keys, etc. to the `.env` file

  :warning:**DO NOT SHARE YOUR .env FILE IN ANY WAY OR YOU RISK TO LOSE ALL YOUR FUNDS**:warning:

<a name="build"/>

### Build

```
npx hardhat compile
```

<a name="tests"/>

### Test

```
npx hardhat test --network hardhat
```

<a name="run"/>

### Run Scripts

```
npx hardhat run <script file name here> --network <network name here>
```

<a name="deploy"/>

### Deploy
Before deployment, check the correctness of the contents of the files `scripts/deployInput.json`(see [Structure of Deploy Input File](#input)) and `.env`.
```
npx hardhat run scripts/deploy.js --network <network name here>
```

Deployment script takes about 5 minutes to complete. Please, be patient!  
After the contracts get deployed you can find their _addresses_ and code verification _URLs_ in the `scripts/deployOutput.json` file (see [Structure of Deploy Output File](#output)).  
Note that this file only refreshes the addresses of contracts that have been successfully deployed (or redeployed). If you deploy only a single contract then its address would get updated and all other addresses would remain untouched and would link to _old_ contracts.
Please, **do not** write anything to `deployOutput.json` file yourself! It is a read-only file.  
All deployed contracts _are verified_ on [Ftmscan](https://ftmscan.com/) or [Arbiscan](https://arbiscan.io/).

<a name="networks"/>

### Networks

а) **Test** network
Make sure you have _enough test tokens_ for testnet.

```
npx hardhat run <script name here> --network fantom_testnet
```

b) **Main** network
Make sure you have _enough real tokens_ in your wallet. Deployment to the mainnet costs money!

```
npx hardhat run <script name here> --network fantom_mainnet
```

c) **Local** network

- Run Hardhat node locally:

```
npx hardhat node
```

- Run sripts on the node

```
npx hardhat run <script name here> --network localhost
```

<a name="wallets"/>

### Wallets

For deployment you will need to use either _your existing wallet_ or _a generated one_.

#### Using an existing wallet

If you choose to use your existing wallet, then you will need to be able to export (copy/paste) its private key. For example, you can export private key from your MetaMask wallet.  
Wallet's address and private key should be pasted into the `.env` file (see [Prerequisites](#preqs)).

#### Creating a new wallet

If you choose to create a fresh wallet for this project, you should use `createWallet` script from `scripts/` directory.

```
node scripts/createWallet.js
```

This will generate a single new wallet and show its address and private key. **Save** them somewhere else!  
A new wallet _does not_ hold any tokens. You have to provide it with tokens of your choice.  
Wallet's address and private key should be pasted into the `.env` file (see [Prerequisites](#preqs)).

<a name="proxy"/>

### Smart Contracts Upgradeability

The source code of upgradeable contracts can be updated _without_ the need to redeploy the contracts afterwards. The state of contracts (values in storage) remains the same. This allows to add new features to the contracts and fix existing bugs/vulnerabilities.

It's _highly recommended_ to study the following materials for detailed explanation of contracts upgradeability:

1. [What is Proxy](https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies)
2. [Difference Between Transparent and UUPS Proxy](https://docs.openzeppelin.com/contracts/4.x/api/proxy#transparent-vs-uups)
3. [How to Write Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable)
4. [How to Deploy and Upgrade Contracts Using Hardhat](https://docs.openzeppelin.com/upgrades-plugins/1.x/hardhat-upgrades)
5. [Constuctor Allowing to Create Upgradeable Contracts](https://wizard.openzeppelin.com/#custom)

#### Using Scripts with Upgradeable Contracts

**Deploy**  
In order to deploy contracts follow instructions in [Deploy](#deploy) section. The `scripts/deploy.js` script supports upgradeable contracts.

**Upgrade**  
In order to upgrade contracts follow the steps:

1. Create new versions of your contracts. Add `V2`, `V3`, etc. to the end of each new version of each contract. You might have several versions of the same contract in one directory at the same time or you can store them in separate directories
2. Open `scripts/upgrade.js` file
3. Change the `oldContractNames` list if you need. This list represents contracts that you _wish to upgrade_  
   Example:

   ```
   let oldContractNames = [
     "OdeumV1"
   ];
   ```

4. Change the `newContractNames` list if you need. This list represents new implementations of upgraded contracts. "New implementation" is any contract that _is upgrade-compatible_ with the previous implementation and _has a different bytecode_.
   Example:

   ```
   let newContractNames = [
     "OdeumV2",
   ];
   ```

   _NOTE_:

   - Each of the contracts from both lists must be present in the project directory
   - Length of both lists must be the same
   - Each contract from `oldContractNames` must have already been deployed in mainnet/testnet
   - Order of contracts in the lists must be the same

5. Run the upgrade script

```
npx hardhat run scripts/upgrade.js --network <network name here>
```

When running, this script will output logs into the console. If you see any error messages in the logs with the script _still running_ - ignore them. They might later be used for debug purposes.  
If Hardhat Upgrades plugin finds your contracts _upgrade-incompatible_ it will generate an error that will stop script execution. Is this case you have to follow the [How to Write Upgradeable Contracts](https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable) guide.  
After this script completes, the `implementationAddress` and `implementationVerification` fields of contracts from the `oldContractNames` will be changed inside the `scripts/deployOutput.json` file. This will indicate that contracts upgrade was finished successfully.  
Even after the upgrade, you should _use only `proxyAddress` or `proxyVerification` fields of the deploy output file to interact with contracts_.

Following contracts are upgradeable:

- Odeum.sol
- StakingPool.sol
- Tipping.sol

<a name="output"/>

### Structure of Deploy Output File

This file contains the result of contracts deployment.

It is separated in 4 parts. Each of them represents deployment to fantom or arbitrum and his testnet or mainnet.  
Each part contains information about all deployed contracts:

- The address of the proxy contract (`proxyAddress`) (see [Smart Contracts Upgradeability](#proxy))
- The address of the implementation contract that is under control of the proxy contract (`implementationAddress`)
- The URL for Polygonscan page with verified code of the proxy contract (`proxyVerification`)
- The URL for Polygonscan page with verified code of the implementation contract (`implementationVerification`)

**Use only `proxyAddress` or `proxyVerification` fields to interact with contracts**.

<a name="input"/>

### Structure of Deploy Input File

This file contains uniswap information for all networks.

It is separated in 4 parts. Each of them represents deployment to fantom or arbitrum and his testnet or mainnet.  
Each part contains:

- The flag `isV2`. This `true` if used uniswap V2 and `false` if used uniswap V3
- The address of the `UniswapV2Router02` for uniswap V2 or `SwapRouter` for uniswap V3

<a name="logic"/>

### Logic

#### Odeum

A ERC20 token with the following additions:
- Commission of 5% for sell/buy through uniswap V2 and uniswap V3
- The collected commission is accumulated on the token contract
- commission can be withdrawn in a Odeum token
- when withdrawing a commission, it can be exchanged through uniswap for the specified token

Implemented two versions of the token:
- `OdeumV2` - Token contract working with uniswap V2
- `OdeumV3` - Token contract working with uniswap V3

#### StakingPool

Allows staking Libertas tokens for reward.

#### Tipping

With this contract users can send tips to content creators.  
With each transaction:

- 9% of tokens is distributed among contributors
- 10% of tokens is sent to the "fund" wallet
- 1% of tokens is burned
- 80% of tokens is sent to the wallet of the content creator

---

<a name="issues"/>

### [Known Issues]

Ownership of each of 3 contracts should be transferred to the client's wallet (0x73B944BDB1aa5b24E743520e709793368A2FbAa3) after final deploy to testnet and mainnet.
