const BitherToken = artifacts.require("BitherToken")
const BitherStockToken = artifacts.require("BitherStockToken")
const BitherCrowdsale = artifacts.require("BitherCrowdsale")
const MultiSigWallet = artifacts.require("MultiSigWallet")
const utils = require("../Utils")
const BN = require("bn.js")

const BITHER_TOKEN_ADDRESS = BitherToken.address
const BITHER_STOCK_TOKEN_ADDRESS = BitherStockToken.address
const BITHER_CROWDSALE_ADDRESS = BitherCrowdsale.address
const MULTI_SIG_WALLET_ADDRESS = MultiSigWallet.address

const bitherToken = BitherToken.at(BITHER_TOKEN_ADDRESS)
const bitherStockToken = BitherStockToken.at(BITHER_STOCK_TOKEN_ADDRESS)
const bitherCrowdsale = BitherCrowdsale.at(BITHER_CROWDSALE_ADDRESS)
const multiSigWallet = MultiSigWallet.at(MULTI_SIG_WALLET_ADDRESS)

const decimals = '000000000000000000' // 10 ** 18 decimals is the standard for ERC20 tokens, necessary as Solidity cannot handle fractional numbers.
const btrCrowdsaleTokens = new BN('33000000' + decimals) // tokens available * (10 ** 18) number of decimals in BTR token
const bskCrowdsaleTokens = new BN('21000000' + decimals) // tokens available * (10 ** 18) number of decimals in BSK token

async function submitApproveTransactionToMultiSig(token, numberOfTokens) {
    const approveFunctionCall = token.contract.methods.approve(bitherCrowdsale.address, numberOfTokens).encodeABI()
    console.log(approveFunctionCall)
    const approveTransaction = await multiSigWallet.submitTransaction(token.address, 0, approveFunctionCall)
    return getTransactionIdBn(approveTransaction)
}

function getTransactionIdBn(submitTransaction) {
    const transactionId = utils.getEventArgValue(submitTransaction, "Submission", "transactionId")
    return new BN(transactionId);
}

async function confirmApproveTransactionForMultiSig(transactionId) {
    await multiSigWallet.confirmTransaction(approveTransactionId, {from: multiSigOwners[1]})
}

async function displayAllowanceForCrowdsale(token) {
    const approvedTokens = await token.allowance(multiSigWallet.address, bitherCrowdsale.address)
    console.log(approvedTokens + " of " + await token.name() + " approved for BitherCrowdsale contract")
}

module.exports = async (callback) => {
    const bitherToken = await BitherToken.at(BITHER_TOKEN_ADDRESS)
    await submitApproveTransactionToMultiSig(bitherToken, btrCrowdsaleTokens)
}