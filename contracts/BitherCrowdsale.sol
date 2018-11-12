pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/AllowanceCrowdsale.sol";

contract BitherCrowdsale is AllowanceCrowdsale, TimedCrowdsale {

    uint256 private btrRateDay1 = 110;
    uint256 private btrRateDay2to4 = 109;
    uint256 private btrRateDay5to8 = 108;
    uint256 private btrRateDay9to12 = 107;

    constructor(IERC20 bitherToken, address bitherTokenOwner, address etherBenefactor)
        Crowdsale(110, etherBenefactor, bitherToken)
        AllowanceCrowdsale(bitherTokenOwner)
        TimedCrowdsale(now, now + 12 days)
    public {

    }

    // Overrides function in Crowdsale contract
    function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
        if (now < openingTime() + 1 days) {
            return weiAmount.mul(btrRateDay1);
        } else if (now < openingTime() + 4 days) {
            return weiAmount.mul(btrRateDay2to4);
        } else if (now < openingTime() + 8 days) {
            return weiAmount.mul(btrRateDay5to8);
        } else if (now <= closingTime()) {
            return weiAmount.mul(btrRateDay9to12);
        }
    }
}
