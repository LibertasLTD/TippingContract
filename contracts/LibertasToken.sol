pragma solidity ^0.7.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";


contract LibertasToken is ERC20, Initializable {

    string public version = 'V1.0';

    constructor() ERC20("LIBERTAS", "LIBERTAS") {}

    function configure() external initializer {
        _mint(msg.sender, 10000000000);
    }

    function approveAndCall(address _spender, uint256 _value, bytes memory _extraData) public returns(bool) {
        _approve(msg.sender, _spender, _value);
        (bool success, ) = _spender.call(abi.encode(bytes4(bytes32(keccak256("receiveApproval(address,uint256,address,bytes)"))), msg.sender, _value, this, _extraData));
        require(success, "receiveApprovalFailed");
        return true;
    }

    function decimals() public view override returns(uint8) {
        return 2;
    }
}
