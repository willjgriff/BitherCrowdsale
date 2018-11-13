pragma solidity ^0.4.25;

import "openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/emission/AllowanceCrowdsale.sol";
import "openzeppelin-solidity/contracts/crowdsale/validation/CappedCrowdsale.sol";

/**
 * @title BitherCrowdsale
 * @dev BitherCrowdsale contract uses multiple openzeppelin base contracts and adds some custom behaviour.
 *      The openzeppelin base contracts have been audited and are widely used by the community. They can
 *      be trusted to have almost zero security vulnerabilities and therefore do not need to be tested.
 *      The BitherCrowdale enables the purchasing of 2 tokens, the BitherToken (BTR) and BitherStockToken
 *      (BSK) at rates determined by the current block time. It specifies a cap of Ether that can be contributed
 *      and a length of time the crowdsale lasts. It requires the crowdsale contract address be given
 *      an allowance of 33000000 BTR and 21000000 BSK enabling it to distribute the purchased tokens. These
 *      values are determined by the cap of 300000 ETH and the phased distribution rates.
 */
contract BitherCrowdsale is AllowanceCrowdsale, TimedCrowdsale, CappedCrowdsale {

    uint256 private capInWei = 300000 ether;
    uint256 private crowdsaleLength = 13 days;

    uint256 private btrRateDay1 = 110;
    uint256 private btrRateDay2to5 = 109;
    uint256 private btrRateDay6to9 = 108;
    uint256 private btrRateDay10to13 = 107;

    uint256 private bskRateFirst2Hours = 70;
    uint256 private bskRateDay1 = 68;
    uint256 private bskRateDay2to5 = 66;
    uint256 private bskRateDay6to9 = 64;
    uint256 private bskRateDay10to13 = 62;

    IERC20 private _bitherStockToken;

    /**
     * Event for BSK token purchase logging
     * @param purchaser Who paid for the tokens
     * @param beneficiary Who got the tokens
     * @param value Wei paid for purchase
     * @param amount Amount of tokens purchased
     */
    event BitherStockTokensPurchased(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

    /**
     * @dev Constructor, calls the inherited classes constructors and stores the BitherStockToken
     * @param bitherToken The BitherToken address, must be an ERC20 contract
     * @param bitherStockToken The BitherStockToken, must be an ERC20 contract
     * @param bitherTokensOwner Address holding the tokens, which has approved allowance to the crowdsale
     * @param etherBenefactor Address that will receive the deposited Ether
     * @param openingTime The opening time, in seconds, the crowdsale will begin at
     */
    constructor(IERC20 bitherToken, IERC20 bitherStockToken, address bitherTokensOwner, address etherBenefactor, uint256 openingTime)
        Crowdsale(btrRateDay1, etherBenefactor, bitherToken)
        AllowanceCrowdsale(bitherTokensOwner)
        TimedCrowdsale(openingTime, openingTime + crowdsaleLength)
        CappedCrowdsale(capInWei)
        public
    {
        _bitherStockToken = bitherStockToken;
    }

    /**
     * @dev Overrides function in the Crowdsale contract to enable a custom phased distribution
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified weiAmount
     */
    function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
        if (now < openingTime() + 1 days) {
            return weiAmount.mul(btrRateDay1);
        } else if (now < openingTime() + 5 days) {
            return weiAmount.mul(btrRateDay2to5);
        } else if (now < openingTime() + 9 days) {
            return weiAmount.mul(btrRateDay6to9);
        } else if (now <= closingTime()) {
            return weiAmount.mul(btrRateDay10to13);
        }
    }

    /**
     * @dev Overrides function in AllowanceCrowdsale contract (therefore also overrides function
     *      in Crowdsale contract) to add functionality for distribution of a second token.
     * @param beneficiary Token purchaser
     * @param tokenAmount Amount of tokens purchased
     */
    function _deliverTokens(address beneficiary, uint256 tokenAmount) internal {
        super._deliverTokens(beneficiary, tokenAmount);

        uint256 weiAmount = msg.value;
        uint256 bskTokenAmount = getBskTokenAmount(weiAmount);

        _bitherStockToken.safeTransferFrom(tokenWallet(), beneficiary, bskTokenAmount);

        emit BitherStockTokensPurchased(msg.sender, beneficiary, weiAmount, bskTokenAmount);
    }

    /**
     * @dev Determines distribution of BSK depending on the time of the transaction
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified weiAmount
     */
    function getBskTokenAmount(uint256 weiAmount) private view returns (uint256) {
        if (now < openingTime() + 2 hours) {
            return weiAmount.mul(bskRateFirst2Hours);
        } else if (now < openingTime() + 1 days) {
            return weiAmount.mul(bskRateDay1);
        } else if (now < openingTime() + 5 days) {
            return weiAmount.mul(bskRateDay2to5);
        } else if (now < openingTime() + 9 days) {
            return weiAmount.mul(bskRateDay6to9);
        } else if (now <= closingTime()) {
            return weiAmount.mul(bskRateDay10to13);
        }
    }
}
