const BitherToken = artifacts.require("BitherToken")
const BitherStockToken = artifacts.require("BitherStockToken")
const BitherCrowdsale = artifacts.require("BitherCrowdsale")
const MultiSigWallet = artifacts.require("MultiSigWallet")
const multiSigFunctions = require("../migrations/MultiSigFunctions")
const config = require("../migrations/DeploymentConfig")

/**
 * This script is for checking the allowance given to the Crowdsale contract. It should be used once
 * the Approvals have been submitted and the confirmation for those approvals have been made.
 *
 * Call with 'truffle --network [ropsten/mainnet] exec scripts/DisplayAllowanceForCrowdsale.js'
 */
module.exports = async function(callback) {
    const bitherToken = await BitherToken.at(config.BITHER_TOKEN_ADDRESS ? config.BITHER_TOKEN_ADDRESS : BitherToken.address)
    const bitherStockToken = await BitherStockToken.at(config.BITHER_STOCK_TOKEN_ADDRESS ? config.BITHER_STOCK_TOKEN_ADDRESS : BitherStockToken.address)
    const bitherCrowdsale = await BitherCrowdsale.at(config.BITHER_CROWDSALE_ADDRESS ? config.BITHER_CROWDSALE_ADDRESS : BitherCrowdsale.address)
    const multiSigWallet = await MultiSigWallet.at(config.MULTI_SIG_WALLET_ADDRESS ? config.MULTISIG_WALLET_ADDRESS : MultiSigWallet.address)

    const multiSigFunctionsObject = new multiSigFunctions.MultiSigFunctions(multiSigWallet, bitherCrowdsale, bitherToken, bitherStockToken)
    await multiSigFunctionsObject.displayBtrAllowanceForCrowdsale()
    await multiSigFunctionsObject.displayBskAllowanceForCrowdsale()

    process.exit()
}