pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract BitherToken is ERC20 {

    string public name = "BitherToken";
    string public symbol = "BTR";
    uint256 public decimals = 18;

    constructor() public {
        _mint(msg.sender, 45000000 * (10 ** decimals));
    }
}
