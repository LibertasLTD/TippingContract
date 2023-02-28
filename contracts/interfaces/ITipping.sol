// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

interface ITipping {

    function setStakingVaultAddress(address STAKING_VAULT) external;

    function setLibertasAddress(address LIBERTAS) external;

    function setVaultToBurnAddress(address VAULT_TO_BURN) external;

    function setFundVaultAddress(address FUND_VAULT) external;

    function setBurnRate(
        uint256 burnRate
    ) external returns (bool);

    function setFundRate(
        uint256 fundRate
    ) external returns (bool);

    function setRewardRate(
        uint256 rewardRate
    ) external returns (bool);

    function transfer(address to, uint256 amount) external returns (bool);
}
