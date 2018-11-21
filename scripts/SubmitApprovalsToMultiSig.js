const BitherToken = artifacts.require("BitherToken")
const BitherStockToken = artifacts.require("BitherStockToken")
const BitherCrowdsale = artifacts.require("BitherCrowdsale")
const MultiSigWallet = artifacts.require("MultiSigWallet")
const multiSigFunctions = require("../migrations/MultiSigFunctions")
const config = require("../migrations/DeploymentConfig")

/**
 * This script should be called by one (and only one) of the MultiSig owners after deployment. This submits
 * an approval transaction to the multisig wallet which will allow the crowdsale contract to distribute
 * the specified number of tokens.
 *
 * Call with 'truffle --network [ropsten/mainnet] exec scripts/SubmitApprovalsToMultiSig.js'
 */
module.exports = async function(callback) {
    const bitherToken = await BitherToken.at(config.BITHER_TOKEN_ADDRESS ? config.BITHER_TOKEN_ADDRESS : BitherToken.address)
    const bitherStockToken = await BitherStockToken.at(config.BITHER_STOCK_TOKEN_ADDRESS ? config.BITHER_STOCK_TOKEN_ADDRESS : BitherStockToken.address)
    const bitherCrowdsale = await BitherCrowdsale.at(config.BITHER_CROWDSALE_ADDRESS ? config.BITHER_CROWDSALE_ADDRESS : BitherCrowdsale.address)
    const multiSigWallet = await MultiSigWallet.at(config.MULTI_SIG_WALLET_ADDRESS ? config.MULTISIG_WALLET_ADDRESS : MultiSigWallet.address)

    const multiSigFunctionsObject = new multiSigFunctions.MultiSigFunctions(multiSigWallet, bitherCrowdsale, bitherToken, bitherStockToken)
    await multiSigFunctionsObject.submitApproveBtrTransactionToMultiSig()
    await multiSigFunctionsObject.submitApproveBskTransactionToMultiSig()

    process.exit()
}