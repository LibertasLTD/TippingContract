// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import '@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol';
import "./OdeumCore.sol";

/// @title A custom ERC20 token
contract Odeum is OdeumCore {
    uint24 public taxWithdrawPoolFee;

    event TaxWithdrawPoolFeeSetted(uint24 poolFee);

    function setTaxWithdrawPoolFee(uint24 poolFee_) external onlyOwner {
        require(poolFee_ != 0, "Odeum: poolFee must not be null");
        taxWithdrawPoolFee = poolFee_;

        emit TaxWithdrawPoolFeeSetted(poolFee_);
    }

    function withdrawFee() public override onlyOwner {
        require(taxWithdrawPoolFee != 0, "Odeum: taxWithdrawPoolFee not setted");
        
        super.withdrawFee();
    }

    function _swap(address receiver, uint256 amountIn) internal override returns(uint256 amountOut) {
        ISwapRouter router = ISwapRouter(dexRouter);
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: address(this),
                tokenOut: taxWithdrawToken,
                fee: taxWithdrawPoolFee,
                recipient: receiver,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
        });

        amountOut = router.exactInputSingle(params);
    }
}
