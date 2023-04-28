# Tipping





Allows users to transfer tokens and have the transferred amount split among several destinations



## Methods

### MAX_RATE_BP

```solidity
function MAX_RATE_BP() external view returns (uint256)
```

The maximum possible percentage




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### _FUND_VAULT

```solidity
function _FUND_VAULT() external view returns (address)
```

The address of the team wallet




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### _ODEUM

```solidity
function _ODEUM() external view returns (address)
```

The address of the {Odeum} contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### _STAKING_VAULT

```solidity
function _STAKING_VAULT() external view returns (address)
```

The address of the {StakingPool} contract




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### _VAULT_TO_BURN

```solidity
function _VAULT_TO_BURN() external view returns (address)
```

The address to send burnt tokens to




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

### _burnRate

```solidity
function _burnRate() external view returns (uint256)
```

The percentage of tokens to be burnt (in basis points)




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### _fundRate

```solidity
function _fundRate() external view returns (uint256)
```

The percentage of tokens to be sent to the team wallet (in basis points)




#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |

### _rewardRate

```solidity
function _rewardRate() external view returns (uint256)
```

The percentage of tokens to be sent to the {StakingPool} and distributed as rewards




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


### setBurnRate

```solidity
function setBurnRate(uint256 burnRate) external nonpayable
```

See {ITipping-setBurnRate}

*Emits the {FundAddressChanged} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| burnRate | uint256 | undefined |

### setFundRate

```solidity
function setFundRate(uint256 fundRate) external nonpayable
```

See {ITipping-setFundRate}



#### Parameters

| Name | Type | Description |
|---|---|---|
| fundRate | uint256 | undefined |

### setFundVaultAddress

```solidity
function setFundVaultAddress(address FUND_VAULT) external nonpayable
```

See {ITipping-setFundVaultAddress}

*Emits the {FundAddressChanged} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| FUND_VAULT | address | undefined |

### setOdeumAddress

```solidity
function setOdeumAddress(address ODEUM) external nonpayable
```

See {ITipping-setOdeumAddress}

*Emits the {OdeumAddressChanged} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| ODEUM | address | undefined |

### setRewardRate

```solidity
function setRewardRate(uint256 rewardRate) external nonpayable
```

See {ITipping-setRewardRate}



#### Parameters

| Name | Type | Description |
|---|---|---|
| rewardRate | uint256 | undefined |

### setStakingVaultAddress

```solidity
function setStakingVaultAddress(address STAKING_VAULT) external nonpayable
```

See {ITipping-setStakingVaultAddress}

*Emits the {StakingAddressChanged} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| STAKING_VAULT | address | undefined |

### setVaultToBurnAddress

```solidity
function setVaultToBurnAddress(address VAULT_TO_BURN) external nonpayable
```

See {ITipping-setVaultToBurnAddress}

*Emits the {BurnAddressChanged} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| VAULT_TO_BURN | address | undefined |

### transfer

```solidity
function transfer(address to, uint256 amount) external nonpayable
```

See {ITipping-transfer}



#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | undefined |
| amount | uint256 | undefined |

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```



*Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined |

### userTips

```solidity
function userTips(address) external view returns (uint256)
```

The amount of tips received by each user



#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined |



## Events

### BurnAddressChanged

```solidity
event BurnAddressChanged(address indexed newAddress)
```

Indicates that the address to send burnt tokens to was changed



#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |

### BurnRateChanged

```solidity
event BurnRateChanged(uint256 indexed newPercentage)
```

Indicates that the burn percentage was changed



#### Parameters

| Name | Type | Description |
|---|---|---|
| newPercentage `indexed` | uint256 | undefined |

### FundAddressChanged

```solidity
event FundAddressChanged(address indexed newAddress)
```

Indicates that the address to team wallet was changed



#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |

### FundRateChanged

```solidity
event FundRateChanged(uint256 indexed newPercentage)
```

Indicates that the percentage of tokens sent to the         team wallet was changed



#### Parameters

| Name | Type | Description |
|---|---|---|
| newPercentage `indexed` | uint256 | undefined |

### OdeumAddressChanged

```solidity
event OdeumAddressChanged(address indexed newAddress)
```

Indicates that the {Odeum} address was changed



#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

### RewardRateChanged

```solidity
event RewardRateChanged(uint256 indexed newPercentage)
```

Indicates that the percentage of tokens sent to the         staking pool was changed



#### Parameters

| Name | Type | Description |
|---|---|---|
| newPercentage `indexed` | uint256 | undefined |

### SplitTransfer

```solidity
event SplitTransfer(address indexed to, uint256 indexed amount)
```

Indicates that the tranfer amount was split         among several addresses



#### Parameters

| Name | Type | Description |
|---|---|---|
| to `indexed` | address | undefined |
| amount `indexed` | uint256 | undefined |

### StakingAddressChanged

```solidity
event StakingAddressChanged(address indexed newAddress)
```

Indicates that the {StakingPool} address was changed



#### Parameters

| Name | Type | Description |
|---|---|---|
| newAddress `indexed` | address | undefined |



