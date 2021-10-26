#!/bin/bash

function verifyAllAtStart {
  truffle run verify LibertasToken --network $1
  truffle run verify LibertasProxyAdmin --network $1
  truffle run verify LibertasUpgradeableProxy --network $1
  truffle run verify StakingPool --network $1
  truffle run verify Tipping --network $1
}

if [[ $1 = "allStart" ]]; then
  verifyAllAtStart $2
else
  truffle run verify $1 --network $2
fi
