const utils = require("../Utils")
const BN = require("bn.js")
const config = require("./DeploymentConfig")

export default class MultiSigFunctions {

    constructor(multiSigWallet, bitherCrowdsale, bitherToken, bitherStockToken) {
        this.DECIMALS = '000000000000000000' // 10 ** 18 decimals is the standard for ERC20 tokens, necessary as Solidity cannot handle fractional numbers.
        this.multiSigWallet = multiSigWallet
        this.bitherCrowdsale = bitherCrowdsale
        this.bitherToken = bitherToken
        this.bitherStockToken = bitherStockToken
    }

    async submitApproveBtrTransactionToMultiSig() {
        const btrCrowdsaleTokens = new BN(config.BTR_CROWDSALE_ALLOWANCE + this.DECIMALS)
        const transaction = await this.submitApproveTransactionToMultiSig(this.bitherToken, btrCrowdsaleTokens)
        const tokenName = await this.bitherToken.name()
        return this.getAndDisplayTransactionIdBn(transaction, tokenName)
    }

    async submitApproveBskTransactionToMultiSig() {
        const bskCrowdsaleTokens = new BN(config.BSK_CROWDSALE_ALLOWANCE + this.DECIMALS)
        const transaction = await this.submitApproveTransactionToMultiSig(this.bitherStockToken, bskCrowdsaleTokens)
        const tokenName = await this.bitherStockToken.name()
        return this.getAndDisplayTransactionIdBn(transaction, tokenName)
    }

    async submitApproveTransactionToMultiSig(token, numberOfTokens) {
        const approveFunctionCall = token.contract.methods.approve(this.bitherCrowdsale.address, numberOfTokens).encodeABI()
        return await this.multiSigWallet.submitTransaction(token.address, 0, approveFunctionCall)
    }

    getAndDisplayTransactionIdBn(submitTransaction, token) {
        const multiSigTransactionId = utils.getEventArgValue(submitTransaction, "Submission", "transactionId")
        console.log("   Approve Transaction for " + token + " added to MultiSig.\n" +
                    "   MultiSig Transaction ID: " + multiSigTransactionId + " needs " +
                    "to be confirmed by MultiSig Owners before it is executed")
        return new BN(multiSigTransactionId);
    }

    async confirmApproveTransactionForMultiSig(multiSigTransactionId, multiSigOwner) {
        await this.multiSigWallet.confirmTransaction(multiSigTransactionId, {from: multiSigOwner})
        console.log("   MultiSig Transaction " + multiSigTransactionId + " confirmed by " + multiSigOwner)
    }

    async displayBtrAllowanceForCrowdsale() {
        await this.displayAllowanceForCrowdsale(this.bitherToken)
    }

    async displayBskAllowanceForCrowdsale() {
        await this.displayAllowanceForCrowdsale(this.bitherStockToken)
    }

    async displayAllowanceForCrowdsale(token) {
        const approvedTokens = await token.allowance(this.multiSigWallet.address, this.bitherCrowdsale.address)
        console.log("   " + approvedTokens + " tokens of " + await token.name() + " approved for BitherCrowdsale contract")
    }

}