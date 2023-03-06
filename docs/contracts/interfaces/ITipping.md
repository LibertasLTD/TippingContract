# ITipping









## Methods

### setBurnRate

```solidity
function setBurnRate(uint256 burnRate) external nonpayable returns (bool)
```

Sets the new percentage of tokens to be burnt on each         transfer (in basis points)

*Emits the {BurnRateChanged} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| burnRate | uint256 | The new percentage of tokens to be burnt on each        transfer (in basis points) |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | True if a new percentage has been set successfully. Otherwise - false. |

### setFundRate

```solidity
function setFundRate(uint256 fundRate) external nonpayable returns (bool)
```

Sets the new percentage of tokens to be sent to the team wallet on each         transfer (in basis points)

*Emits the {FundRateChanged} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| fundRate | uint256 | The new percentage of tokens to be sent to the team wallet on each        transfer (in basis points) |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | True if a new percentage has been set successfully. Otherwise - false. |

### setFundVaultAddress

```solidity
function setFundVaultAddress(address FUND_VAULT) external nonpayable
```

Sets the address of the team wallet

*Emits the {FundAddressChanged} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| FUND_VAULT | address | The address of the team wallet |

### setOdeumAddress

```solidity
function setOdeumAddress(address ODEUM) external nonpayable
```

Sets the address of the {Odeum} contract

*Emits the {OdeumAddressChanged} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| ODEUM | address | The address of the {Odeum} contract |

### setRewardRate

```solidity
function setRewardRate(uint256 rewardRate) external nonpayable returns (bool)
```

Sets the new percentage of tokens to be sent to the staking pool on each         transfer (in basis points)

*Emits the {RewardRateChanged} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| rewardRate | uint256 | The new percentage of tokens to be sent to the staking pool on each        transfer (in basis points) |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | True if a new percentage has been set successfully. Otherwise - false. |

### setStakingVaultAddress

```solidity
function setStakingVaultAddress(address STAKING_VAULT) external nonpayable
```

Sets the address of the {StakinPool} contract

*Emits the {StakingAddressChanged} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| STAKING_VAULT | address | The address of the {StakingPool} contract |

### setVaultToBurnAddress

```solidity
function setVaultToBurnAddress(address VAULT_TO_BURN) external nonpayable
```

Sets the address to send burnt tokens to

*A zero address by defaultEmits the {BurnAddressChanged} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| VAULT_TO_BURN | address | The address to send burnt tokens to |

### transfer

```solidity
function transfer(address to, uint256 amount) external nonpayable returns (bool)
```

Transfers the `amount` tokens and splits it among several addresses

*Emits the {SplitTransfer} event*

#### Parameters

| Name | Type | Description |
|---|---|---|
| to | address | The main destination address to transfer tokens to |
| amount | uint256 | The amount of tokens to transfer |

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined |



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



