// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./OdeumCore.sol";

/// @title A custom ERC20 token
contract Odeum is OdeumCore {
    function _swap(address receiver, uint256 amountIn) internal override returns(uint256 amountOut) {
        IUniswapV2Router02 router = IUniswapV2Router02(dexRouter);

        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = taxWithdrawToken;

        uint[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            0,
            path,
            receiver,
            block.timestamp
        );

        amountOut = amounts[1];
    }
}
