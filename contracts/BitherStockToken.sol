pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Detailed.sol";

contract BitherStockToken is ERC20, ERC20Detailed {

    uint256 constant private TOTAL_BITHER_STOCK_TOKENS = 100000000;

    constructor() ERC20Detailed("BitherStockToken", "BSK", 18) public {
        _mint(msg.sender, TOTAL_BITHER_STOCK_TOKENS * (10 ** 18));
    }
}
