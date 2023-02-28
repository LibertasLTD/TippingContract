// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

/// @title An interface for a custom ERC20 contract used in the bridge
interface IOdeum is IERC20Upgradeable {

    function approveAndCall(
        address _spender,
        uint256 _value,
        bytes memory _extraData
    ) external returns (bool);

}
