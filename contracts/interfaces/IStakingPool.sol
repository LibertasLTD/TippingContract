// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

interface IStakingPool {

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event EmergencyWithdraw(address indexed user, uint256 amount);

    function deposit(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function claim() external;

    function availableReward() external view returns (uint256);

    function emergencyWithdraw() external;

    function supplyReward(uint256 reward) external;

}
