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
    const etherBenefactor = accounts[2]
    const oneEtherWeiValue = web3.utils.toWei('1', 'ether')
    const fractionalEtherWeiValue = web3.utils.toWei('1.5', 'ether')
    const decimals = '000000000000000000' // 10 ** 18 decimals is the standard for ERC20 tokens, necessary as Solidity cannot handle fractional numbers.
    const btrCrowdsaleTokens = new BN('33000000' + decimals) // tokens available * (10 ** 18) number of decimals in BTR token
    const bskCrowdsaleTokens = new BN('21000000' + decimals) // tokens available * (10 ** 18) number of decimals in BSK token

    beforeEach(async () => {
        await deployBitherTokens()
        await deployBitherCrowdsale()
        await approveTokensForCrowdsaleAddress()
        await testUtils.increaseBlockTimeTo(openingTime) // Note that this can be inaccurate sometimes.
    })

    async function deployBitherTokens() {
        bitherToken = await BitherToken.new({ from: bitherTokensOwner })
        bitherStockToken = await BitherStockToken.new({ from: bitherTokensOwner })
    }

    async function deployBitherCrowdsale() {
        openingTime = (await time.latest()) + time.duration.days(1)
        bitherCrowdsale = await BitherCrowdsale.new(bitherToken.address, bitherStockToken.address,
            bitherTokensOwner, etherBenefactor, openingTime)
    }

    async function approveTokensForCrowdsaleAddress() {
        await bitherToken.approve(bitherCrowdsale.address, btrCrowdsaleTokens, { from: bitherTokensOwner })
        await bitherStockToken.approve(bitherCrowdsale.address, bskCrowdsaleTokens, { from: bitherTokensOwner })
    }

    describe("constructor()", async () => {

        it("costs less than 2000000 gas", async () => {
            maxGasCost = 2000000
            deploymentReceipt = await web3.eth.getTransactionReceipt(bitherCrowdsale.transactionHash)
            deploymentCost = deploymentReceipt.gasUsed

            assert.isBelow(deploymentCost, maxGasCost)
        })
    })

    describe("buyTokens(address beneficiary) misc tests", async () => {

        it("costs less than 200000 gas", async () => {
            const maxGasCost = 200000

            transaction = await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })
            const transactionGasCost = transaction.receipt.gasUsed

            assert.isBelow(transactionGasCost, maxGasCost)
        })

        it("deposits ether to etherBenefactor address", async () => {
            const etherBenefactorBalance = await web3.eth.getBalance(etherBenefactor)
            const expectedEtherBalance = new BN(etherBenefactorBalance).add(new BN(oneEtherWeiValue))

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

            const actualEtherBalance = await web3.eth.getBalance(etherBenefactor)
            assert.equal(actualEtherBalance, expectedEtherBalance)
        })

        it("reverts after the crowdsale has ended", async () => {
            const closingTime = openingTime + time.duration.days(41) + time.duration.seconds(1)
            await testUtils.increaseBlockTimeTo(closingTime)

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                { value: oneEtherWeiValue, from: tokenBenefactor }))
        })

        it("reverts before the crowdsale has started", async () => {
            await deployBitherCrowdsale()
            const timeBeforeOpening = openingTime - time.duration.seconds(3)
            await testUtils.increaseBlockTimeTo(timeBeforeOpening)

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

        it("reverts when allowance of tokens has been revoked", async () => {
            await bitherToken.approve(bitherCrowdsale.address, 0)
            await bitherStockToken.approve(bitherCrowdsale.address, 0)

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                { value: oneEtherWeiValue, from: tokenBenefactor }))
        })

    })

    describe("buyTokens(address beneficiary) BTR token tests", async () => {

        it("purchases 110 tokens for 1 ether at start of sale", async () => {
            const expectedTokenBalance = new BN('110' + decimals)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 109 tokens for 1 ether after 1st day", async () => {
            const phaseOpeningTime = openingTime + time.duration.days(1) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('109', bitherToken, phaseOpeningTime)
        })

        it("purchases 109 tokens for 1 ether before the end of the 5th day", async () => {
            const phaseFinalTime = openingTime + time.duration.days(5) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('109', bitherToken, phaseFinalTime)
        })

        it("purchases 108 tokens for 1 ether after 5th day", async () => {
            const phaseOpeningTime = openingTime + time.duration.days(5) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('108', bitherToken, phaseOpeningTime)
        })

        it("purchases 108 tokens for 1 ether before the end of the 9th day", async () => {
            const phaseFinalTime = openingTime + time.duration.days(9) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('108', bitherToken, phaseFinalTime)
        })

        it("purchases 107 tokens for 1 ether after 9th day", async () => {
            const phaseOpeningTime = openingTime + time.duration.days(9) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('107', bitherToken, phaseOpeningTime)
        })

        it("purchases 107 tokens for 1 ether before the end of the 13th day", async () => {
            const phaseFinalTime = openingTime + time.duration.days(13) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('107', bitherToken, phaseFinalTime)
        })

        it("purchases 110 tokens for 1 ether after 13th day", async () => {
            const phaseOpeningTime = openingTime + time.duration.days(13) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('110', bitherToken, phaseOpeningTime)
        })

        it("purchases 110 tokens for 1 ether before the end of the 2nd hour on the 14th day", async () => {
            const phaseFinalTime = openingTime + time.duration.days(13) + time.duration.hours(2) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('110', bitherToken, phaseFinalTime)
        })

        it("purchases 106 tokens for 1 ether after 2nd hour on the 14th day", async () => {
            const phaseOpeningTime = openingTime + time.duration.days(13) + time.duration.hours(2) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('106', bitherToken, phaseOpeningTime)
        })

        it("purchases 106 tokens for 1 ether before the end of the 20th day", async () => {
            const phaseFinalTime = openingTime + time.duration.days(20) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('106', bitherToken, phaseFinalTime)
        })

        it("purchases 104 tokens for 1 ether after 20th day", async () => {
            const phaseOpeningTime = openingTime + time.duration.days(20) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('104', bitherToken, phaseOpeningTime)
        })

        it("purchases 104 tokens for 1 ether before the end of the 27th day", async () => {
            const phaseFinalTime = openingTime + time.duration.days(27) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('104', bitherToken, phaseFinalTime)
        })

        it("purchases 102 tokens for 1 ether after 27th day", async () => {
            const phaseOpeningTime = openingTime + time.duration.days(27) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('102', bitherToken, phaseOpeningTime)
        })

        it("purchases 102 tokens for 1 ether before the end of the 34th day", async () => {
            const phaseFinalTime = openingTime + time.duration.days(34) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('102', bitherToken, phaseFinalTime)
        })

        it("purchases 100 tokens for 1 ether after 34th day", async () => {
            const phaseOpeningTime = openingTime + time.duration.days(34) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('100', bitherToken, phaseOpeningTime)
        })

        it("purchases 100 tokens for 1 ether before the end of the 41th day", async () => {
            const phaseFinalTime = openingTime + time.duration.days(41) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('100', bitherToken, phaseFinalTime)
        })

        it("purchases 165 tokens for 1.5 ether during 1st phase", async () => {
            const expectedTokenBalance = new BN('165' + decimals)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: fractionalEtherWeiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 163.5 tokens for 1.5 ether during 2nd phase", async () => {
            const expectedTokenBalance = new BN('163' + '500000000000000000') // The second part is what would come after the decimal point
            const phaseTime = openingTime + time.duration.days(2)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherToken, phaseTime)
        })

        it("purchases 162 tokens for 1.5 ether during the 3rd phase", async () => {
            const expectedTokenBalance = new BN('162' + decimals)
            const phaseTime = openingTime + time.duration.days(6)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherToken, phaseTime)
        })

        it("purchases 160.5 tokens for 1.5 ether during the 4th phase", async () => {
            const expectedTokenBalance = new BN('160' + '500000000000000000') // The second part is what would come after the decimal point
            const phaseTime = openingTime + time.duration.days(10)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherToken, phaseTime)
        })

        it("purchases 165 tokens for 1.5 ether during the 5th phase", async () => {
            const expectedTokenBalance = new BN('165' + decimals)
            const phaseTime = openingTime + time.duration.days(13) + time.duration.hours(1)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherToken, phaseTime)
        })

        it("purchases 159 tokens for 1.5 ether during the 6th phase", async () => {
            const expectedTokenBalance = new BN('159' + decimals)
            const phaseTime = openingTime + time.duration.days(15)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherToken, phaseTime)
        })

        it("purchases 156 tokens for 1.5 ether during the 7th phase", async () => {
            const expectedTokenBalance = new BN('156' + decimals)
            const phaseTime = openingTime + time.duration.days(21)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherToken, phaseTime)
        })

        it("purchases 153 tokens for 1.5 ether during the 8th phase", async () => {
            const expectedTokenBalance = new BN('153' + decimals)
            const phaseTime = openingTime + time.duration.days(28)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherToken, phaseTime)
        })

        it("purchases 150 tokens for 1.5 ether during the 9th phase", async () => {
            const expectedTokenBalance = new BN('150' + decimals)
            const phaseTime = openingTime + time.duration.days(35)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherToken, phaseTime)
        })
    })

    describe("buyTokens(address beneficiary) BSK token tests", async () => {

        it("purchases 70 tokens for 1 ether at start of sale", async () => {
            const expectedTokenBalance = new BN('70' + decimals)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherStockToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 68 tokens for 1 ether after 2nd hour", async () => {
            const phaseOpeningTime = openingTime + time.duration.hours(2) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('68', bitherStockToken, phaseOpeningTime)
        })

        it("purchases 68 tokens for 1 ether before end of the 1st day", async () => {
            const phaseEndingTime = openingTime + time.duration.days(1) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('68', bitherStockToken, phaseEndingTime)
        })

        it("purchases 66 tokens for 1 ether after 1st day", async () => {
            const phaseOpeningTime = openingTime + time.duration.days(1) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('66', bitherStockToken, phaseOpeningTime)
        })

        it("purchases 66 tokens for 1 ether before the end of the 5th day", async () => {
            const phaseFinalTime = openingTime + time.duration.days(5) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('66', bitherStockToken, phaseFinalTime)
        })

        it("purchases 64 tokens for 1 ether after 5th day", async () => {
            const phaseOpeningTime = openingTime + time.duration.days(5) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('64', bitherStockToken, phaseOpeningTime)
        })

        it("purchases 64 tokens for 1 ether before the end of the 9th day", async () => {
            const phaseFinalTime = openingTime + time.duration.days(9) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('64', bitherStockToken, phaseFinalTime)
        })

        it("purchases 62 tokens for 1 ether after 9th day", async () => {
            const phaseOpeningTime = openingTime + time.duration.days(9) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('62', bitherStockToken, phaseOpeningTime)
        })

        it("purchases 62 tokens for 1 ether before the end of the 13th day", async () => {
            const phaseFinalTime = openingTime + time.duration.days(13) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('62', bitherStockToken, phaseFinalTime)
        })

        it("purchases 105 tokens for 1.5 ether during 1st phase", async () => {
            const expectedTokenBalance = new BN('105' + decimals)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: fractionalEtherWeiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherStockToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        it("purchases 102 tokens for 1.5 ether during 2nd phase", async () => {
            const expectedTokenBalance = new BN('102' + decimals)
            const phaseTime = openingTime + time.duration.hours(2)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherStockToken, phaseTime)
        })

        it("purchases 99 tokens for 1.5 ether during the 3rd phase", async () => {
            const expectedTokenBalance = new BN('99' + decimals)
            const phaseTime = openingTime + time.duration.days(2)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherStockToken, phaseTime)
        })

        it("purchases 96 tokens for 1.5 ether during the 4th phase", async () => {
            const expectedTokenBalance = new BN('96' + decimals)
            const phaseTime = openingTime + time.duration.days(6)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherStockToken, phaseTime)
        })

        it("purchases 93 tokens for 1.5 ether during the 5th phase", async () => {
            const expectedTokenBalance = new BN('93' + decimals)
            const phaseTime = openingTime + time.duration.days(10)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherStockToken, phaseTime)
        })
    })

    async function buyTokensAndAssertTokensPurchased(expectedTokenBalanceString, tokenContract, atTime) {
        const expectedTokenBalance = new BN(expectedTokenBalanceString + decimals)
        await testUtils.increaseBlockTimeTo(atTime)

        await bitherCrowdsale.buyTokens(tokenBenefactor, { value: oneEtherWeiValue, from: tokenBenefactor })

        const actualTokenBalance = await tokenContract.balanceOf(tokenBenefactor)
        assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
    }

    async function buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalanceBn, tokenContract, atTime) {
        await testUtils.increaseBlockTimeTo(atTime)

        await bitherCrowdsale.buyTokens(tokenBenefactor, { value: fractionalEtherWeiValue, from: tokenBenefactor })

        const actualTokenBalance = await tokenContract.balanceOf(tokenBenefactor)
        assert.equal(actualTokenBalance.toString(), expectedTokenBalanceBn.toString())
    }


})