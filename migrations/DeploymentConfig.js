
/**
 * For deployment of the Crowdsale and MultiSig contracts the following 5 constants need to be set.
 */
const BTR_CROWDSALE_ALLOWANCE = '33000000' // Should be a string to conform to BN format
const BSK_CROWDSALE_ALLOWANCE = '21000000' // Should be a string to conform to BN format
const MULTISIG_CONFIRMATIONS = 2
const MULTISIG_OWNERS = "" // Should a be a list of addresses eg ["", "", "", ""]
const CROWDSALE_OPENING_TIME = 1542906507 // Thursday, 22 November 2018 17:08:27, can get from here: https://www.epochconverter.com/

/**
 * For the MultiSig owner that submits the approval transaction, the constants below need setting. Everything above can be ignored.
 * Once set, execute SubmitApprovalsToMultiSig.js with 'truffle exec scripts/SubmitApprovalsToMultiSig.js'
 */
const BITHER_TOKEN_ADDRESS = ""
const BITHER_STOCK_TOKEN_ADDRESS = ""
const BITHER_CROWDSALE_ADDRESS = ""

/**
 * For the MultiSig owners that need to confirm the approval transaction, only these two constants needs setting. Everything above can be ignored.
 * Once set, execute SubmitConfirmationsToMultiSig.js with 'truffle exec scripts/SubmitConfirmationsToMultiSig.js'
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