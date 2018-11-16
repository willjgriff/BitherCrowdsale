const MultiSigWallet = artifacts.require("MultiSigWallet")
const multiSigFunctions = require("../migrations/MultiSigFunctions")
const config = require("../migrations/DeploymentConfig")
const BN = require("bn.js")

module.exports = async function(callback) {
    const multiSigWallet = await MultiSigWallet.at(config.MULTISIG_WALLET_ADDRESS ? config.MULTISIG_WALLET_ADDRESS : MultiSigWallet.address)
    const MULTISIG_OWNER = (await web3.eth.getAccounts())[1] // This should be account[0] provided the correct account has been imported into the web3 provider

    const multiSigTransactionIdBN1 = new BN(config.MULTISIG_TRANSACTION_IDS[0])
    const multiSigTransactionIdBN2 = new BN(config.MULTISIG_TRANSACTION_IDS[1])

    await multiSigFunctions.confirmApproveTransactionForMultiSig(multiSigWallet, multiSigTransactionIdBN1, MULTISIG_OWNER)
    await multiSigFunctions.confirmApproveTransactionForMultiSig(multiSigWallet, multiSigTransactionIdBN2, MULTISIG_OWNER)

    // process.exit()
}