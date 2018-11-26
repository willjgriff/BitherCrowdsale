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

    uint256 constant private CAP_IN_WEI = 300000 ether;

    uint256 constant private BTR_PRIVATE_SALE_RATE = 110;
    uint256 constant private BTR_PRESALE_RATE_DAY_1 = 110;
    uint256 constant private BTR_PRESALE_RATE_DAY_2_TO_5 = 109;
    uint256 constant private BTR_PRESALE_RATE_DAY_6_TO_9 = 108;
    uint256 constant private BTR_PRESALE_RATE_DAY_10_TO_13 = 107;

    uint256 constant private BTR_CROWDSALE_RATE_DAY_1_FIRST_2_HOURS = 110;
    uint256 constant private BTR_CROWDSALE_RATE_DAY_1_TO_7 = 106;
    uint256 constant private BTR_CROWDSALE_RATE_DAY_8_TO_14 = 104;
    uint256 constant private BTR_CROWDSALE_RATE_DAY_15_TO_21 = 102;
    uint256 constant private BTR_CROWDSALE_RATE_DAY_22_TO_28 = 100;

    uint256 constant private BSK_PRIVATE_SALE_RATE = 70;
    uint256 constant private BSK_PRESALE_RATE_FIRST_2_HOURS = 70;
    uint256 constant private BSK_PRESALE_RATE_DAY_1 = 68;
    uint256 constant private BSK_PRESALE_RATE_DAY_2_TO_5 = 66;
    uint256 constant private BSK_PRESALE_RATE_DAY_6_TO_9 = 64;
    uint256 constant private BSK_PRESALE_RATE_DAY_10_TO_13 = 62;

    uint256 constant private BSK_CROWDSALE_RATE_DAY_1_TO_7 = 60;
    uint256 constant private BSK_CROWDSALE_RATE_DAY_8_TO_14 = 57;
    uint256 constant private BSK_CROWDSALE_RATE_DAY_15_TO_21 = 54;
    uint256 constant private BSK_CROWDSALE_RATE_DAY_22_TO_28 = 50;

    IERC20 private _bitherStockToken;
    uint256 private _privateSaleClosingTime; // Thursday, 24 January 2019 14:00:00 (1548338400)
    uint256 private _presaleOpeningTime; // Saturday, 26 January 2019 14:00:00 (1548511200)
    uint256 private _crowdsaleOpeningTime; // Saturday, 16 February 2019 14:00:00 (1550325600)
    uint256 private _crowdsaleClosingTime; // Saturday, 16 March 2019 14:00:00 (1552744800)

    /**
     * Event for BSK token purchase logging
     * @param purchaser Who paid for the tokens
     * @param beneficiary Who got the tokens
     * @param value Wei paid for purchase
     * @param amount Amount of tokens purchased
     */
    event BitherStockTokensPurchased(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

    /**
     * @dev Constructor, calls the inherited classes constructors, stores bitherStockToken and determines crowdsale times
     * @param bitherToken The BitherToken address, must be an ERC20 contract
     * @param bitherStockToken The BitherStockToken, must be an ERC20 contract
     * @param bitherTokensOwner Address holding the tokens, which has approved allowance to the crowdsale
     * @param etherBenefactor Address that will receive the deposited Ether
     * @param preSaleOpeningTime The presale opening time, in seconds, all other times are determined using this to reduce risk of error
     */
    constructor(IERC20 bitherToken, IERC20 bitherStockToken, address bitherTokensOwner, address etherBenefactor, uint256 preSaleOpeningTime)
        Crowdsale(BTR_PRIVATE_SALE_RATE, etherBenefactor, bitherToken)
        AllowanceCrowdsale(bitherTokensOwner)
        TimedCrowdsale(now, preSaleOpeningTime + 7 weeks)
        CappedCrowdsale(CAP_IN_WEI)
        public
    {
        _bitherStockToken = bitherStockToken;

        _privateSaleClosingTime = preSaleOpeningTime - 2 days;
        _presaleOpeningTime = preSaleOpeningTime;
        _crowdsaleOpeningTime = preSaleOpeningTime + 3 weeks;
        _crowdsaleClosingTime = _crowdsaleOpeningTime + 4 weeks;
    }

    /**
     * @dev Overrides function in the Crowdsale contract to revert contributions less then
     *      69 Eth during the first period and less than 1 Eth during the rest of the crowdsale
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _preValidatePurchase(address beneficiary, uint256 weiAmount) internal view {
        super._preValidatePurchase(beneficiary, weiAmount);

        if (now < _privateSaleClosingTime) {
            require(weiAmount >= 69 ether, "Not enough Eth. Contributions must be 69 Eth minimum during the private sale");
        } else {
            require(weiAmount >= 100 finney, "Not enough Eth. Contributions must be 0.1 Eth minimum during the presale and crowdsale");
        }

        if (now > _privateSaleClosingTime && now < _presaleOpeningTime) {
            revert("Private sale has ended and the presale is yet to begin");
        } else if (now > _presaleOpeningTime + 13 days && now < _crowdsaleOpeningTime) {
            revert("Presale has ended and the crowdsale is yet to begin");
        }
    }

    /**
     * @dev Overrides function in the Crowdsale contract to enable a custom phased distribution
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified weiAmount
     */
    function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {

        if (now < _privateSaleClosingTime) {
            return weiAmount.mul(BTR_PRIVATE_SALE_RATE);

        } else if (now < _presaleOpeningTime + 1 days) {
            return weiAmount.mul(BTR_PRESALE_RATE_DAY_1);
        } else if (now < _presaleOpeningTime + 5 days) {
            return weiAmount.mul(BTR_PRESALE_RATE_DAY_2_TO_5);
        } else if (now < _presaleOpeningTime + 9 days) {
            return weiAmount.mul(BTR_PRESALE_RATE_DAY_6_TO_9);
        } else if (now < _presaleOpeningTime + 13 days) {
            return weiAmount.mul(BTR_PRESALE_RATE_DAY_10_TO_13);

        } else if (now < _crowdsaleOpeningTime + 2 hours) {
            return weiAmount.mul(BTR_CROWDSALE_RATE_DAY_1_FIRST_2_HOURS);
        } else if (now < _crowdsaleOpeningTime + 1 weeks) {
            return weiAmount.mul(BTR_CROWDSALE_RATE_DAY_1_TO_7);
        } else if (now < _crowdsaleOpeningTime + 2 weeks) {
            return weiAmount.mul(BTR_CROWDSALE_RATE_DAY_8_TO_14);
        } else if (now < _crowdsaleOpeningTime + 3 weeks) {
            return weiAmount.mul(BTR_CROWDSALE_RATE_DAY_15_TO_21);
        } else if (now <= closingTime()) {
            return weiAmount.mul(BTR_CROWDSALE_RATE_DAY_22_TO_28);
        }
    }

    /**
     * @dev Overrides function in AllowanceCrowdsale contract (therefore also overrides function
     *      in Crowdsale contract) to add functionality for distribution of a second token, BSK.
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

        if (now < _privateSaleClosingTime) {
            return weiAmount.mul(BSK_PRIVATE_SALE_RATE);

        } else if (now < _presaleOpeningTime + 2 hours) {
            return weiAmount.mul(BSK_PRESALE_RATE_FIRST_2_HOURS);
        } else if (now < _presaleOpeningTime + 1 days) {
            return weiAmount.mul(BSK_PRESALE_RATE_DAY_1);
        } else if (now < _presaleOpeningTime + 5 days) {
            return weiAmount.mul(BSK_PRESALE_RATE_DAY_2_TO_5);
        } else if (now < _presaleOpeningTime + 9 days) {
            return weiAmount.mul(BSK_PRESALE_RATE_DAY_6_TO_9);
        } else if (now < _presaleOpeningTime + 13 days) {
            return weiAmount.mul(BSK_PRESALE_RATE_DAY_10_TO_13);

        } else if (now < _crowdsaleOpeningTime + 1 weeks) {
            return weiAmount.mul(BSK_CROWDSALE_RATE_DAY_1_TO_7);
        } else if (now < _crowdsaleOpeningTime + 2 weeks) {
            return weiAmount.mul(BSK_CROWDSALE_RATE_DAY_8_TO_14);
        } else if (now < _crowdsaleOpeningTime + 3 weeks) {
            return weiAmount.mul(BSK_CROWDSALE_RATE_DAY_15_TO_21);
        } else if (now <= closingTime()) {
            return weiAmount.mul(BSK_CROWDSALE_RATE_DAY_22_TO_28);
        }
    }
}
