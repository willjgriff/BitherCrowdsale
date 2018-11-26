const BitherToken = artifacts.require("BitherToken.sol")
const BitherStockToken = artifacts.require("BitherStockToken.sol")
const BitherCrowdsale = artifacts.require("BitherCrowdsale.sol")
const MultiSigWallet = artifacts.require("MultiSigWallet.sol")
const time = require("openzeppelin-solidity/test/helpers/time")
const BN = require("bn.js")
const testUtils = require("./TestUtils")

contract("MultiSig Crowdsale Integration", accounts => {

    let bitherToken, bitherStockToken, bitherCrowdsale, multiSigWallet
    const bitherTokensOwner = accounts[3]
    const multiSigOwners = [accounts[0], accounts[1], accounts[2]]
    const requiredConfirmations = 2
    let preSaleOpeningTime, crowdsaleOpeningTime, privateSaleClosingTime
    const decimals = '000000000000000000'
    const btrCrowdsaleTokens = new BN('33000000' + decimals) // tokens available * (10 ** 18) number of decimals in BTR token
    const bskCrowdsaleTokens = new BN('21000000' + decimals) // tokens available * (10 ** 18) number of decimals in BSK token

    beforeEach(async () => {
        await deployBitherTokens()
        await deployMultiSigWallet()
        await transferTokensToMultiSig()
        await deployBitherCrowdsale()
        await approveTokensForCrowdsaleAddress()
        await testUtils.increaseBlockTimeTo(preSaleOpeningTime) // Note that this can be inaccurate sometimes.
    })

    async function deployBitherTokens() {
        bitherToken = await BitherToken.new({ from: bitherTokensOwner })
        bitherStockToken = await BitherStockToken.new({ from: bitherTokensOwner })
    }

    async function deployMultiSigWallet() {
        multiSigWallet = await MultiSigWallet.new(multiSigOwners, requiredConfirmations)
    }

    async function transferTokensToMultiSig() {
        const allBtrTokens = await bitherToken.balanceOf(bitherTokensOwner)
        await bitherToken.transfer(multiSigWallet.address, allBtrTokens, { from: bitherTokensOwner })
        const allBskTokens = await bitherStockToken.balanceOf(bitherTokensOwner)
        await bitherStockToken.transfer(multiSigWallet.address, allBskTokens, { from: bitherTokensOwner })
    }

    async function deployBitherCrowdsale() {
        preSaleOpeningTime = (await time.latest()) + time.duration.weeks(8)
        crowdsaleOpeningTime = preSaleOpeningTime + time.duration.weeks(3)
        privateSaleClosingTime = preSaleOpeningTime - time.duration.days(2)

        bitherCrowdsale = await BitherCrowdsale.new(bitherToken.address, bitherStockToken.address,
            multiSigWallet.address, multiSigWallet.address, preSaleOpeningTime)
    }

    async function approveTokensForCrowdsaleAddress() {
        const approveBtrFunctionCall = bitherToken.contract.methods.approve(bitherCrowdsale.address, btrCrowdsaleTokens).encodeABI()
        const approveBskFunctionCall = bitherStockToken.contract.methods.approve(bitherCrowdsale.address, bskCrowdsaleTokens).encodeABI()

        const btrApproveTransaction = await multiSigWallet.submitTransaction(bitherToken.address, 0, approveBtrFunctionCall, { from: multiSigOwners[0] })
        const btrApproveTransactionId = getTransactionIdBn(btrApproveTransaction)
        const bskApproveTransaction = await multiSigWallet.submitTransaction(bitherStockToken.address, 0, approveBskFunctionCall, { from: multiSigOwners[0] })
        const bskApproveTransactionId = getTransactionIdBn(bskApproveTransaction)

        await multiSigWallet.confirmTransaction(btrApproveTransactionId, { from: multiSigOwners[1] })
        await multiSigWallet.confirmTransaction(bskApproveTransactionId, { from: multiSigOwners[1] })
    }

    function getTransactionIdBn(submitTransaction) {
        const transactionId = testUtils.getEventArgValue(submitTransaction, "Submission", "transactionId")
        return new BN(transactionId);
    }

    it("approves correct amount of tokens for crowdsale contract to distribute", async () => {
        const btrTokensAvailable = await bitherCrowdsale.remainingTokens()
        const bskTokensAvailable = await bitherStockToken.allowance(multiSigWallet.address, bitherCrowdsale.address)

        assert.equal(btrTokensAvailable.toString(), btrCrowdsaleTokens.toString())
        assert.equal(bskTokensAvailable.toString(), bskCrowdsaleTokens.toString())
    })


})