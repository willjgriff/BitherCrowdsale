const BitherToken = artifacts.require("./BitherToken.sol")
const BitherStockToken = artifacts.require("./BitherStockToken.sol")
const MultiSigWallet = artifacts.require("./MultiSigWallet.sol")
const BitherCrowdsale = artifacts.require("./BitherCrowdsale.sol")
const BN = require("bn.js")
const deployUtils = require("./DeployUtils")

module.exports = async (deployer, network, accounts) => {

    const bitherTokensOwner = accounts[0]
    const multiSigOwners = [accounts[0], accounts[1], accounts[2]]
    const requiredConfirmations = 2
    const openingTime = 1542906507 // Thursday, 22 November 2018 17:08:27

    const decimals = '000000000000000000' // 10 ** 18 decimals is the standard for ERC20 tokens, necessary as Solidity cannot handle fractional numbers.
    const btrCrowdsaleTokens = new BN('33000000' + decimals) // tokens available * (10 ** 18) number of decimals in BTR token
    const bskCrowdsaleTokens = new BN('21000000' + decimals) // tokens available * (10 ** 18) number of decimals in BSK token

    let bitherToken, bitherStockToken, multiSigWallet, bitherCrowdsale

    await deployBitherTokens()
    await deployMultiSigWallet()
    await transferTokensToMultiSig()
    await deployBitherCrowdsale()
    await approveTokensForCrowdsaleAddress(bitherToken, btrCrowdsaleTokens)
    await approveTokensForCrowdsaleAddress(bitherStockToken, bskCrowdsaleTokens)

    async function deployBitherTokens() {
        await deployer.deploy(BitherToken, {from: bitherTokensOwner})
        bitherToken = await BitherToken.at(BitherToken.address)

        await deployer.deploy(BitherStockToken, {from: bitherTokensOwner})
        bitherStockToken = await BitherStockToken.at(BitherStockToken.address)
    }

    async function deployMultiSigWallet() {
        await deployer.deploy(MultiSigWallet, multiSigOwners, requiredConfirmations)
        multiSigWallet = await MultiSigWallet.at(MultiSigWallet.address)
    }

    async function transferTokensToMultiSig() {
        const allBtrTokens = await bitherToken.balanceOf(bitherTokensOwner)
        await bitherToken.transfer(MultiSigWallet.address, allBtrTokens, {from: bitherTokensOwner})
        console.log("Original owner BTR Balance: " + await bitherToken.balanceOf(bitherTokensOwner))
        console.log("MultiSig BTR Balance: " + await bitherToken.balanceOf(MultiSigWallet.address))

        const allBskTokens = await bitherStockToken.balanceOf(bitherTokensOwner)
        await bitherStockToken.transfer(MultiSigWallet.address, allBskTokens, {from: bitherTokensOwner})
        console.log("Original owner BSK Balance: " + await bitherStockToken.balanceOf(bitherTokensOwner))
        console.log("MultiSig BSK Balance: " + await bitherStockToken.balanceOf(MultiSigWallet.address))
    }

    async function deployBitherCrowdsale() {
        await deployer.deploy(BitherCrowdsale, BitherToken.address, BitherStockToken.address,
            MultiSigWallet.address, MultiSigWallet.address, openingTime)
        bitherCrowdsale = await BitherCrowdsale.at(BitherCrowdsale.address)
    }

    async function approveTokensForCrowdsaleAddress(token, numberOfTokens) {
        const approveBtrFunctionCall = token.contract.methods.approve(bitherCrowdsale.address, numberOfTokens).encodeABI()
        const approveTransaction = await multiSigWallet.submitTransaction(token.address, 0, approveBtrFunctionCall, {from: multiSigOwners[0]})
        const approveTransactionId = getTransactionIdBn(approveTransaction)
        await multiSigWallet.confirmTransaction(approveTransactionId, {from: multiSigOwners[1]})
    }

    function getTransactionIdBn(submitTransaction) {
        const transactionId = deployUtils.getEventArgValue(submitTransaction, "Submission", "transactionId")
        return new BN(transactionId);
    }

}
