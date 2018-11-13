const BitherCrowdsale = artifacts.require("BitherCrowdsale.sol")
const BitherToken = artifacts.require("BitherToken.sol")
const BitherStockToken = artifacts.require("BitherStockToken.sol")

const BN = require("bn.js")
const shouldFail = require("openzeppelin-solidity/test/helpers/shouldFail")
const time = require("openzeppelin-solidity/test/helpers/time")
const testUtils = require("./TestUtils")

contract("BitherCrowdsale", accounts => {

    let bitherToken, bitherStockToken, bitherCrowdsale

    let openingTime
    const bitherTokensOwner = accounts[0]
    const tokenBenefactor = accounts[1]
    const etherBenefactor = accounts[5]
    const oneEtherWeiValue = web3.utils.toWei('1', 'ether')
    const decimals = '000000000000000000'
    const btrCowdsaleTokens = new BN('33000000' + decimals) // tokens available * (10 ** 18) number of decimals in BTR token
    const bskCowdsaleTokens = new BN('21000000' + decimals) // tokens available * (10 ** 18) number of decimals in BSK token

    beforeEach(async () => {
        bitherToken = await BitherToken.new({ from: bitherTokensOwner })
        bitherStockToken = await BitherStockToken.new({ from: bitherTokensOwner })
        openingTime = (await time.latest()) + time.duration.days(1)

        bitherCrowdsale = await BitherCrowdsale.new(bitherToken.address, bitherStockToken.address,
            bitherTokensOwner, etherBenefactor, openingTime)

        await bitherToken.approve(bitherCrowdsale.address, btrCowdsaleTokens, { from: bitherTokensOwner })
        await bitherStockToken.approve(bitherCrowdsale.address, bskCowdsaleTokens, { from: bitherTokensOwner })
        await testUtils.increaseBlockTimeTo(openingTime) // Note that this can be inaccurate sometimes.
    })

    describe("buyTokens(address beneficiary) misc tests", async () => {

        it("deposits ether to etherBenefactor", async () => {
            const etherBenefactorBalance = await web3.eth.getBalance(etherBenefactor)
            const expectedEtherBalance = new BN(etherBenefactorBalance).add(new BN(oneEtherWeiValue))

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

            const actualEtherBalance = await web3.eth.getBalance(etherBenefactor)
            assert.equal(actualEtherBalance, expectedEtherBalance)
        })

        it("reverts after crowdsale has ended", async () => {
            const closingTime = openingTime + time.duration.days(13) + time.duration.seconds(1)
            await testUtils.increaseBlockTimeTo(closingTime)

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                { value: oneEtherWeiValue, from: tokenBenefactor }))
        })

        // The following 3 tests require ganache-cli to be run with '-e [account balance]' where account balance is a high amount of ether.
        it("reverts when cap of 300000 ether is reached", async () => {
            // 300000 * 110 (first day BTR rate) = 30000000 BTR tokens + 3000000 bonus BTR tokens = 33000000 BTR
            // 300000 * 70 (first 2 hours BSK rate) = 15000000 BSK tokens + 6000000 bonus BSK tokens = 21000000 BTR
            const largeEtherWeiValue = web3.utils.toWei('300000', 'ether')
            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: largeEtherWeiValue, from: tokenBenefactor})

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                { value: oneEtherWeiValue, from: tokenBenefactor }))
        })

        it("reverts when cap of 300000 ether is reached over multiple time periods", async () => {
            const largeEtherWeiValue = web3.utils.toWei('150000', 'ether')
            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: largeEtherWeiValue, from: tokenBenefactor})
            await testUtils.increaseBlockTimeTo(openingTime + time.duration.days(2))
            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: largeEtherWeiValue, from: tokenBenefactor})

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                { value: oneEtherWeiValue, from: tokenBenefactor }))
        })

        it("has no allowance of tokens when cap of 300000 ether is reached", async () => {
            const largeEtherWeiValue = web3.utils.toWei('300000', 'ether')

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: largeEtherWeiValue, from: tokenBenefactor})

            const remainingBtr = await bitherCrowdsale.remainingTokens()
            const remainingBsk = await bitherStockToken.allowance(bitherTokensOwner, bitherCrowdsale.address)
            assert.equal(remainingBtr, 0)
            assert.equal(remainingBsk, 0)
        })

    })

    describe("buyTokens(address beneficiary) BTR token tests", async () => {

        it("purchases 110 tokens for 1 ether for account 1 at start of sale", async () => {
            const expectedTokenBalance = new BN('110' + decimals)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 109 tokens for 1 ether after 1st day", async () => {
            const expectedTokenBalance = new BN('109' + decimals)
            const secondWaveOpeningTime = openingTime + time.duration.days(1) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await testUtils.increaseBlockTimeTo(secondWaveOpeningTime)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 109 tokens for 1 ether before the end of the 5th day", async () => {
            const expectedTokenBalance = new BN('109' + decimals)
            const secondWaveFinalSecond = openingTime + time.duration.days(5) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await testUtils.increaseBlockTimeTo(secondWaveFinalSecond)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 108 tokens for 1 ether after 5th day", async () => {
            const expectedTokenBalance = new BN('108' + decimals)
            const thirdWaveOpeningTime = openingTime + time.duration.days(5) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await testUtils.increaseBlockTimeTo(thirdWaveOpeningTime)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 108 tokens for 1 ether before the end of the 9th day", async () => {
            const expectedTokenBalance = new BN('108' + decimals)
            const thirdWaveFinalSecond = openingTime + time.duration.days(9) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await testUtils.increaseBlockTimeTo(thirdWaveFinalSecond)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 107 tokens for 1 ether after 9th day", async () => {
            const expectedTokenBalance = new BN('107' + decimals)
            const fourthWaveOpeningTime = openingTime + time.duration.days(9) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await testUtils.increaseBlockTimeTo(fourthWaveOpeningTime)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 107 tokens for 1 ether before the end of the 13th day", async () => {
            const expectedTokenBalance = new BN('107' + decimals)
            const fourthWaveFinalSecond = openingTime + time.duration.days(13) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await testUtils.increaseBlockTimeTo(fourthWaveFinalSecond)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })
    })

    describe("buyTokens(address beneficiary) BSK token tests", async () => {

        it("purchases 70 tokens for 1 ether for account 1 at start of sale", async () => {
            const expectedTokenBalance = new BN('70' + decimals)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherStockToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })
    })


})