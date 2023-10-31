// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./OdeumCoreV2.sol";

/// @title A custom ERC20 token
contract Odeum is OdeumCore {
    /// @notice Uniswap V3 pool(Odeum/withdrawTaxToken) fee through
    /// which the exchange of odeum tokens will be carried out when withdrawing the fee
    uint24 public taxWithdrawPoolFee;

    event TaxWithdrawPoolFeeSet(uint24 poolFee);

    /// @notice Function to set taxWithdrawPoolFee
    /// @param poolFee_ The uniswap V3 pool(Odeum/withdrawTaxToken) fee
    function setTaxWithdrawPoolFee(uint24 poolFee_) external onlyOwner {
        require(poolFee_ != 0, "Odeum: poolFee must not be null");
        taxWithdrawPoolFee = poolFee_;

        emit TaxWithdrawPoolFeeSet(poolFee_);
    }

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
