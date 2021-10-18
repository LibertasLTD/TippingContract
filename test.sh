#!/bin/bash

echo 'Setting up local Fantom Testnet fork...'
yarn fantom_fork
echo 'Local Fantom Testnet fork set up.'

echo 'Setting up contracts to networks...'
truffle migrate --network rinkeby && truffle migrate --network fantom_ganache_fork
echo 'All contracts set up.'

echo 'Starting up messanger bot...'
truffle exec ./scripts/bot_messanger/ethereum_server.js --network rinkeby
truffle exec ./scripts/bot_messanger/fantom_client.js --network fantom_ganache_for

truffle exec ./scripts/bot_messanger/ethereum_server.js --network rinkeby
