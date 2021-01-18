pragma solidity ^0.7.0;

import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./interfaces/IUniswapV2Factory.sol";
import "./interfaces/IUniswapV2Router02.sol";
import "./IStakingPool.sol";
import "./ILibertasToken.sol";

contract Tipping {
    using SafeMath for uint256;

    address POOL;               // Staking pool address
    address LIBERTAS;           // Libertas Contract
    address USDT;               // Tether Contract
    address WETH;               // WETH Contract
    address constant VAULT = 0x0305c2119bBDC01F3F50c10f63e68920D3d61915;            // Dev fund address
    IUniswapV2Factory constant UNI_V2_FACTORY = IUniswapV2Factory(address(0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f));
    IUniswapV2Router02 constant UNI_V2_ROUTER02 = IUniswapV2Router02(address(0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D));

    mapping (address => uint256) public deposits;

    constructor(
        address _pool,
        address _libertas,
        address _usdt,
        address _weth
    ) {
        POOL = _pool;
        LIBERTAS = _libertas;
        USDT = _usdt;
        WETH = _weth;
    }

    function transfer(address _to, uint256 _amount) public returns (bool success) {
        uint256 availableAmount = IERC20(LIBERTAS).balanceOf(msg.sender);
        require(availableAmount >= _amount, "Insufficient amount");
        
        uint256 sendAmount = 0;
        sendAmount = _calculatePartialAmount(_amount, 90, 0);                               // Send 90% to destination
        _transfer(msg.sender, _to, sendAmount);
        sendAmount = _calculatePartialAmount(_amount, 1, 0);                                // Burn 1%
        _burn(msg.sender, sendAmount);
        sendAmount = _calculatePartialAmount(_amount, 45, 1);                               // Send 4.5% to vault and pool
        _transfer(msg.sender, VAULT, sendAmount);
        _transfer(msg.sender, POOL, sendAmount);
        IStakingPool(POOL).updatePool(sendAmount);
        return true;
    }

    function transferUSDT(address _to, uint256 _amount) public returns (bool success) {
        uint256 availableAmount = IERC20(USDT).balanceOf(msg.sender);
        require(availableAmount >= _amount, "Insufficient amount");
        
        uint256 wethAmount = tokenToEth(_amount, USDT, 0, 2**256-1);
        uint256 libertasAmount = ethToToken(wethAmount, LIBERTAS, 0, 2**256-1);
        transfer(_to, libertasAmount);
        return true;
    }

    function transferETH(address _to, uint256 _amount) public returns (bool success) {
        require(deposits[msg.sender] > _amount, "No eth deposit");
        
        deposits[msg.sender] = deposits[msg.sender].sub(_amount);
        uint256 libertasAmount = ethToToken(_amount, LIBERTAS, 0, 2**256-1);
        transfer(_to, libertasAmount);
        return true;
    }

    receive() external payable {
        deposits[msg.sender] = deposits[msg.sender].add(msg.value);
        emit Received(msg.sender, msg.value);
    }

    function ethToToken(uint ethAmount, address token, uint minAmount, uint deadline) internal returns (uint) {
        address pair = UNI_V2_FACTORY.getPair(WETH, token);
        require (pair != address(0), "No pair exist");
        address[] memory path = new address[](2);
        path[0] = address(WETH);
        path[1] = address(token);
        uint256[] memory minOuts = UNI_V2_ROUTER02.getAmountsOut(ethAmount, path);
        require (minOuts[1] >= minAmount, "Exceed");
        UNI_V2_ROUTER02.swapExactETHForTokens{value: ethAmount}(minOuts[1], path, address(this), deadline);

        emit UniswapTokenBought(token, ethAmount, minOuts[1]);
        return minOuts[1];
    }

    function tokenToEth(uint tokenAmount, address token, uint minEthAmount, uint deadline) internal returns (uint) {
        address pair = UNI_V2_FACTORY.getPair(WETH, token);
        require (pair != address(0), "No pair exist");
        address[] memory path = new address[](2);
        path[0] = address(token);
        path[1] = address(WETH);
        uint256[] memory minOuts = UNI_V2_ROUTER02.getAmountsOut(tokenAmount, path);
        require (minOuts[1] >= minEthAmount, "Exceed");

        UNI_V2_ROUTER02.swapExactTokensForETH(tokenAmount, minOuts[1], path, address(this), deadline);

        emit UniswapEthBoughtFrom(token, minOuts[1], tokenAmount);
        return minOuts[1];
    }

    function _calculatePartialAmount(uint256 _amount, uint256 _ratio, uint256 _precision) internal pure returns(uint256) {
        uint256 partialAmount = _amount.mul(_ratio*10);
        partialAmount = partialAmount.div(100*(10**(_precision+1)));
        return partialAmount;
    }

    function _transfer(address _from, address _to, uint256 _amount) internal {
        ILibertasToken(LIBERTAS).transferFrom(_from, _to, _amount);
        emit Transfer(_from, _to, _amount);
    }

    function _burn(address _from, uint256 _amount) internal {
        ILibertasToken(LIBERTAS).transferFrom(_from, address(0), _amount);
        emit Burn(_from, _amount);
    }

    event Burn(address indexed sender, uint256 amount);
    event Transfer(address indexed sender, address indexed _to, uint256 amount);
    event Received(address indexed sender, uint amount);
    event UniswapTokenBought(address indexed token, uint ethAmount, uint tokenAmount);
    event UniswapEthBoughtFrom(address indexed token, uint ethAmount, uint tokenAmount);
}