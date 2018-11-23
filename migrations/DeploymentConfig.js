
/**
 * For deployment of the Crowdsale and MultiSig contracts the following 5 constants need to be set.
 */
const BTR_CROWDSALE_ALLOWANCE = '33000000' // Should be a string to conform to BN format
const BSK_CROWDSALE_ALLOWANCE = '21000000' // Should be a string to conform to BN format
const MULTISIG_CONFIRMATIONS = 2
const MULTISIG_OWNERS = "" // Should a be a list of addresses eg ["0xaBcD...", "0xaBcD...", "0xaBcD...", "0xaBcD..."]
const CROWDSALE_OPENING_TIME = 1574505475 // Saturday, 23 November 2019 10:37:55, can get from here: https://www.epochconverter.com/

/**
 * Once the contracts have been deployed, the constants below must be set for the MultiSig owner that submits the approval transaction.
 * Everything above can be ignored.
 * Once set, execute SubmitApprovalsToMultiSig.js with 'truffle --network [ropsten/mainnet] exec scripts/SubmitApprovalsToMultiSig.js'
 */
const BITHER_TOKEN_ADDRESS = ""
const BITHER_STOCK_TOKEN_ADDRESS = ""
const BITHER_CROWDSALE_ADDRESS = ""

/**
 * Once the contracts have been deployed and a MultiSig owner has submitted the approval transactions,
 * the MultiSig owners can confirm the approval transactions, for which only these two constants needs setting.
 * Everything above can be ignored.
 * Once set, execute SubmitConfirmationsToMultiSig.js with 'truffle --network [ropsten/mainnet] exec scripts/SubmitConfirmationsToMultiSig.js'
 */
const MULTISIG_WALLET_ADDRESS = ""
const MULTISIG_TRANSACTION_IDS = [0, 1] // Provided deployment has gone to plan, this should be [0, 1]

module.exports = {
    BTR_CROWDSALE_ALLOWANCE,
    BSK_CROWDSALE_ALLOWANCE,
    MULTISIG_CONFIRMATIONS,
    MULTISIG_OWNERS,
    CROWDSALE_OPENING_TIME,

    BITHER_TOKEN_ADDRESS,
    BITHER_STOCK_TOKEN_ADDRESS,
    BITHER_CROWDSALE_ADDRESS,
    MULTISIG_WALLET_ADDRESS,

    MULTISIG_TRANSACTION_IDS
}