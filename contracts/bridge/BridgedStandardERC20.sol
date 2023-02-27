pragma solidity ^0.7.0;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/proxy/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../interfaces/IBridgedStandardERC20.sol";

contract BridgedStandardERC20 is IBridgedStandardERC20, ERC20, Initializable {
    using SafeMath for uint256;

    address public override bridgingToken;
    address public bridge;

    string internal __name;
    string internal __symbol;
    uint8 internal __decimals;

    uint256 public override burnt = 0;

    constructor() ERC20("", "") {}

    modifier onlyBridge() {
        require(_msgSender() == bridge, "onlyBridge");
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
    ) external override initializer {
        bridge = _bridge;
        bridgingToken = _bridgingToken;
        __name = _name;
        __symbol = _symbol;
        __decimals = 2;
    }

    function name()
        public
        view
        override(ERC20, IBridgedStandardERC20)
        returns (string memory)
    {
        return __name;
    }

    function symbol()
        public
        view
        override(ERC20, IBridgedStandardERC20)
        returns (string memory)
    {
        return __symbol;
    }

    function decimals()
        public
        view
        override(ERC20, IBridgedStandardERC20)
        returns (uint8)
    {
        return __decimals;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        if (recipient == address(0)) {
            _burn(sender, amount);
            burnt = burnt.add(amount);
        } else {
            super._transfer(sender, recipient, amount);
        }
    }

    function mint(
        address _to,
        uint256 _amount
    ) public virtual override onlyBridge {
        _mint(_to, _amount);
        emit Mint(_to, _amount);
    }

    function burn(
        address _from,
        uint256 _amount
    ) public virtual override onlyBridge {
        _burn(_from, _amount);
        emit Burn(_from, _amount);
    }
}
