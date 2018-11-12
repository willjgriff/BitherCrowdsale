pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/AllowanceCrowdsale.sol";

contract BitherCrowdsale is AllowanceCrowdsale {

    uint256 private crowdsaleLength = 1036800; // 12 days in seconds.

    uint256 private btrRateDay1 = 110;
    uint256 private btrRateDay2to4 = 109;
    uint256 private btrRateDay5to8 = 108;
    uint256 private btrRateDay9to12 = 107;

    constructor(IERC20 bitherToken, address bitherTokenOwner, address etherBenefactor)
        Crowdsale(110, etherBenefactor, bitherToken)
        AllowanceCrowdsale(bitherTokenOwner)
//        TimedCrowdsale(now, now + crowdsaleLength)
    public {

    }
}
