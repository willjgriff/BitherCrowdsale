// const BitherCrowdsale = artifacts.require("BitherCrowdsale.sol")
// const BitherToken = artifacts.require("BitherToken.sol")
// const BitherStockToken = artifacts.require("BitherStockToken.sol")
//
// const BN = require("bn.js")
// const shouldFail = require("openzeppelin-solidity/test/helpers/shouldFail")
// const time = require("openzeppelin-solidity/test/helpers/time")
// const testUtils = require("./TestUtils")
//
// /**
//  * Tests specifically for a live test net. Note that many tests that can be run on a local ganache/testrpc
//  * instance cannot be run on a live test net as we cannot increase the block times artificially.
//  * We also need to test with smaller amounts of Ether as availability of test net Ether is limited.
//  */
// contract("BitherCrowdsale", accounts => {
//
//     let bitherToken, bitherStockToken, bitherCrowdsale
//
//     let openingTime
//     const bitherTokensOwner = accounts[0]
//     const tokenBenefactor = accounts[1]
//     const etherBenefactor = accounts[2]
//     const smallEtherWeiValue = web3.utils.toWei('0.01', 'ether')
//     const decimals = '000000000000000000' // 10 ** 18 decimals is the standard for ERC20 tokens, necessary as Solidity cannot handle fractional numbers.
//     const btrCowdsaleTokens = new BN('33000000' + decimals) // tokens available * (10 ** 18) number of decimals in BTR token
//     const bskCowdsaleTokens = new BN('21000000' + decimals) // tokens available * (10 ** 18) number of decimals in BSK token
//
//     beforeEach(async () => {
//         await deployBitherTokens()
//         await deployBitherCrowdsale()
//         await approveTokensForCrowdsaleAddress()
//         await testUtils.sleepUntil(openingTime) // Wait until the Crowdsale has started before attempting tests.
//
//         console.log("JS time: " + testUtils.currentEpoch() + " Current block time: " + await time.latest() + " Crowdsale opening time: " + openingTime)
//     })
//
//     async function deployBitherTokens() {
//         bitherToken = await BitherToken.new({ from: bitherTokensOwner })
//         bitherStockToken = await BitherStockToken.new({ from: bitherTokensOwner })
//     }
//
//     async function deployBitherCrowdsale() {
//         const latestTime = await time.latest()
//         openingTime = latestTime + time.duration.seconds(120) // Set to a close time in the future.
//         bitherCrowdsale = await BitherCrowdsale.new(bitherToken.address, bitherStockToken.address,
//             bitherTokensOwner, etherBenefactor, openingTime)
//     }
//
//     async function approveTokensForCrowdsaleAddress() {
//         await bitherToken.approve(bitherCrowdsale.address, btrCowdsaleTokens, { from: bitherTokensOwner })
//         await bitherStockToken.approve(bitherCrowdsale.address, bskCowdsaleTokens, { from: bitherTokensOwner })
//     }
//
//     describe("constructor()", async () => {
//
//         it("costs less than 2000000 gas", async () => {
//             maxGasCost = 2000000
//             deploymentReceipt = await web3.eth.getTransactionReceipt(bitherCrowdsale.transactionHash)
//             deploymentCost = deploymentReceipt.gasUsed
//
//             assert.isBelow(deploymentCost, maxGasCost)
//         })
//     })
//
//     describe("buyTokens(address beneficiary) misc tests", async () => {
//
//         // TEST FOR REVERTS BEFORE START OF SALE.
//
//         it("costs less than 200000 gas", async () => {
//             const maxGasCost = 200000
//
//             transaction = await bitherCrowdsale.buyTokens(tokenBenefactor, { value: smallEtherWeiValue, from: tokenBenefactor })
//             const transactionGasCost = transaction.receipt.gasUsed
//
//             assert.isBelow(transactionGasCost, maxGasCost)
//         })
//
//         it("deposits ether to etherBenefactor address", async () => {
//             const etherBenefactorBalance = await web3.eth.getBalance(etherBenefactor)
//             const expectedEtherBalance = new BN(etherBenefactorBalance).add(new BN(smallEtherWeiValue))
//
//             transaction = await bitherCrowdsale.buyTokens(tokenBenefactor, { value: smallEtherWeiValue, from: tokenBenefactor })
//             console.log("BuyTokens() Transaction hash: " + transaction.tx)
//
//             const actualEtherBalance = await web3.eth.getBalance(etherBenefactor)
//             assert.equal(actualEtherBalance, expectedEtherBalance)
//         })
//
//         it("reverts when allowance of tokens has been revoked", async () => {
//             await bitherToken.approve(bitherCrowdsale.address, 0)
//             await bitherStockToken.approve(bitherCrowdsale.address, 0)
//
//             await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
//                 { value: smallEtherWeiValue, from: tokenBenefactor }))
//         })
//
//     })
//
//     describe("buyTokens(address beneficiary) BTR token tests", async () => {
//
//         it("purchases 1.1 tokens for 0.01 ether at start of sale", async () => {
//             const expectedTokenBalance = new BN('1' + '100000000000000000') // The second part is what would come after the decimal point
//
//             transaction = await bitherCrowdsale.buyTokens(tokenBenefactor, { value: smallEtherWeiValue, from: tokenBenefactor })
//             console.log("BuyTokens() Transaction hash: " + transaction.tx)
//
//             const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
//             assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
//         })
//
//     })
//
//     describe("buyTokens(address beneficiary) BSK token tests", async () => {
//
//         it("purchases 0.7 tokens for 0.01 ether at start of sale", async () => {
//             const expectedTokenBalance = new BN('' + '700000000000000000') // The second part is what would come after the decimal point
//
//             transaction = await bitherCrowdsale.buyTokens(tokenBenefactor, { value: smallEtherWeiValue, from: tokenBenefactor })
//             console.log("BuyTokens() Transaction hash: " + transaction.tx)
//
//             const actualTokenBalance = await bitherStockToken.balanceOf(tokenBenefactor)
//             assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
//         })
//     })
//
//
// })