pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract RentalProcessorToken is ERC20 {

    string public name = "BitherRentalProcessorToken";
    string public symbol = "BRP";
    uint256 public decimals = 18;

    constructor() public {
        _mint(msg.sender, 500000000 * (10 ** decimals));
    }
}
