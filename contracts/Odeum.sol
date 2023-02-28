
pragma solidity ^0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./interfaces/IOdeum.sol";

contract Odeum is Initializable, ERC20Upgradeable, OwnableUpgradeable, UUPSUpgradeable, IOdeum {

    uint256 public constant INITIAL_CAP = 100_000_000;

    function configure(address _owner) external initializer {
        __ERC20_init("ODEUM", "ODEUM");
        __Ownable_init();
        __UUPSUpgradeable_init();
        // TODO do I need decimals here?
        _mint(_owner, INITIAL_CAP * (10**decimals()));
    }

    function approveAndCall(
        address _spender,
        uint256 _value,
        bytes memory _extraData
    ) external returns (bool) {
        _approve(msg.sender, _spender, _value);
        (bool success, ) = _spender.call(
            abi.encode(
                bytes4(
                    bytes32(
                        keccak256(
                            "receiveApproval(address,uint256,address,bytes)"
                        )
                    )
                ),
                msg.sender,
                _value,
                address(this),
                _extraData
            )
        );
        require(success, "receiveApprovalFailed");
        return true;
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override {
        if (recipient == address(0)) {
            _burn(sender, amount);
        } else {
            super._transfer(sender, recipient, amount);
        }
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        onlyOwner
        override
    {}
}
