// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "./interfaces/IStakingPool.sol";
import "./interfaces/ITipping.sol";

/// @title A pool allowing users to earn rewards for staking
contract StakingPool is Ownable, IStakingPool {
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSet for EnumerableSet.AddressSet;

    /// @notice Stores user's lock amount and reward debt
    struct UserInfo {
        uint256 amount;
        uint256 rewardDebt;
    }

    /// @notice The {Odeum} token
    IERC20Upgradeable public odeum;
    /// @notice The {Tipping} contract
    ITipping public tipping;

    uint256 public constant PRECISION = 1e12;

    /// @notice Stores information about all user's locks and rewards
    mapping(address => UserInfo) public userInfo;
    /// @notice The amount of tokens paid to each user for his share of locked tokens
    uint256 public accOdeumPerShare;
    /// @notice The total amount of tokens locked in the pool
    uint256 public totalStake;
    /// @notice The list of stakers
    EnumerableSet.AddressSet private _stakers;
    /// @notice The amount of rewards claimed by each user
    mapping(address => uint256) public claimedRewards;
    /// @notice The total amount of rewards claimed by all users
    uint256 public totalClaimed;

    /// @dev Only allows the {Tipping} contract to call the function
    modifier onlyTipping() {
        require(address(tipping) != address(0), "tippingNotSet");
        require(msg.sender == address(tipping), "callerIsNotTipping");
        _;
    }

    constructor(address odeum_) {
        odeum = IERC20Upgradeable(odeum_);
    }

    /// @notice See {IStakingPool-getAvailableReward}
    function getAvailableReward(address user) external view returns (uint256) {
        return _getPendingReward(userInfo[user]);
    }

    /// @notice See {IStakingPool-getStake}
    function getStake(address user) external view returns (uint256) {
        return userInfo[user].amount;
    }

    /// @notice See {IStakingPool-getStakers}
    function getStakers() external view returns (uint256) {
        return _stakers.length();
    }

    /// @notice See {IStakingPool-setTipping}
    function setTipping(address tipping_) external onlyOwner {
        tipping = ITipping(tipping_);
    }

    /// @notice See {IStakingPool-deposit}
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
            _stakers.add(msg.sender);
        }
        user.rewardDebt = (user.amount * accOdeumPerShare) / PRECISION;
        emit Deposit(msg.sender, amount);
    }

    /// @notice See {IStakingPool-withdraw}
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
            if (user.amount == 0) {
                _stakers.remove(msg.sender);
            }
            totalStake = totalStake - amount;
            odeum.safeTransfer(msg.sender, amount);
        }
        user.rewardDebt = (user.amount * accOdeumPerShare) / PRECISION;
        emit Withdraw(msg.sender, amount);
    }

    /// @notice See {IStakingPool-claim}
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
        emit Claim(msg.sender, pending);
    }

    /// @notice See {IStakingPool-emergencyWithdraw}
    function emergencyWithdraw() external {
        UserInfo storage user = userInfo[msg.sender];
        uint256 amount = user.amount;
        user.amount = 0;
        _stakers.remove(msg.sender);
        user.rewardDebt = 0;
        safeOdeumTransfer(msg.sender, amount);
        emit EmergencyWithdraw(msg.sender, amount);
    }

    /// @notice See {IStakingPool-supplyReward}
    function supplyReward(uint256 reward) external onlyTipping {
        if (totalStake == 0) {
            return;
        }
        accOdeumPerShare = accOdeumPerShare + (reward * PRECISION) / totalStake;
    }

    /// @dev Returns the pending reward of the user
    /// @param user The address of the user to get the reward of
    /// @return The pending reward of the user
    function _getPendingReward(
        UserInfo storage user
    ) internal view returns (uint256) {
        return (user.amount * accOdeumPerShare) / PRECISION - user.rewardDebt;
    }

    /// @dev Transfers tokens from the pool to the given address.
    ///      If the transferred amount is greater than the current
    ///      token balance of this contract, then the whole balance
    ///      gets transferred to the given address
    /// @param _to The receiver of tokens
    /// @param _amount The amount of tokens to transfer
    function safeOdeumTransfer(address _to, uint256 _amount) internal {
        uint256 totalBalance = odeum.balanceOf(address(this));
        if (totalBalance < _amount) {
            odeum.safeTransfer(_to, totalBalance);
        } else {
            odeum.safeTransfer(_to, _amount);
        }
    }
}
