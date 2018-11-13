pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract BitherStockToken is ERC20 {

    string public name = "BitherStockToken";
    string public symbol = "BSK";
    uint256 public decimals = 18;

    constructor() public {
        _mint(msg.sender, 100000000 * (10 ** decimals));
    }
}
