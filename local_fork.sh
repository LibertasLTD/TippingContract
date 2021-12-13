#!/bin/bash
 source .env
 echo 'Setting up local Fantom Testnet fork...'
 yarn fantom_testnet_fork --mnemonic $MNEMONIC
