# IStakingPool



> An interface of the {StakingPool} contract





## Methods

### claim

```solidity
function claim() external nonpayable
```

Allows users to claim all of their pending rewards

*Emits a {Claim} event*


### deposit

```solidity
function deposit(uint256 amount) external nonpayable
```

Allows users to lock their tokens inside the pool         or increase the current locked amount. All pending rewards         are claimed when making a new deposit

*Emits a {Deposit} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | The amount of tokens to lock inside the pool |

### emergencyWithdraw

```solidity
function emergencyWithdraw() external nonpayable
```

Allows users to withdraw their locked tokens from the pool         without claiming any rewards

*Emits an {EmergencyWithdraw} event*


### getAvailableReward

```solidity
function getAvailableReward(address user) external view returns (uint256)
```

Allows to see the pending reward of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The user to check the pending reward of |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | The pending reward of the user |

### getStake

```solidity
function getStake(address user) external view returns (uint256)
```

Allows to see the current stake of the user



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | The user to check the current lock of |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | The current lock of the user |

### getStakersCount

```solidity
function getStakersCount() external view returns (uint256)
```

Allows to see the current amount of users who staked tokens in the pool




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | The amount of users who staked tokens in the pool |

### setTipping

```solidity
function setTipping(address tipping_) external nonpayable
```

Sets the address of the {Tipping} contract to call its methodsparam tipping_ The address of the {Tipping} contract



#### Parameters

| Name | Type | Description |
|---|---|---|
| tipping_ | address | undefined |

### supplyReward

```solidity
function supplyReward(uint256 reward) external nonpayable
```

Gives a signal that some tokens have been received from the         {Tipping} contract. That leads to each user&#39;s reward share         recalculation.

*Each time someone transfers tokens using the {Tipping} contract,      a small portion of these tokens gets sent to the staking pool to be      paid as rewardsThis function does not transfer any tokens itself*

#### Parameters

| Name | Type | Description |
|---|---|---|
| reward | uint256 | undefined |

### withdraw

```solidity
function withdraw(uint256 amount) external nonpayable
```

Allows users to withdraw their locked tokens from the pool         All pending rewards are claimed when withdrawing

*Emits a {Withdraw} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |



## Events

### Claim

```solidity
event Claim(address indexed user, uint256 amount)
```

Indicates that `user` claimed his pending reward



#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |
| amount  | uint256 | undefined |

### Deposit

```solidity
event Deposit(address indexed user, uint256 amount)
```

Indicates that `user` deposited `amount` of tokens into the pool



#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |
| amount  | uint256 | undefined |

### EmergencyWithdraw

```solidity
event EmergencyWithdraw(address indexed user, uint256 amount)
```

Indicates that `user` withdraw `amount` of tokens from the pool      without claiming reward



#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |
| amount  | uint256 | undefined |

### TippingAddressChanged

```solidity
event TippingAddressChanged(address indexed tipping)
```

Indicates that new address of `Tipping` contract was set



#### Parameters

| Name | Type | Description |
|---|---|---|
| tipping `indexed` | address | undefined |

### Withdraw

```solidity
event Withdraw(address indexed user, uint256 amount)
```

Indicates that `user` withdrawn `amount` of tokens from the pool



#### Parameters

| Name | Type | Description |
|---|---|---|
| user `indexed` | address | undefined |
| amount  | uint256 | undefined |



