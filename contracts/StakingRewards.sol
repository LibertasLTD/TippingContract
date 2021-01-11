// SPDX-License-Identifier: Undefined

pragma solidity ^0.7.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";

contract StakingRewards {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    
    IERC20 constant LIBERTAS = IERC20(0x49184E6dAe8C8ecD89d8Bdc1B950c597b8167c90);              // Libertas Contract
    mapping(address => UserInfo) public userInfo;
    
    uint256 accLibertasPerShare;
    uint256 totalDeposits;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    constructor() {
        totalDeposits = 0;
        accLibertasPerShare = 0;
    }

    function deposit(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(accLibertasPerShare).div(1e12).sub(user.rewardDebt);
            if (pending > 0) {
                safeLIBERTASTransfer(msg.sender, pending);
            }
        }
        if (_amount > 0) {
            LIBERTAS.transferFrom(msg.sender, address(this), _amount);
            user.amount = user.amount.add(_amount);
            totalDeposits = totalDeposits.add(_amount);
        }
        user.rewardDebt = user.amount.mul(accLibertasPerShare).div(1e12);
        emit Deposit(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) public {
        UserInfo storage user = userInfo[msg.sender];
        require(user.amount >= _amount, "withdraw too much");
        uint256 pending = user.amount.mul(accLibertasPerShare).div(1e12).sub(user.rewardDebt);
        if (pending > 0) {
            safeLIBERTASTransfer(msg.sender, pending);
        }
        if (_amount > 0) {
            user.amount = user.amount.sub(_amount);
            totalDeposits = totalDeposits.sub(_amount);
            LIBERTAS.transfer(msg.sender, _amount);            
        }
        user.rewardDebt = user.amount.mul(accLibertasPerShare).div(1e12);
        emit Withdraw(msg.sender, _amount);
    }

    function claim() public {
        if (userInfo[msg.sender].amount == 0) {
            return;
        }
        UserInfo storage user = userInfo[msg.sender];
        uint256 pending = user.amount.mul(accLibertasPerShare).div(1e12).sub(user.rewardDebt);
        if (pending > 0) {
            safeLIBERTASTransfer(msg.sender, pending);
        }
        user.rewardDebt = user.amount.mul(accLibertasPerShare).div(1e12);
    }

    function emergencyWithdraw() public {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        safeLIBERTASTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    function updatePool(uint256 reward) public {
        if (totalDeposits == 0) {
            return;
        }
        accLibertasPerShare = accLibertasPerShare.add(reward.mul(1e12).div(totalDeposits));
    }

    function safeLIBERTASTransfer(address _to, uint256 _amount) internal {
        uint256 totalBalance = LIBERTAS.balanceOf(address(this));
        if (totalBalance < _amount) {
            LIBERTAS.transfer(_to, totalBalance);
        } else {
            LIBERTAS.transfer(_to, _amount);
        }
    }

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
}