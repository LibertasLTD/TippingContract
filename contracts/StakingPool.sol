// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./ILibertasToken.sol";

contract StakingPool {
    using SafeMath for uint256;
    
    address public LIBERTAS;
    mapping(address => UserInfo) public userInfo;
    uint256 accLibertasPerShare;
    uint256 totalDeposits;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    constructor(address _libertas) {
        totalDeposits = 0;
        accLibertasPerShare = 0;
        LIBERTAS = _libertas;
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
            ILibertasToken(LIBERTAS).transferFrom(msg.sender, address(this), _amount);
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
            ILibertasToken(LIBERTAS).transfer(msg.sender, _amount);            
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
        uint256 totalBalance = ILibertasToken(LIBERTAS).balanceOf(address(this));
        if (totalBalance < _amount) {
            ILibertasToken(LIBERTAS).transfer(_to, totalBalance);
        } else {
            ILibertasToken(LIBERTAS).transfer(_to, _amount);
        }
    }

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
}