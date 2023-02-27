pragma solidity ^0.8.18;

import "@openzeppelin/contracts/proxy/TransparentUpgradeableProxy.sol";

contract LibertasUpgradeableProxy is TransparentUpgradeableProxy {
    /**
     * @dev Initializes an upgradeable proxy managed by `_admin`, backed by the implementation at `_logic`, and
     * optionally initialized with `_data` as explained in {ERC1967Proxy-constructor}.
     */
    constructor(
        address _logic,
        address admin_,
        address _owner
    )
        TransparentUpgradeableProxy(
            _logic,
            admin_,
            abi.encodeWithSelector(
                bytes4(bytes32(keccak256("configure(address)"))),
                _owner
            )
        )
    {}
}
