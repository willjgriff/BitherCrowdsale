pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/AllowanceCrowdsale.sol";

contract BitherCrowdsale is AllowanceCrowdsale, TimedCrowdsale {

    uint256 private btrRateDay1 = 110;
    uint256 private btrRateDay2to4 = 109;
    uint256 private btrRateDay5to8 = 108;
    uint256 private btrRateDay9to12 = 107;

    uint256 private brpRateFirst2Hours = 1400;
    uint256 private brpRateDay1 = 1360;
    uint256 private brpRateDay2to4 = 1320;
    uint256 private brpRateDay5to8 = 1280;
    uint256 private brpRateDay9to12 = 1240;

    IERC20 private _rentalProcessorToken;
    event BitherProcessorTokensPurchased(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

    constructor(IERC20 bitherToken, IERC20 rentalProcessorToken, address bitherTokensOwner, address etherBenefactor)
        Crowdsale(110, etherBenefactor, bitherToken)
        AllowanceCrowdsale(bitherTokensOwner)
        TimedCrowdsale(now, now + 12 days)
        public
    {
        _rentalProcessorToken = rentalProcessorToken;
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

    // Overrides function in Crowdsale contract
    function _deliverTokens(address beneficiary, uint256 tokenAmount) internal {
        super._deliverTokens(beneficiary, tokenAmount);

        uint256 weiAmount = msg.value;
        uint256 brpTokenAmount = getBrpTokenAmount(weiAmount);

        _rentalProcessorToken.safeTransferFrom(tokenWallet(), beneficiary, brpTokenAmount);

        emit BitherProcessorTokensPurchased(msg.sender, beneficiary, weiAmount, brpTokenAmount);
    }

    function getBrpTokenAmount(uint256 weiAmount) private view returns (uint256) {
        if (now < openingTime() + 2 hours) {
            return weiAmount.mul(brpRateFirst2Hours);
        } else if (now < openingTime() + 1 days) {
            return weiAmount.mul(brpRateDay1);
        } else if (now < openingTime() + 4 days) {
            return weiAmount.mul(brpRateDay2to4);
        } else if (now < openingTime() + 8 days) {
            return weiAmount.mul(brpRateDay5to8);
        } else if (now <= closingTime()) {
            return weiAmount.mul(brpRateDay9to12);
        }
    }
}
