// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IOdeum.sol";

/// @title A custom ERC20 token
contract Odeum is
    Initializable,
    ERC20Upgradeable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    IOdeum
{
    /// @notice The maximum possible amount of minted tokens
    uint256 public constant INITIAL_CAP = 100_000_000;
    uint256 public constant MAX_BP = 10000;

    /// @notice The amount of burnt tokens
    uint256 public totalBurnt;

    function configure(address teamWallet, address poolWallet) external initializer {
        __ERC20_init("ODEUM", "ODEUM");
        __Ownable_init();
        __UUPSUpgradeable_init();
        uint256 poolWalletAmount = INITIAL_CAP * 500 / MAX_BP;
        _mint(teamWallet, (INITIAL_CAP - poolWalletAmount) * (10 ** decimals()));
        _mint(poolWallet, poolWalletAmount * (10 ** decimals()));
    }

    /// @notice Returns the number of decimals used to get its user representation.
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    /// @dev Transfers tokens to the receiver and burns them if sent to zero address
    /// @param sender The address sending tokens
    /// @param recipient The address receiving the tokens
    /// @param amount The amount of tokens to transfer
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        if (recipient == address(0)) {
            _burn(sender, amount);
        } else {
            super._transfer(sender, recipient, amount);
        }
    }

    /// @dev Burns tokens of the user. Increases the total amount of burnt tokens
    /// @param from The address to burn tokens from
    /// @param amount The amount of tokens to burn
    function _burn(address from, uint256 amount) internal override {
        totalBurnt += amount;
        super._burn(from, amount);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
