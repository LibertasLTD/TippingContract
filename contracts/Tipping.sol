// SPDX-License-Identifier: Undefined

pragma solidity ^0.7.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract Tipping {
    using SafeMath for uint256;

    address constant vault = 0x0305c2119bBDC01F3F50c10f63e68920D3d61915;                        // Dev fund address
    address public pool = address(0);                                                           // Staking pool address

    IERC20 constant LIBERTAS = IERC20(0x49184E6dAe8C8ecD89d8Bdc1B950c597b8167c90);              // Libertas Contract

    function transfer(address _from, address _to, uint256 _amount) public returns (bool success) {
        uint256 availableAmount = LIBERTAS.balanceOf(_from);
        uint256 sendAmount = 0;
        if (availableAmount >= _amount) {                                                       // Check available balance
            sendAmount = _calculatePartialAmount(_amount, 90, 0);                               // Send 90% to destination
            _transfer(_from, _to, sendAmount);
            sendAmount = _calculatePartialAmount(_amount, 1, 0);                                // Burn 1%
            _burn(_from, sendAmount);
            sendAmount = _calculatePartialAmount(_amount, 45, 1);                               // Send 4.5% to vault and pool
            _transfer(_from, vault, sendAmount);
            _transfer(_from, pool, sendAmount);
            return true;
        }
        return false;
    }

    function _calculatePartialAmount(uint256 _amount, uint256 _ratio, uint256 _precision) internal pure returns(uint256) {
        uint256 partialAmount = _amount.mul(_ratio*(10**(_precision+1)));
        partialAmount = partialAmount.div(100*(10**(_precision+1)));
        return partialAmount;
    }

    function _transfer(address _from, address _to, uint256 _amount) internal {
        LIBERTAS.transferFrom(_from, _to, _amount);
        emit Transfer(_from, _to, _amount);
    }

    function _burn(address _from, uint256 _amount) internal {
        LIBERTAS.transferFrom(_from, address(0), _amount);
        emit Burn(_from, _amount);
    }

    event Burn(address _from, uint256 _amount);
    event Transfer(address _from, address _to, uint256 _amount);
}