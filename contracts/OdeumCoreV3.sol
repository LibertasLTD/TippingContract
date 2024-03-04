// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IOdeumV3.sol";

import "hardhat/console.sol";
/// @title A custom ERC20 token
abstract contract OdeumCore is
    ERC20,
    Ownable,
    IOdeum
{
    /// @notice The maximum possible amount of minted tokens
    uint256 public constant INITIAL_CAP = 100_000_000;
    uint256 public constant MAX_BP = 10000;

    uint256 public taxFee;
    /// @notice Token for which the commission is exchanged when it is withdrawn
    address public taxWithdrawToken;
    uint256 public collectedFee;

    address public dexRouter;
    mapping (address => bool) private _isPairIncludedInFee;
    /// @notice Map of addresses to which the commission does not apply
    mapping(address => bool) private _isAccountExcludedFromFee;

    /// @notice The amount of burnt tokens
    uint256 public totalBurnt;

    event FeeWithdrawn(uint256 odeumAmount, uint256 taxTokenAmount);
    event PairIncludedInFee(address pair);
    event PairExcludedfromFee(address pair);
    event AccountIncludedInFee(address account);
    event AccountExcludedFromFee(address account);
    event TaxWithdrawTokenSet(address token);
    event DexRouterChanged(address newRouter);

    constructor() {
        _isAccountExcludedFromFee[address(this)] = true;
    }

    /// @notice Returns the number of decimals used to get its user representation.
    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function withdrawFee() public virtual onlyOwner {
        require(taxWithdrawToken != address(0), "Odeum: taxWithdrawToken not set");
        require(collectedFee > 0, "Odeum: no tokens to withdraw");
        uint256 amountToSwap = collectedFee;
        collectedFee = 0;

        uint256 taxTokenAmount;
        console.log("TRYWITHDRAW: ", msg.sender);
        if (taxWithdrawToken == address(this)) {
            _transfer(address(this), msg.sender, amountToSwap);

            taxTokenAmount = amountToSwap;
        } else {
            _approve(address(this), dexRouter, amountToSwap);

            taxTokenAmount = _swap(msg.sender, amountToSwap);
        }

        emit FeeWithdrawn(amountToSwap, taxTokenAmount);
    }

    function setDexRouter(address dexRouter_) external onlyOwner {
        require(dexRouter_ != address(0), "Odeum: the address must not be null");

        dexRouter = dexRouter_;

        emit DexRouterChanged(dexRouter_);
    }

    function isPairIncludedInFee(address pair) external view returns(bool) {
        return _isPairIncludedInFee[pair];
    }

    function isAccountExcludedFromFee(address account) external view returns(bool) {
        return _isAccountExcludedFromFee[account];
    }

    function includePairInFee(address pair) external onlyOwner {
        require(pair != address(0), "Odeum: the address must not be null");
        require(_isPairIncludedInFee[pair] == false, "Odeum: pair already included in fee");
        _isPairIncludedInFee[pair] = true;

        emit PairIncludedInFee(pair);
    }

    function excludePairFromFee(address pair) external onlyOwner {
        require(pair != address(0), "Odeum: the address must not be null");
        require(_isPairIncludedInFee[pair] == true, "Odeum: pair already excluded from fee");
        _isPairIncludedInFee[pair] = false;

        emit PairExcludedfromFee(pair);
    }

    function includeAccountInFee(address account) external onlyOwner {
        require(account != address(0), "Odeum: the address must not be null");
        require(_isAccountExcludedFromFee[account] == true, "Odeum: account already included in fee");
        _isAccountExcludedFromFee[account] = false;

        emit AccountIncludedInFee(account);
    }

    function excludeAccountFromFee(address account) external onlyOwner {
        require(account != address(0), "Odeum: the address must not be null");
        require(_isAccountExcludedFromFee[account] == false, "Odeum: account already excluded from fee");
        _isAccountExcludedFromFee[account] = true;

        emit AccountExcludedFromFee(account);
    }

    function setTaxWithdrawToken(address taxWithdrawToken_) external virtual onlyOwner {
        require(taxWithdrawToken_ != address(0), "Odeum: the address must not be null");
        taxWithdrawToken = taxWithdrawToken_;

        emit TaxWithdrawTokenSet(taxWithdrawToken_);
    }

    function _swap(address receiver, uint256 amountIn) internal virtual returns(uint256 amountOut);

    /// @dev Transfers tokens to the receiver and burns them if sent to zero address
    /// @param sender The address sending tokens
    /// @param recipient The address receiving the tokens
    /// @param amount The amount of tokens to transfer
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        if (recipient == address(0)) {
            _burn(sender, amount);
        } else {
            require(balanceOf(sender) >= amount, "Odeum: transfer amount exceeds balance");

            bool takeFee = true;

            console.log("THIS: ", address(this));
            console.log("SENDER REC: ", sender, recipient);
            console.log(_isAccountExcludedFromFee[sender], _isAccountExcludedFromFee[recipient]);
            if (_isAccountExcludedFromFee[sender] || _isAccountExcludedFromFee[recipient]) {
                takeFee = false;
            }

            console.log("TRYFEE: ", takeFee);
            if (takeFee && (_isPairIncludedInFee[recipient] || _isPairIncludedInFee[sender])) {
                _transferWithFee(sender, recipient, amount);
            } else {
                super._transfer(sender, recipient, amount);
            }
        }
    }

    function _transferWithFee(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        uint256 feeAmount = amount * taxFee / MAX_BP;
        collectedFee += feeAmount;
        if(_isPairIncludedInFee[recipient] || _isPairIncludedInFee[sender]) {
            super._transfer(sender, recipient, amount - feeAmount);
            super._transfer(sender, address(this), feeAmount);
        }

    }

    /// @dev Burns tokens of the user. Increases the total amount of burnt tokens
    /// @param from The address to burn tokens from
    /// @param amount The amount of tokens to burn
    function _burn(address from, uint256 amount) internal override {
        totalBurnt += amount;
        super._burn(from, amount);
    }
}
