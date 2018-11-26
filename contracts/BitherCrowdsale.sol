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
    uint256 private _privateSaleClosingTime = 1548338400; // Thursday, 24 January 2019 14:00:00
    uint256 private _preSaleOpeningTime = 1548511200; // Saturday, 26 January 2019 14:00:00
    uint256 private _crowdsaleOpeningTime = 1550325600; // Saturday, 16 February 2019 14:00:00
    uint256 private _crowdsaleClosingTime = 1552744800; // Saturday, 16 March 2019 14:00:00

    uint256 private btrPrivateSaleRate = 110;
    uint256 private btrPresaleRateDay1 = 110;
    uint256 private btrPresaleRateDay2to5 = 109;
    uint256 private btrPresaleRateDay6to9 = 108;
    uint256 private btrPresaleRateDay10to13 = 107;
    uint256 private btrCrowdsaleRateDay1First2Hours = 110;
    uint256 private btrCrowdsaleRateDay1to7 = 106;
    uint256 private btrCrowdsaleRateDay8to14 = 104;
    uint256 private btrCrowdsaleRateDay15to21 = 102;
    uint256 private btrCrowdsaleRateDay22to28 = 100;

    uint256 private bskPrivateSaleRate = 70;
    uint256 private bskRateFirst2Hours = 70;
    uint256 private bskRateDay1 = 68;
    uint256 private bskRateDay2to5 = 66;
    uint256 private bskRateDay6to9 = 64;
    uint256 private bskRateDay10to13 = 62;
    uint256 private bskRateDay14to20 = 60;
    uint256 private bskRateDay21to27 = 57;
    uint256 private bskRateDay28to34 = 54;
    uint256 private bskRateDay35to41 = 50;

    IERC20 private _bitherStockToken;

    /**
     * Event for BSK token purchase logging
     * @param purchaser Who paid for the tokens
     * @param beneficiary Who got the tokens
     * @param value Wei paid for purchase
     * @param amount Amount of tokens purchased
     */
    event BitherStockTokensPurchased(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

    /** UPDATE THIS DOC STRING, ADD ASSERT/REQUIRE FOR TIMES BEING IN ORDER
     * @dev Constructor, calls the inherited classes constructors and stores the BitherStockToken
     * @param bitherToken The BitherToken address, must be an ERC20 contract
     * @param bitherStockToken The BitherStockToken, must be an ERC20 contract
     * @param bitherTokensOwner Address holding the tokens, which has approved allowance to the crowdsale
     * @param etherBenefactor Address that will receive the deposited Ether
     * @param preSaleOpeningTime The presale opening time, in seconds
     * @param crowdsaleOpeningTime The crowdsale opening time, in seconds
     */
    constructor(IERC20 bitherToken, IERC20 bitherStockToken, address bitherTokensOwner, address etherBenefactor, uint256 preSaleOpeningTime, uint256 crowdsaleOpeningTime)
        Crowdsale(btrPresaleRateDay1, etherBenefactor, bitherToken)
        AllowanceCrowdsale(bitherTokensOwner)
        TimedCrowdsale(now, crowdsaleOpeningTime + 4 weeks)
        CappedCrowdsale(capInWei)
        public
    {
        _bitherStockToken = bitherStockToken;

        _privateSaleClosingTime = preSaleOpeningTime - 2 days;
        _preSaleOpeningTime = preSaleOpeningTime;
        _crowdsaleOpeningTime = crowdsaleOpeningTime;
        _crowdsaleClosingTime = crowdsaleOpeningTime + 4 weeks;
    }

    /**
     * @dev Overrides function in the Crowdsale contract to revert contributions less then
     *      69 Eth during the first period and less than 1 Eth during the rest of the crowdsale
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _preValidatePurchase(address beneficiary, uint256 weiAmount) internal view {
        super._preValidatePurchase(beneficiary, weiAmount);
        if (now < openingTime() + 1 days) {
            require(weiAmount >= 69 ether, "Not enough Eth. Contributions must be 69 Eth minimum during the private sale");
        } else {
            require(weiAmount >= 100 finney, "Not enough Eth. Contributions must be 0.1 Eth minimum during the presale and crowdsale");
        }
    }

    /**
     * @dev Overrides function in the Crowdsale contract to enable a custom phased distribution
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified weiAmount
     */
    function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
        if (now < _privateSaleClosingTime) {
            return weiAmount.mul(btrPrivateSaleRate);
        } else if (now < _preSaleOpeningTime) {
            revert("Private sale has ended and the presale is yet to begin");
        } else if (now < _preSaleOpeningTime + 1 days) {
            return weiAmount.mul(btrPresaleRateDay1);
        } else if (now < _preSaleOpeningTime + 5 days) {
            return weiAmount.mul(btrPresaleRateDay2to5);
        } else if (now < _preSaleOpeningTime + 9 days) {
            return weiAmount.mul(btrPresaleRateDay6to9);
        } else if (now < _preSaleOpeningTime + 13 days) {
            return weiAmount.mul(btrPresaleRateDay10to13);
        } else if (now < _crowdsaleOpeningTime) {
            revert("Presale has ended and the crowdsale is yet to begin");
        } else if (now < _crowdsaleOpeningTime + 2 hours) {
            return weiAmount.mul(btrCrowdsaleRateDay1First2Hours);
        } else if (now < _crowdsaleOpeningTime + 1 weeks) {
            return weiAmount.mul(btrCrowdsaleRateDay1to7);
        } else if (now < _crowdsaleOpeningTime + 2 weeks) {
            return weiAmount.mul(btrCrowdsaleRateDay8to14);
        } else if (now < _crowdsaleOpeningTime + 3 weeks) {
            return weiAmount.mul(btrCrowdsaleRateDay15to21);
        } else if (now <= closingTime()) {
            return weiAmount.mul(btrCrowdsaleRateDay22to28);
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
        if (now < openingTime() + 2 hours) {
            return weiAmount.mul(bskRateFirst2Hours);
        } else if (now < openingTime() + 1 days) {
            return weiAmount.mul(bskRateDay1);
        } else if (now < openingTime() + 5 days) {
            return weiAmount.mul(bskRateDay2to5);
        } else if (now < openingTime() + 9 days) {
            return weiAmount.mul(bskRateDay6to9);
        } else if (now < openingTime() + 13 days) {
            return weiAmount.mul(bskRateDay10to13);
        } else if (now < openingTime() + 20 days) {
            return weiAmount.mul(bskRateDay14to20);
        } else if (now < openingTime() + 27 days) {
            return weiAmount.mul(bskRateDay21to27);
        } else if (now < openingTime() + 34 days) {
            return weiAmount.mul(bskRateDay28to34);
        } else if (now <= closingTime()) {
            return weiAmount.mul(bskRateDay35to41);
        }
    }
}
