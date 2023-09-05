// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
// imported for artifacts creation
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

contract MockToken is ERC20 {
    constructor() ERC20("Test Token", "TT") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}