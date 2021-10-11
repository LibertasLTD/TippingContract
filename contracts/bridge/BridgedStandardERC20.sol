pragma solidity ^0.7.0;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IBridgedStandardERC20.sol";

contract BridgedStandardERC20 is IBridgedStandardERC20, ERC20, Initializable, Ownable {

    address public override bridgingToken;
    address public bridge;

    string internal __name;
    string internal __symbol;

    constructor() ERC20("", "") {}

    modifier onlyBridge {
        require(_msgSender() == bridge, "Only Bridge can mint and burn");
        _;
    }

    /**
     * @param _bridge Address of the  bridge.
     * @param _bridgingToken Address of the corresponding token.
     * @param _name ERC20 name.
     * @param _symbol ERC20 symbol.
     */
    function configure(
        address _bridge,
        address _bridgingToken,
        string memory _name,
        string memory _symbol
    ) external initializer {
        bridge = _bridge;
        bridgingToken = _bridgingToken;
        __name = _name;
        __symbol = _symbol;
    }

    function name() public view override returns(string memory) {
        return __name;
    }

    function symbol() public view override returns(string memory) {
        return __symbol;
    }

    function supportsInterface(bytes4 _interfaceId) public override pure returns (bool) {
        bytes4 firstSupportedInterface = bytes4(keccak256("supportsInterface(bytes4)")); // ERC165
        bytes4 secondSupportedInterface = IBridgedStandardERC20.bridgingToken.selector
            ^ IBridgedStandardERC20.mint.selector
            ^ IBridgedStandardERC20.burn.selector;
        return _interfaceId == firstSupportedInterface || _interfaceId == secondSupportedInterface;
    }

    function mint(address _to, uint256 _amount) public virtual override onlyBridge {
        _mint(_to, _amount);
        emit Mint(_to, _amount);
    }

    function burn(address _from, uint256 _amount) public virtual override onlyBridge {
        _burn(_from, _amount);
        emit Burn(_from, _amount);
    }
}
