// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "./interfaces/IStakingPool.sol";

contract StakingPool is AccessControl, IStakingPool {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    IERC20Upgradeable public ODEUM;
    mapping(address => UserInfo) public userInfo;
    uint256 public accOdeumPerShare;
    uint256 public totalDeposits;

    uint256 public constant PRECISION = 1e12;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }


    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "onlyAdmin");
        _;
    }

    constructor(address ODEUM_) {
        ODEUM = IERC20Upgradeable(ODEUM_);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function deposit(uint256 amount) external {
        UserInfo storage user = userInfo[msg.sender];
        if (user.amount >= 0 && amount > 0) {
            uint256 pending = user.amount * accOdeumPerShare / PRECISION - user.rewardDebt;
            if (pending > 0) {
                safeOdeumTransfer(msg.sender, pending);
            }
            ODEUM.safeTransferFrom(msg.sender, address(this), amount);
            user.amount = user.amount + amount;
            totalDeposits = totalDeposits + amount;
        }
        user.rewardDebt = user.amount * accOdeumPerShare / PRECISION;
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= amount, "withdrawTooMuch");
        uint256 pending = user.amount * accOdeumPerShare / PRECISION - user.rewardDebt;
        if (pending > 0) {
            safeOdeumTransfer(msg.sender, pending);
        }
        if (amount > 0) {
            user.amount = user.amount - amount;
            totalDeposits = totalDeposits - amount;
            ODEUM.safeTransfer(msg.sender, amount);
        }
        user.rewardDebt = user.amount * accOdeumPerShare / PRECISION;
        emit Withdraw(msg.sender, amount);
    }

    function getPendingReward(
        UserInfo storage user
    ) internal view returns (uint256) {
        return
            user.amount * accOdeumPerShare / PRECISION - user.rewardDebt;
    }

    function claim() external {
        require(userInfo[msg.sender].amount > 0, "nothingToClaim");
        UserInfo storage user = userInfo[msg.sender];
        uint256 pending = getPendingReward(user);
        if (pending > 0) {
            safeOdeumTransfer(msg.sender, pending);
        }
        user.rewardDebt = user.amount * accOdeumPerShare / PRECISION;
    }

    function availableReward() external view returns (uint256) {
        if (userInfo[msg.sender].amount == 0) {
            return 0;
        }
        return getPendingReward(userInfo[msg.sender]);
    }

    function emergencyWithdraw() external {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        safeOdeumTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    function supplyReward(uint256 reward) external onlyAdmin {
        if (totalDeposits == 0) {
            return;
        }
        accOdeumPerShare = accOdeumPerShare + reward * PRECISION / totalDeposits;
    }

    function safeOdeumTransfer(address _to, uint256 _amount) internal {
        uint256 totalBalance = ODEUM.balanceOf(address(this));
        if (totalBalance < _amount) {
            ODEUM.safeTransfer(_to, totalBalance);
        } else {
            ODEUM.safeTransfer(_to, _amount);
        }
    }

}
