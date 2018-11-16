const BitherToken = artifacts.require("./BitherToken.sol")
const BitherStockToken = artifacts.require("./BitherStockToken.sol")
const MultiSigWallet = artifacts.require("./MultiSigWallet.sol")
const BitherCrowdsale = artifacts.require("./BitherCrowdsale.sol")
const multiSigFunctions = require("./MultiSigFunctions")
const config = require("./DeploymentConfig")

module.exports = async (deployer, network, accounts) => {

    const BITHER_TOKENS_INITIAL_OWNER = accounts[0]
    const MULTISIG_OWNERS = config.MULTISIG_OWNERS ? config.MULTISIG_OWNERS : [accounts[0], accounts[1], accounts[2]]

    let bitherToken, bitherStockToken, multiSigWallet, bitherCrowdsale

    await deployBitherTokens()
    await deployMultiSigWallet()
    await transferTokensToMultiSig()
    await deployBitherCrowdsale()

    // This should be removed for final deployment.
    // await approveAndConfirmTokensForCrowdsale

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

    /**
     * This should be removed for final deployment and approvals and confirmations executed by MultiSig Owners.
     */
    async function approveAndConfirmTokensForCrowdsale() {
        const multiSigApproveBtrTransactionId = await multiSigFunctions.submitApproveBtrTransactionToMultiSig(multiSigWallet, bitherCrowdsale, bitherToken)
        await multiSigFunctions.confirmApproveTransactionForMultiSig(multiSigWallet, multiSigApproveBtrTransactionId, MULTISIG_OWNERS[1])
        const multiSigApproveBskTransactionId = await multiSigFunctions.submitApproveBskTransactionToMultiSig(multiSigWallet, bitherCrowdsale, bitherStockToken)
        await multiSigFunctions.confirmApproveTransactionForMultiSig(multiSigWallet, multiSigApproveBskTransactionId, MULTISIG_OWNERS[1])
        await multiSigFunctions.displayAllowanceForCrowdsale(multiSigWallet, bitherCrowdsale, bitherToken)
        await multiSigFunctions.displayAllowanceForCrowdsale(multiSigWallet, bitherCrowdsale, bitherStockToken)
    }

}
