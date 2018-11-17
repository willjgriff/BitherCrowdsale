const MultiSigWallet = artifacts.require("MultiSigWallet")
const multiSigFunctions = require("../migrations/MultiSigFunctions")
const config = require("../migrations/DeploymentConfig")
const BN = require("bn.js")

/**
 * This script must be called by the required number of multisig owners to execute the approve function, giving
 * the crowdsale contract an allowance of tokens to distribute during the crowdsale. The last one to call it will
 * execute the allowance transaction automatically on the tokens which will approve the use of tokens for the crowdsale.
 * After the last indidividual has called it, they should check the allowance with DisplayAllowanceForCrowdsale.js.
 *
 * Call with 'truffle exec scripts/SubmitConfirmationsToMultiSig.js'
 */
module.exports = async function(callback) {
    const multiSigWallet = await MultiSigWallet.at(config.MULTISIG_WALLET_ADDRESS ? config.MULTISIG_WALLET_ADDRESS : MultiSigWallet.address)
    const MULTISIG_OWNER = (await web3.eth.getAccounts())[1] // This should be account[0] provided the correct account has been imported into the web3 provider

    const multiSigFunctionsObject = new multiSigFunctions.MultiSigFunctions(multiSigWallet)
    const multiSigTransactionIdBN1 = new BN(config.MULTISIG_TRANSACTION_IDS[0])
    const multiSigTransactionIdBN2 = new BN(config.MULTISIG_TRANSACTION_IDS[1])

    await multiSigFunctionsObject.confirmApproveTransactionForMultiSig(multiSigTransactionIdBN1, MULTISIG_OWNER)
    await multiSigFunctionsObject.confirmApproveTransactionForMultiSig(multiSigTransactionIdBN2, MULTISIG_OWNER)

    // process.exit()
}