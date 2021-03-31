pragma solidity ^0.7.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IStakingPool.sol";
import "./ILibertasToken.sol";

contract Tipping is Ownable {
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
        uint256 burnRate,
        uint256 fundRate,
        uint256 rewardRate
    ) {
        _STAKING_VAULT = STAKING_VAULT;
        _LIBERTAS = LIBERTAS;
        _burnRate = burnRate;
        _fundRate = fundRate;
        _rewardRate = rewardRate;
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

    function setBurnRate(uint256 burnRate) public onlyOwner returns (bool) {
        require(burnRate>0 && burnRate<=1000, "Out of range");
        _burnRate = burnRate;
        return true;
    }

    function setFundRate(uint256 fundRate) public onlyOwner returns (bool) {
        require(fundRate>0 && fundRate<=1000, "Out of range");
        _fundRate = fundRate;
        return true;
    }

    function setRewardRate(uint256 rewardRate) public onlyOwner returns (bool) {
        require(rewardRate>0 && rewardRate<=1000, "Out of range");
        _rewardRate = rewardRate;
        return true;
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        _validateTransfer(_LIBERTAS, amount);
        
        (uint256 transAmt, uint256 burnAmt, uint256 fundAmt, uint256 rewardAmt) = _getValues(amount);
        _transfer(to, transAmt);
        _transfer(address(0), burnAmt);
        _transfer(_FUND_VAULT, fundAmt);
        _transfer(_STAKING_VAULT, rewardAmt);

        IStakingPool(_STAKING_VAULT).supplyReward(rewardAmt);
        return true;
    }

    function _transferFrom(address _from, address _to, uint256 _amount) internal {
        ILibertasToken(_LIBERTAS).transferFrom(_from, _to, _amount);
    }

    function _transfer(address _to, uint256 _amount) internal {
        ILibertasToken(_LIBERTAS).transfer(_to, _amount);
    }

    function _validateTransfer(address token, uint256 amount) private {
        uint256 balance = ILibertasToken(token).balanceOf(msg.sender);
        require(amount <= balance, "Insufficient amount");
        require(ILibertasToken(token).transferFrom(msg.sender, address(this), amount), "Transfer tx failed");
    }

    function _getValues(uint256 tAmount) private view returns(uint256, uint256, uint256, uint256) {
        uint256 burnAmt = tAmount.mul(_burnRate).div(1000);
        uint256 fundAmt = tAmount.mul(_fundRate).div(1000);
        uint256 rewardAmt = tAmount.mul(_rewardRate).div(1000);
        uint256 transAmt = tAmount.sub(rewardAmt).sub(fundAmt).sub(burnAmt);

        return (transAmt, burnAmt, fundAmt, rewardAmt);
    }
}