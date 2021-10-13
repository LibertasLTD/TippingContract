pragma solidity ^0.7.0;

interface IBridge  {
    event RequestBridgingToEnd(
        address indexed _tokenAtStart,
        address indexed _from,
        address indexed _to,
        uint256 _amount
    );
    event RequestBridgingToStart(
        address indexed _tokenAtEnd,
        address indexed _from,
        address indexed _to,
        uint256 _amount
    );

    function requestBridgingToEnd(address _tokenAtStart, address _to, uint256 _amount) external;
    function requestBridgingToStart(address _tokenAtEnd, address _to, uint256 _amount) external;
    function performBridgingToEnd(address _tokenAtStart, address _to, uint256 _amount) external;
    function performBridgingToStart(address _tokenAtEnd, address _to, uint256 _amount) external;
}
