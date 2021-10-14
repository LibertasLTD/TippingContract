#!/bin/bash

function verifyAllAtStart {
  truffle run verify Bridge --network $1
  truffle run verify LibertasToken --network $1
  truffle run verify LibertasProxyAdmin --network $1
  truffle run verify LibertasUpgradeableProxy --network $1
  truffle run verify StakingPool --network $1
  truffle run verify Tipping --network $1
}

function verifyAllAtEnd {
  truffle run verify Bridge --network $1
  truffle run verify BridgedStandardERC20 --network $1
  truffle run verify BridgedStandardERC20@$2 --network $1
  truffle run verify StakingPool --network $1
  truffle run verify Tipping --network $1
}

if [[ $1 = "allStart" ]]; then
  verifyAllAtStart $2
elif [[ $1 = "allEnd" ]]; then
  verifyAllAtEnd $2 $3
else
  truffle run verify $1 --network $2
fi
