// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IStakingPool.sol";
import "./interfaces/ITipping.sol";

contract StakingPool is Ownable, IStakingPool {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    IERC20Upgradeable public odeum;
    ITipping public tipping;

    mapping(address => UserInfo) public userInfo;
    uint256 public accOdeumPerShare;
    uint256 public totalStake;
    mapping(address => uint256) public claimedRewards;
    uint256 public totalClaimed;

    uint256 public constant PRECISION = 1e12;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    modifier onlyTipping() {
        require(address(tipping) != address(0), "tippingNotSet");
        require(msg.sender == address(tipping), "callerIsNotTipping");
        _;
    }

    constructor(address odeum_) {
        odeum = IERC20Upgradeable(odeum_);
    }

    function getAvailableReward(address user) external view returns (uint256) {
        return _getPendingReward(userInfo[user]);
    }

    function getStake(address user) external view returns (uint256) {
        return userInfo[user].amount;
    }

    function setTipping(address tipping_) external onlyOwner {
        tipping = ITipping(tipping_);
    }

    function deposit(uint256 amount) external {
        UserInfo storage user = userInfo[msg.sender];
        if (user.amount >= 0 && amount > 0) {
            uint256 pending = _getPendingReward(user);
            if (pending > 0) {
                claimedRewards[msg.sender] += pending;
                totalClaimed += pending;
                safeOdeumTransfer(msg.sender, pending);
            }
            odeum.safeTransferFrom(msg.sender, address(this), amount);
            user.amount = user.amount + amount;
            totalStake = totalStake + amount;
        }
        user.rewardDebt = (user.amount * accOdeumPerShare) / PRECISION;
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= amount, "withdrawTooMuch");
        uint256 pending = _getPendingReward(user);
        if (pending > 0) {
            claimedRewards[msg.sender] += pending;
            totalClaimed += pending;
            safeOdeumTransfer(msg.sender, pending);
        }
        if (amount > 0) {
            user.amount = user.amount - amount;
            totalStake = totalStake - amount;
            odeum.safeTransfer(msg.sender, amount);
        }
        user.rewardDebt = (user.amount * accOdeumPerShare) / PRECISION;
        emit Withdraw(msg.sender, amount);
    }

    function claim() external {
        require(userInfo[msg.sender].amount > 0, "nothingToClaim");
        UserInfo storage user = userInfo[msg.sender];
        uint256 pending = _getPendingReward(user);
        if (pending > 0) {
            claimedRewards[msg.sender] += pending;
            totalClaimed += pending;
            safeOdeumTransfer(msg.sender, pending);
        }
        user.rewardDebt = (user.amount * accOdeumPerShare) / PRECISION;
    }

    function emergencyWithdraw() external {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        safeOdeumTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    // TODO why doesnt it really transfer token?
    function supplyReward(uint256 reward) external onlyTipping {
        if (totalStake == 0) {
            return;
        }
        accOdeumPerShare = accOdeumPerShare + (reward * PRECISION) / totalStake;
    }

    function _getPendingReward(
        UserInfo storage user
    ) internal view returns (uint256) {
        return (user.amount * accOdeumPerShare) / PRECISION - user.rewardDebt;
    }

    function safeOdeumTransfer(address _to, uint256 _amount) internal {
        uint256 totalBalance = odeum.balanceOf(address(this));
        if (totalBalance < _amount) {
            odeum.safeTransfer(_to, totalBalance);
        } else {
            odeum.safeTransfer(_to, _amount);
        }
    }
}
