const BitherCrowdsale = artifacts.require("BitherCrowdsale.sol")
const BitherToken = artifacts.require("BitherToken.sol")
const BN = require("bn.js")
const shouldFail = require("openzeppelin-solidity/test/helpers/shouldFail")
const time = require("openzeppelin-solidity/test/helpers/time")
const testUtils = require("./TestUtils")

contract("BitherCrowdsale", accounts => {

    let bitherToken, bitherCrowdsale
    let openingTime
    const etherBenefactor = accounts[5]
    const bitherTokenOwner = accounts[0]
    const decimals = '000000000000000000'
    const crowdsaleTokens = new BN('6750000' + decimals) // 15% of total available * (10 ** 18) number of decimals in BTR token

    beforeEach(async () => {
        bitherToken = await BitherToken.new({ from: bitherTokenOwner })
        bitherCrowdsale = await BitherCrowdsale.new(bitherToken.address, bitherTokenOwner, etherBenefactor)
        await bitherToken.approve(bitherCrowdsale.address, crowdsaleTokens, { from: bitherTokenOwner })
        openingTime = await time.latest()
    })

    describe("buyTokens(address beneficiary)", async () => {

        it("purchases 110 tokens for 1 ether for account 1", async () => {
            const tokenBenefactor = accounts[1]
            const weiValue = web3.utils.toWei('1', 'ether')
            const expectedTokenBalance = new BN('110' + decimals)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: weiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("deposits ether to etherBenefactor", async () => {
            const tokenBenefactor = accounts[1]
            const weiValue = web3.utils.toWei('1', 'ether')
            const etherBenefactorBalance = await web3.eth.getBalance(etherBenefactor)
            const expectedEtherBalance = new BN(etherBenefactorBalance).add(new BN(weiValue))

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: weiValue, from: tokenBenefactor })

            const actualEtherBalance = await web3.eth.getBalance(etherBenefactor)
            assert.equal(actualEtherBalance, expectedEtherBalance)
        })

        it("reverts after crowdsale has ended", async () => {
            const tokenBenefactor = accounts[1]
            const weiValue = web3.utils.toWei('1', 'ether')
            const closingTime = openingTime + time.duration.days(12) + time.duration.seconds(1)
            await testUtils.increaseBlockTimeTo(closingTime)

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor, { value: weiValue, from: tokenBenefactor }))
        })

        it("purchases 109 tokens for 1 ether after 1st day", async () => {
            const tokenBenefactor = accounts[1]
            const weiValue = web3.utils.toWei('1', 'ether')
            const expectedTokenBalance = new BN('109' + decimals)
            const secondWaveOpeningTime = openingTime + time.duration.days(1)
            await testUtils.increaseBlockTimeTo(secondWaveOpeningTime)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: weiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 109 tokens for 1 ether before the end of the 4th day", async () => {
            const tokenBenefactor = accounts[1]
            const weiValue = web3.utils.toWei('1', 'ether')
            const expectedTokenBalance = new BN('109' + decimals)
            const secondWaveFinalSecond = openingTime + time.duration.days(4) - time.duration.seconds(1)
            await testUtils.increaseBlockTimeTo(secondWaveFinalSecond)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: weiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 108 tokens for 1 ether after 4th day", async () => {
            const tokenBenefactor = accounts[1]
            const weiValue = web3.utils.toWei('1', 'ether')
            const expectedTokenBalance = new BN('108' + decimals)
            const thirdWaveOpeningTime = openingTime + time.duration.days(4)
            await testUtils.increaseBlockTimeTo(thirdWaveOpeningTime)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: weiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 108 tokens for 1 ether before the end of the 8th day", async () => {
            const tokenBenefactor = accounts[1]
            const weiValue = web3.utils.toWei('1', 'ether')
            const expectedTokenBalance = new BN('108' + decimals)
            const thirdWaveFinalSecond = openingTime + time.duration.days(8) - time.duration.seconds(1)
            await testUtils.increaseBlockTimeTo(thirdWaveFinalSecond)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: weiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 107 tokens for 1 ether after 8th day", async () => {
            const tokenBenefactor = accounts[1]
            const weiValue = web3.utils.toWei('1', 'ether')
            const expectedTokenBalance = new BN('107' + decimals)
            const fourthWaveOpeningTime = openingTime + time.duration.days(8)
            await testUtils.increaseBlockTimeTo(fourthWaveOpeningTime)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: weiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 107 tokens for 1 ether before the end of the 12th day", async () => {
            const tokenBenefactor = accounts[1]
            const weiValue = web3.utils.toWei('1', 'ether')
            const expectedTokenBalance = new BN('107' + decimals)
            const fourthWaveFinalSecond = openingTime + time.duration.days(12)
            await testUtils.increaseBlockTimeTo(fourthWaveFinalSecond)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: weiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })
    })


})