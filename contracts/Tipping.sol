pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IStakingPool.sol";

contract Tipping is Ownable {

    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address public _STAKING_VAULT;
    address public _LIBERTAS;
    address public _FUND_VAULT;

    uint256 public _burnRate;
    uint256 public _fundRate;
    uint256 public _rewardRate;

    constructor(
        address STAKING_VAULT,
        address LIBERTAS,
        address FUND_VAULT,
        uint256 burnRate,
        uint256 fundRate,
        uint256 rewardRate
    ) {
        _STAKING_VAULT = STAKING_VAULT;
        _LIBERTAS = LIBERTAS;
        _FUND_VAULT = FUND_VAULT;
        _burnRate = burnRate;
        _fundRate = fundRate;
        _rewardRate = rewardRate;
    }

    uint256 public constant MAX_BP = 10000;

    modifier validRate(uint256 rate) {
        require(rate > 0 && rate <= MAX_BP, "Out of range");
        _;
    }

    function setStakingVaultAddress(address STAKING_VAULT) public onlyOwner {
        _STAKING_VAULT = STAKING_VAULT;
    }

    function setLibertasAddress(address LIBERTAS) public onlyOwner {
        _LIBERTAS = LIBERTAS;
    }

    function setFundVaultAddress(address FUND_VAULT) public onlyOwner {
        _FUND_VAULT = FUND_VAULT;
    }

    function setBurnRate(uint256 burnRate) public validRate(burnRate) onlyOwner returns (bool) {
        _burnRate = burnRate;
        return true;
    }

    function setFundRate(uint256 fundRate) public validRate(fundRate) onlyOwner returns (bool) {
        _fundRate = fundRate;
        return true;
    }

    function setRewardRate(uint256 rewardRate) public validRate(rewardRate) onlyOwner returns (bool) {
        _rewardRate = rewardRate;
        return true;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        IERC20 _libertas = IERC20(_LIBERTAS);
        _libertas.safeTransferFrom(msg.sender, address(this), amount);
        (uint256 transAmt, uint256 burnAmt, uint256 fundAmt, uint256 rewardAmt) = _getValues(amount);
        _libertas.safeTransfer(to, transAmt);
        _libertas.safeTransfer(address(0), burnAmt);
        _libertas.safeTransfer(_FUND_VAULT, fundAmt);
        _libertas.safeTransfer(_STAKING_VAULT, rewardAmt);
        IStakingPool(_STAKING_VAULT).supplyReward(rewardAmt);
        return true;
    }

    function _getValues(uint256 tAmount) private view returns(uint256, uint256, uint256, uint256) {
        uint256 burnAmt = tAmount.mul(_burnRate).div(MAX_BP);
        uint256 fundAmt = tAmount.mul(_fundRate).div(MAX_BP);
        uint256 rewardAmt = tAmount.mul(_rewardRate).div(MAX_BP);
        uint256 transAmt = tAmount.sub(rewardAmt).sub(fundAmt).sub(burnAmt);
        return (transAmt, burnAmt, fundAmt, rewardAmt);
    }
}
