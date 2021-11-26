#!/bin/bash

 echo 'Running test scripts...'
 truffle exec ./scripts/test_bridge_from_start_to_end.js --network rinkeby
 truffle exec ./scripts/test_bridge_from_end_to_start.js --network fantom_ganache_fork

