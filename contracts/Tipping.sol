// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IStakingPool.sol";
import "./interfaces/ITipping.sol";

contract Tipping is Ownable, ITipping {
    using SafeERC20 for IERC20;

    address public _STAKING_VAULT;
    address public _LIBERTAS;
    address public _FUND_VAULT;
    address public _VAULT_TO_BURN;

    uint256 public _burnRate;
    uint256 public _fundRate;
    uint256 public _rewardRate;

    constructor(
        address STAKING_VAULT,
        address LIBERTAS,
        address FUND_VAULT,
        address VAULT_TO_BURN,
        uint256 burnRate,
        uint256 fundRate,
        uint256 rewardRate
    ) {
        _VAULT_TO_BURN = VAULT_TO_BURN;
        _STAKING_VAULT = STAKING_VAULT;
        _LIBERTAS = LIBERTAS;
        _FUND_VAULT = FUND_VAULT;
        _burnRate = burnRate;
        _fundRate = fundRate;
        _rewardRate = rewardRate;
    }

    uint256 public constant MAX_BP = 1000;

    modifier validRate(uint256 rate) {
        require(rate > 0 && rate <= MAX_BP, "Out of range");
        _;
    }

    function setStakingVaultAddress(address STAKING_VAULT) external onlyOwner {
        _STAKING_VAULT = STAKING_VAULT;
    }

    function setLibertasAddress(address LIBERTAS) external onlyOwner {
        _LIBERTAS = LIBERTAS;
    }

    function setVaultToBurnAddress(address VAULT_TO_BURN) external onlyOwner {
        _VAULT_TO_BURN = VAULT_TO_BURN;
    }

    function setFundVaultAddress(address FUND_VAULT) external onlyOwner {
        _FUND_VAULT = FUND_VAULT;
    }

    function setBurnRate(
        uint256 burnRate
    ) external validRate(burnRate) onlyOwner returns (bool) {
        _burnRate = burnRate;
        return true;
    }

    function setFundRate(
        uint256 fundRate
    ) external validRate(fundRate) onlyOwner returns (bool) {
        _fundRate = fundRate;
        return true;
    }

    function setRewardRate(
        uint256 rewardRate
    ) external validRate(rewardRate) onlyOwner returns (bool) {
        _rewardRate = rewardRate;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        IERC20 _libertas = IERC20(_LIBERTAS);
        _libertas.safeTransferFrom(msg.sender, address(this), amount);
        (
            uint256 transAmt,
            uint256 burnAmt,
            uint256 fundAmt,
            uint256 rewardAmt
        ) = _getValues(amount);
        _libertas.safeTransfer(to, transAmt);
        _libertas.safeTransfer(_VAULT_TO_BURN, burnAmt);
        _libertas.safeTransfer(_FUND_VAULT, fundAmt);
        _libertas.safeTransfer(_STAKING_VAULT, rewardAmt);
        IStakingPool(_STAKING_VAULT).supplyReward(rewardAmt);
        return true;
    }

    function _getValues(
        uint256 tAmount
    ) private view returns (uint256, uint256, uint256, uint256) {
        uint256 burnAmt = tAmount * _burnRate / MAX_BP;
        uint256 fundAmt = tAmount * _fundRate / MAX_BP;
        uint256 rewardAmt = tAmount * _rewardRate / MAX_BP;
        uint256 transAmt = tAmount - rewardAmt - fundAmt - burnAmt;
        return (transAmt, burnAmt, fundAmt, rewardAmt);
    }
}
