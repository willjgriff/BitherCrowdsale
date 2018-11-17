const BitherToken = artifacts.require("./BitherToken.sol")
const BitherStockToken = artifacts.require("./BitherStockToken.sol")
const MultiSigWallet = artifacts.require("./MultiSigWallet.sol")
const BitherCrowdsale = artifacts.require("./BitherCrowdsale.sol")
const config = require("./DeploymentConfig")
const multiSigFunctions = require("./MultiSigFunctions")

module.exports = async (deployer, network, accounts) => {

    const BITHER_TOKENS_INITIAL_OWNER = accounts[0]
    const MULTISIG_OWNERS = config.MULTISIG_OWNERS ? config.MULTISIG_OWNERS : [accounts[0], accounts[1], accounts[2]]

    let bitherToken, bitherStockToken, multiSigWallet, bitherCrowdsale

    await deployBitherTokens()
    await deployMultiSigWallet()
    await transferTokensToMultiSig()
    await deployBitherCrowdsale()

    /**
     * This should be removed/commented for final deployment.
     * Approvals and confirmations should be executed independently by MultiSig Owners.
     */
    await approveAndConfirmTokensForCrowdsale()

    async function deployBitherTokens() {
        await deployer.deploy(BitherToken, {from: BITHER_TOKENS_INITIAL_OWNER})
        bitherToken = await BitherToken.at(BitherToken.address)

        await deployer.deploy(BitherStockToken, {from: BITHER_TOKENS_INITIAL_OWNER})
        bitherStockToken = await BitherStockToken.at(BitherStockToken.address)
    }

    async function deployMultiSigWallet() {
        await deployer.deploy(MultiSigWallet, MULTISIG_OWNERS, config.MULTISIG_CONFIRMATIONS, { from: accounts[0] })
        multiSigWallet = await MultiSigWallet.at(MultiSigWallet.address)
    }

    async function transferTokensToMultiSig() {
        const allBtrTokens = await bitherToken.balanceOf(BITHER_TOKENS_INITIAL_OWNER)
        await bitherToken.transfer(MultiSigWallet.address, allBtrTokens, {from: BITHER_TOKENS_INITIAL_OWNER})
        console.log("Original owner BTR Balance: " + await bitherToken.balanceOf(BITHER_TOKENS_INITIAL_OWNER))
        console.log("MultiSig BTR Balance: " + await bitherToken.balanceOf(MultiSigWallet.address))

        const allBskTokens = await bitherStockToken.balanceOf(BITHER_TOKENS_INITIAL_OWNER)
        await bitherStockToken.transfer(MultiSigWallet.address, allBskTokens, {from: BITHER_TOKENS_INITIAL_OWNER})
        console.log("Original owner BSK Balance: " + await bitherStockToken.balanceOf(BITHER_TOKENS_INITIAL_OWNER))
        console.log("MultiSig BSK Balance: " + await bitherStockToken.balanceOf(MultiSigWallet.address))
    }

    async function deployBitherCrowdsale() {
        await deployer.deploy(BitherCrowdsale, BitherToken.address, BitherStockToken.address,
            MultiSigWallet.address, MultiSigWallet.address, config.CROWDSALE_OPENING_TIME)
        bitherCrowdsale = await BitherCrowdsale.at(BitherCrowdsale.address)
    }

    async function approveAndConfirmTokensForCrowdsale() {
        const multiSigFunctionsObject = new multiSigFunctions.MultiSigFunctions(multiSigWallet, bitherCrowdsale, bitherToken, bitherStockToken)

        const multiSigApproveBtrTransactionId = await multiSigFunctionsObject.submitApproveBtrTransactionToMultiSig()
        await multiSigFunctionsObject.confirmApproveTransactionForMultiSig(multiSigApproveBtrTransactionId, MULTISIG_OWNERS[1])
        await multiSigFunctionsObject.displayBtrAllowanceForCrowdsale()

        const multiSigApproveBskTransactionId = await multiSigFunctionsObject.submitApproveBskTransactionToMultiSig()
        await multiSigFunctionsObject.confirmApproveTransactionForMultiSig(multiSigApproveBskTransactionId, MULTISIG_OWNERS[1])
        await multiSigFunctionsObject.displayBskAllowanceForCrowdsale()
    }

}
