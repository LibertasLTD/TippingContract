// SPDX-License-Identifier: UNLICENSED

/*

ODEUM is the dedicated token of the Odeum Audio platform, enabling tipping, staking, igniting, advertising, and access to premium subscriptions.

Telegram : https://t.me/odeumportal

Medium : https://odeumlive.medium.com/

Twitter : https://x.com/odeumlive

Infosite : https://odeum.info

DAPP : https://odeum.live

*/

pragma solidity ^0.8.18;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./OdeumCoreV3.sol";

/// @title A custom ERC20 token
contract OdeumV3 is OdeumCore {
    /// @notice Uniswap V2 pool(Odeum/withdrawTaxToken) fee through
    /// which the exchange of odeum tokens will be carried out when withdrawing the fee
    /// Unused after upgrade
    uint24 public taxWithdrawPoolFee;

    constructor(
        address ownerWallet,
        address poolWallet,
        address dexRouter_
    ) ERC20("ODEUM", "ODEUM") {
        require(dexRouter_ != address(0), "Odeum: the address must not be null");
        transferOwnership(ownerWallet);
        uint256 poolWalletAmount = INITIAL_CAP * 1000 / MAX_BP;
        _mint(ownerWallet, (INITIAL_CAP - poolWalletAmount) * (10 ** decimals()));
        _mint(poolWallet, poolWalletAmount * (10 ** decimals()));

        taxFee = 500;
        dexRouter = dexRouter_;
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
