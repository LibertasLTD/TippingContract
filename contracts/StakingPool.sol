// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract StakingPool is AccessControl {
    using SafeERC20 for IERC20;

    IERC20 public _LIBERTAS;
    mapping(address => UserInfo) public userInfo;
    uint256 public accLibertasPerShare;
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

    constructor(address LIBERTAS) {
        _LIBERTAS = IERC20(LIBERTAS);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function deposit(uint256 amount) external {
        UserInfo storage user = userInfo[msg.sender];
        if (user.amount >= 0 && amount > 0) {
            uint256 pending = user
                .amount
                .mul(accLibertasPerShare)
                .div(PRECISION)
                .sub(user.rewardDebt);
            if (pending > 0) {
                safeLIBERTASTransfer(msg.sender, pending);
            }
            _LIBERTAS.safeTransferFrom(msg.sender, address(this), amount);
            user.amount = user.amount.add(amount);
            totalDeposits = totalDeposits.add(amount);
        }
        user.rewardDebt = user.amount.mul(accLibertasPerShare).div(PRECISION);
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= amount, "withdrawTooMuch");
        uint256 pending = user
            .amount
            .mul(accLibertasPerShare)
            .div(PRECISION)
            .sub(user.rewardDebt);
        if (pending > 0) {
            safeLIBERTASTransfer(msg.sender, pending);
        }
        if (amount > 0) {
            user.amount = user.amount.sub(amount);
            totalDeposits = totalDeposits.sub(amount);
            _LIBERTAS.safeTransfer(msg.sender, amount);
        }
        user.rewardDebt = user.amount.mul(accLibertasPerShare).div(PRECISION);
        emit Withdraw(msg.sender, amount);
    }

    function getPendingReward(
        UserInfo storage user
    ) internal view returns (uint256) {
        return
            user.amount.mul(accLibertasPerShare).div(PRECISION).sub(
                user.rewardDebt
            );
    }

    function claim() external {
        require(userInfo[msg.sender].amount > 0, "nothingToClaim");
        UserInfo storage user = userInfo[msg.sender];
        uint256 pending = getPendingReward(user);
        if (pending > 0) {
            safeLIBERTASTransfer(msg.sender, pending);
        }
        user.rewardDebt = user.amount.mul(accLibertasPerShare).div(PRECISION);
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
        safeLIBERTASTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    function supplyReward(uint256 reward) external onlyAdmin {
        if (totalDeposits == 0) {
            return;
        }
        accLibertasPerShare = accLibertasPerShare.add(
            reward.mul(PRECISION).div(totalDeposits)
        );
    }

    function safeLIBERTASTransfer(address _to, uint256 _amount) internal {
        uint256 totalBalance = _LIBERTAS.balanceOf(address(this));
        if (totalBalance < _amount) {
            _LIBERTAS.safeTransfer(_to, totalBalance);
        } else {
            _LIBERTAS.safeTransfer(_to, _amount);
        }
    }

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
}
