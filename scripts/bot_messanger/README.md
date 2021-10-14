# How to start bridge?

You need to perform 2 truffle scripts in 2 separate terminal windows:

## In testnet:

1. truffle exec ./scripts/bot_messanger/ethereum_server.js --network rinkeby
2. truffle exec ./scripts/bot_messanger/fantom_client.js --network fantom_testnet

## In mainnet:

1. truffle exec ./scripts/bot_messanger/ethereum_server.js --network mainnet
2. truffle exec ./scripts/bot_messanger/fantom_client.js --network fantom
