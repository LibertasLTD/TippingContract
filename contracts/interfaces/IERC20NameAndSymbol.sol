pragma solidity ^0.7.0;

interface IERC20NameAndSymbol  {
    function name() external view returns(string memory);
    function symbol() external view returns(string memory);
}
