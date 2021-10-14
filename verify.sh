#!/bin/bash

function verifyAll {
  truffle run verify Bridge --network $1
  truffle run verify BridgedStandardERC20 --network $1
  truffle run verify LibertasProxyAdmin --network $1
  truffle run verify LibertasUpgradeableProxy --network $1
  truffle run verify StakingPool --network $1
  truffle run verify Tipping --network $1
}

if [[ $1 = "all" ]]; then
  verifyAll $2
else
  truffle run verify $1 --network $2
fi
