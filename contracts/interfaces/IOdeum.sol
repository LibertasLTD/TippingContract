// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/// @title An interface for a custom ERC20 token
interface IOdeum is IERC20Upgradeable {
    /// @notice Indicates that {approveAndCall} method was called
    event ApproveAndCall(address indexed spender, uint256 indexed value);

    /// @notice Increases the allowance for a spender and calls `receiveApproval`
    ///         method of a spender
    /// @param _spender The address received and spending tokens
    /// @param _value The amount of tokens given to the `spender`
    /// @param _extraData Bytes of data forwarded while calling spender's method
    /// @dev This function call fails if `_spender` does not have `receiveApproval` method
    function approveAndCall(
        address _spender,
        uint256 _value,
        bytes memory _extraData
    ) external returns (bool);
}
