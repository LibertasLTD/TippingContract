# StakingPool



> A pool allowing users to earn rewards for staking





## Methods

### PRECISION

```solidity
function PRECISION() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### claim

```solidity
function claim() external nonpayable
```

See {IStakingPool-claim}




### claimedRewards

```solidity
function claimedRewards(address) external view returns (uint256)
```

The amount of rewards claimed by each user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### deposit

```solidity
function deposit(uint256 amount) external nonpayable
```

See {IStakingPool-deposit}



#### Parameters

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |

### emergencyWithdraw

```solidity
function emergencyWithdraw() external nonpayable
```

See {IStakingPool-emergencyWithdraw}




### getAvailableReward

```solidity
function getAvailableReward(address user) external view returns (uint256)
```

See {IStakingPool-getAvailableReward}



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getStake

```solidity
function getStake(address user) external view returns (uint256)
```

See {IStakingPool-getStake}



#### Parameters

| Name | Type | Description |
|---|---|---|
| user | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### getStakersCount

```solidity
function getStakersCount() external view returns (uint256)
```

See {IStakingPool-getStakers}




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### odeum

```solidity
function odeum() external view returns (contract IERC20Upgradeable)
```

The {Odeum} token




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract IERC20Upgradeable | undefined |

### odeumPerShare

```solidity
function odeumPerShare() external view returns (uint256)
```

The amount of tokens paid to each user for his share of locked tokens




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### owner

```solidity
function owner() external view returns (address)
```



*Returns the address of the current owner.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```



*Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.*


### setTipping

```solidity
function setTipping(address tipping_) external nonpayable
```

See {IStakingPool-setTipping}



#### Parameters

| Name | Type | Description |
|---|---|---|
| tipping_ | address | undefined |

### supplyReward

```solidity
function supplyReward(uint256 reward) external nonpayable
```

See {IStakingPool-supplyReward}



#### Parameters

| Name | Type | Description |
|---|---|---|
| reward | uint256 | undefined |

### tipping

```solidity
function tipping() external view returns (contract ITipping)
```

The {Tipping} contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | contract ITipping | undefined |

### totalClaimed

```solidity
function totalClaimed() external view returns (uint256)
```

The total amount of rewards claimed by all users




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### totalStake

```solidity
function totalStake() external view returns (uint256)
```

The total amount of tokens locked in the pool




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```



*Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined |

### userInfo

```solidity
function userInfo(address) external view returns (uint256 amount, uint256 lastReward)
```

Stores information about all user&#39;s locks and rewards



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| amount | uint256 | undefined |
| lastReward | uint256 | undefined |

### withdraw

```solidity
function withdraw(uint256 amount) external nonpayable
```

See {IStakingPool-withdraw}



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

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

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



