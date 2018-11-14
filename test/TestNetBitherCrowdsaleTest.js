// const BitherCrowdsale = artifacts.require("BitherCrowdsale.sol")
// const BitherToken = artifacts.require("BitherToken.sol")
// const BitherStockToken = artifacts.require("BitherStockToken.sol")
//
// const BN = require("bn.js")
// const shouldFail = require("openzeppelin-solidity/test/helpers/shouldFail")
// const time = require("openzeppelin-solidity/test/helpers/time")
// const testUtils = require("./TestUtils")
//
// contract("BitherCrowdsale", accounts => {
//
//     let bitherToken, bitherStockToken, bitherCrowdsale
//
//     let openingTime
//     const bitherTokensOwner = accounts[0]
//     const tokenBenefactor = accounts[1]
//     const etherBenefactor = accounts[2]
//     const oneEtherWeiValue = web3.utils.toWei('1', 'ether')
//     const fractionalEtherWeiValue = web3.utils.toWei('1.5', 'ether')
//     const decimals = '000000000000000000' // 10 ** 18 decimals is the standard for ERC20 tokens, necessary as Solidity cannot handle fractional numbers.
//     const btrCowdsaleTokens = new BN('33000000' + decimals) // tokens available * (10 ** 18) number of decimals in BTR token
//     const bskCowdsaleTokens = new BN('21000000' + decimals) // tokens available * (10 ** 18) number of decimals in BSK token
//
//     beforeEach(async () => {
//         await deployBitherTokens()
//         await deployBitherCrowdsale()
//         await approveTokensForCrowdsaleAddress()
//         await testUtils.sleepUntil(openingTime)
//     })
//
//     async function deployBitherTokens() {
//         bitherToken = await BitherToken.new({ from: bitherTokensOwner })
//         bitherStockToken = await BitherStockToken.new({ from: bitherTokensOwner })
//     }
//
//     async function deployBitherCrowdsale() {
//         const latestTime = await time.latest()
//         openingTime = latestTime + time.duration.seconds(120)
//         console.log("Latest block time: " + latestTime +  " Opening time: " + openingTime + " JS Now: " + testUtils.currentEpoch())
//
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
//         it("costs less than 200000 gas", async () => {
//             const maxGasCost = 200000
//
//             transaction = await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })
//             const transactionGasCost = transaction.receipt.gasUsed
//
//             assert.isBelow(transactionGasCost, maxGasCost)
//         })
//
//         it("deposits ether to etherBenefactor address", async () => {
//             const etherBenefactorBalance = await web3.eth.getBalance(etherBenefactor)
//             const expectedEtherBalance = new BN(etherBenefactorBalance).add(new BN(oneEtherWeiValue))
//
//             await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })
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
//                 { value: oneEtherWeiValue, from: tokenBenefactor }))
//         })
//
//     })
//
//     describe("buyTokens(address beneficiary) BTR token tests", async () => {
//
//         it("purchases 110 tokens for 1 ether at start of sale", async () => {
//             const expectedTokenBalance = new BN('110' + decimals)
//
//             await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })
//
//             const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
//             assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
//         })
//
//         it("purchases 165 tokens for 1.5 ether during 1st phase", async () => {
//             const expectedTokenBalance = new BN('165' + decimals)
//
//             await bitherCrowdsale.buyTokens(tokenBenefactor, { value: fractionalEtherWeiValue, from: tokenBenefactor })
//
//             const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
//             assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
//         })
//     })
//
//     describe("buyTokens(address beneficiary) BSK token tests", async () => {
//
//         it("purchases 70 tokens for 1 ether at start of sale", async () => {
//             const expectedTokenBalance = new BN('70' + decimals)
//
//             await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })
//
//             const actualTokenBalance = await bitherStockToken.balanceOf(tokenBenefactor)
//             assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
//         })
//
//         it("purchases 105 tokens for 1.5 ether during 1st phase", async () => {
//             const expectedTokenBalance = new BN('105' + decimals)
//
//             await bitherCrowdsale.buyTokens(tokenBenefactor, { value: fractionalEtherWeiValue, from: tokenBenefactor })
//
//             const actualTokenBalance = await bitherStockToken.balanceOf(tokenBenefactor)
//             assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
//         })
//     })
//
//
// })