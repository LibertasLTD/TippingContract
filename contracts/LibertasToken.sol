// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract LibertasToken is ERC20, Initializable {
    constructor() ERC20("LIBERTAS", "LIBS") {}

    uint256 public constant INITIAL_CAP = 100_000_000;

    function configure(address _owner) external initializer {
        _mint(_owner, INITIAL_CAP);
    }

    function approveAndCall(
        address _spender,
        uint256 _value,
        bytes memory _extraData
    ) public returns (bool) {
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

    function decimals() public view override returns (uint8) {
        return 2;
    }
}
