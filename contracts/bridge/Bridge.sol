pragma solidity ^0.7.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";

import "../interfaces/IBridge.sol";
import "../interfaces/IBridgedStandardERC20.sol";
import "../interfaces/IERC20NameAndSymbol.sol";

contract Bridge is AccessControl, IBridge {

    using Clones for address;
    using SafeERC20 for IERC20;

    struct Pair {
        address tokenAtStart;
        address tokenAtEnd;
    }

    bytes32 public constant BOT_MESSANGER_ROLE = keccak256("BOT_MESSANGER_ROLE");

    bool public direction; // true - on eth, false - on fantom
    IBridgedStandardERC20 public bridgedStandartERC20;

    Pair[] private tokenPairs;

    // token => is allowed to bridge
    mapping(address => bool) public allowedTokens;

    modifier onlyAtStart {
        require(direction, "onlyAtStart");
        _;
    }

    modifier onlyAtEnd {
        require(!direction, "onlyAtStart");
        _;
    }

    modifier onlyMessangerBot {
        require(hasRole(BOT_MESSANGER_ROLE, _msgSender()), "onlyMessangerBot");
        _;
    }

    modifier onlyAdmin {
        require(hasRole(DEFAULT_ADMIN_ROLE, _msgSender()), "onlyAdmin");
        _;
    }

    modifier tokenIsAllowed(address _token) {
        require(allowedTokens[_token], "invalidToken");
        _;
    }

    constructor(
        bool _direction,
        address _bridgedStandardERC20,
        address _botMessanger,
        address _allowedToken
    ) {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(BOT_MESSANGER_ROLE, _botMessanger);

        if (_allowedToken != address(0)) {
          if (_direction) {
              allowedTokens[_allowedToken] = true;
          } else {
              IERC20NameAndSymbol allowedToken = IERC20NameAndSymbol(_allowedToken);
              _cloneAndInitializeTokenAtEndForTokenAtStart(
                  _allowedToken,
                  allowedToken.name(),
                  allowedToken.symbol()
              );
          }
        }
    }

    function setAllowedToken(address _token, bool _status) external onlyAdmin {
        allowedTokens[_token] = _status;
    }

    function requestBridgingToEnd(
        address _tokenAtStart,
        address _to,
        uint256 _amount
    ) external override onlyAtStart tokenIsAllowed(_tokenAtStart) {
        address sender = _msgSender();
        IERC20(_tokenAtStart).safeTransferFrom(sender, address(this), _amount);
        emit RequestBridgingToEnd(_tokenAtStart, sender, _to, _amount);
    }

    function requestBridgingToStart(
        address _tokenAtEnd,
        address _to,
        uint256 _amount
    ) external override onlyAtEnd tokenIsAllowed(_tokenAtEnd) {
        address sender = _msgSender();
        IBridgedStandardERC20(_tokenAtEnd).burn(sender, _amount);
        emit RequestBridgingToStart(_tokenAtEnd, sender, _to, _amount);
    }

    function performBridgingToEnd(
        address _tokenAtStart,
        address _to,
        uint256 _amount,
        string memory _name,
        string memory _symbol
    )
        external
        override
        onlyAtEnd
        onlyMessangerBot
    {
        address tokenAtEnd = _getEndTokenByStartToken(_tokenAtStart);
        if (tokenAtEnd == address(0)) {
            tokenAtEnd = _cloneAndInitializeTokenAtEndForTokenAtStart(
                _tokenAtStart,
                _name,
                _symbol
            );
        }
        IBridgedStandardERC20(tokenAtEnd).mint(_to, _amount);
    }

    function performBridgingToStart(
        address _tokenAtEnd,
        address _to,
        uint256 _amount
    )
        external
        override
        onlyAtStart
        onlyMessangerBot
    {
        address tokenAtStart = _getStartTokenByEndToken(_tokenAtEnd);
        IERC20(tokenAtStart).safeTransfer(_to, _amount);
    }

    function _cloneAndInitializeTokenAtEndForTokenAtStart(
        address _tokenAtStart,
        string memory _name,
        string memory _symbol
    )
        internal
        returns(address tokenAtEnd)
    {
        tokenAtEnd = address(bridgedStandartERC20).clone();
        tokenPairs.push(Pair({
          tokenAtStart: _tokenAtStart,
          tokenAtEnd: tokenAtEnd
        }));
        allowedTokens[tokenAtEnd] = true;
        IBridgedStandardERC20(tokenAtEnd).configure(
            address(this),
            _tokenAtStart,
            _name,
            _symbol
        );
    }

    function _getEndTokenByStartToken(address _startToken) internal view returns(address) {
        for (uint i = 0; i < tokenPairs.length; i++) {
            if (tokenPairs[i].tokenAtStart == _startToken) {
                return tokenPairs[i].tokenAtEnd;
            }
        }
        return address(0);
    }

    function _getStartTokenByEndToken(address _endToken) internal view returns(address) {
        for (uint i = 0; i < tokenPairs.length; i++) {
            if (tokenPairs[i].tokenAtEnd == _endToken) {
                return tokenPairs[i].tokenAtStart;
            }
        }
        revert('noStartTokenFound');
    }

}
