const utils = require("../Utils")
const BN = require("bn.js")
const config = require("./DeploymentConfig")

const DECIMALS = '000000000000000000' // 10 ** 18 decimals is the standard for ERC20 tokens, necessary as Solidity cannot handle fractional numbers.

async function submitApproveBtrTransactionToMultiSig(multiSigWallet, bitherCrowdsale, bitherToken) {
    const btrCrowdsaleTokens = new BN(config.BTR_CROWDSALE_ALLOWANCE + DECIMALS)
    const transaction = await submitApproveTransactionToMultiSig(multiSigWallet, bitherCrowdsale, bitherToken, btrCrowdsaleTokens)
    return getAndDisplayTransactionIdBn(transaction, "BTR")
}

async function submitApproveBskTransactionToMultiSig(multiSigWallet, bitherCrowdsale, bitherStockToken) {
    const bskCrowdsaleTokens = new BN(config.BSK_CROWDSALE_ALLOWANCE + DECIMALS)
    const transaction = await submitApproveTransactionToMultiSig(multiSigWallet, bitherCrowdsale, bitherStockToken, bskCrowdsaleTokens)
    return getAndDisplayTransactionIdBn(transaction, "BSK")
}

async function submitApproveTransactionToMultiSig(multiSigWallet, bitherCrowdsale, token, numberOfTokens) {
    const approveFunctionCall = token.contract.methods.approve(bitherCrowdsale.address, numberOfTokens).encodeABI()
    return await multiSigWallet.submitTransaction(token.address, 0, approveFunctionCall)
}

function getAndDisplayTransactionIdBn(submitTransaction, token) {
    const multiSigTransactionId = utils.getEventArgValue(submitTransaction, "Submission", "transactionId")
    console.log("   Approve Transaction for " + token + " added to MultiSig.\n" +
                "   MultiSig Transaction ID: " + multiSigTransactionId + " needs to be confirmed by MultiSig Owners before it is executed")
    return new BN(multiSigTransactionId);
}

async function confirmApproveTransactionForMultiSig(multiSigWallet, multiSigTransactionId, multiSigOwner) {
    await multiSigWallet.confirmTransaction(multiSigTransactionId, {from: multiSigOwner})
    console.log("MultiSig Transaction " + multiSigTransactionId + " confirmed by " + multiSigOwner)
}

async function displayAllowanceForCrowdsale(multiSigWallet, bitherCrowdsale, token) {
    const approvedTokens = await token.allowance(multiSigWallet.address, bitherCrowdsale.address)
    console.log(approvedTokens + " tokens of " + await token.name() + " approved for BitherCrowdsale contract")
}

module.exports = {
    submitApproveBtrTransactionToMultiSig,
    submitApproveBskTransactionToMultiSig,
    confirmApproveTransactionForMultiSig,
    displayAllowanceForCrowdsale
}