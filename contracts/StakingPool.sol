pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "./ILibertasToken.sol";

contract StakingPool {
    using SafeMath for uint256;
    
    address public _LIBERTAS;
    mapping(address => UserInfo) public _userInfo;
    uint256 public _accLibertasPerShare;
    uint256 public _totalDeposits;

    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    constructor(address LIBERTAS) {
        _LIBERTAS = LIBERTAS;
    }

    function deposit(uint256 amount) public {
        UserInfo storage user = _userInfo[msg.sender];
        if (user.amount > 0) {
            uint256 pending = user.amount.mul(_accLibertasPerShare).div(1e12).sub(user.rewardDebt);
            if (pending > 0) {
                safeLIBERTASTransfer(msg.sender, pending);
            }
        }
        if (amount > 0) {
            require(ILibertasToken(_LIBERTAS).transferFrom(msg.sender, address(this), amount), "Transfer tx failed");
            user.amount = user.amount.add(amount);
            _totalDeposits = _totalDeposits.add(amount);
        }
        user.rewardDebt = user.amount.mul(_accLibertasPerShare).div(1e12);
        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) public {
        UserInfo storage user = _userInfo[msg.sender];
        require(user.amount >= amount, "Withdraw too much");
        uint256 pending = user.amount.mul(_accLibertasPerShare).div(1e12).sub(user.rewardDebt);
        if (pending > 0) {
            safeLIBERTASTransfer(msg.sender, pending);
        }
        if (amount > 0) {
            user.amount = user.amount.sub(amount);
            _totalDeposits = _totalDeposits.sub(amount);
            ILibertasToken(_LIBERTAS).transfer(msg.sender, amount);
        }
        user.rewardDebt = user.amount.mul(_accLibertasPerShare).div(1e12);
        emit Withdraw(msg.sender, amount);
    }

    function claim() public {
        if (_userInfo[msg.sender].amount == 0) {
            return;
        }
        UserInfo storage user = _userInfo[msg.sender];
        uint256 pending = user.amount.mul(_accLibertasPerShare).div(1e12).sub(user.rewardDebt);
        if (pending > 0) {
            safeLIBERTASTransfer(msg.sender, pending);
        }
        user.rewardDebt = user.amount.mul(_accLibertasPerShare).div(1e12);
    }

    function availableReward() public view returns (uint256) {
        if (_userInfo[msg.sender].amount == 0) {
            return 0;
        }
        UserInfo storage user = _userInfo[msg.sender];
        uint256 pending = user.amount.mul(_accLibertasPerShare).div(1e12).sub(user.rewardDebt);
        return pending;
    }

    function emergencyWithdraw() public {
        UserInfo storage user = _userInfo[msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        user.rewardDebt = 0;
        safeLIBERTASTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    function supplyReward(uint256 reward) public {
        if (_totalDeposits == 0) {
            return;
        }
        _accLibertasPerShare = _accLibertasPerShare.add(reward.mul(1e12).div(_totalDeposits));
    }

    function safeLIBERTASTransfer(address _to, uint256 _amount) internal {
        uint256 totalBalance = ILibertasToken(_LIBERTAS).balanceOf(address(this));
        if (totalBalance < _amount) {
            ILibertasToken(_LIBERTAS).transfer(_to, totalBalance);
        } else {
            ILibertasToken(_LIBERTAS).transfer(_to, _amount);
        }
    }

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);
}