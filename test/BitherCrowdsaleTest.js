const BitherCrowdsale = artifacts.require("BitherCrowdsale.sol")
const BitherToken = artifacts.require("BitherToken.sol")
const BitherStockToken = artifacts.require("BitherStockToken.sol")

const BN = require("bn.js")
const shouldFail = require("openzeppelin-solidity/test/helpers/shouldFail")
const time = require("openzeppelin-solidity/test/helpers/time")
const testUtils = require("./TestUtils")

contract("BitherCrowdsale", accounts => {

    let bitherToken, bitherStockToken, bitherCrowdsale

    let privateSaleClosingTime, preSaleOpeningTime, crowdsaleOpeningTime
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
        await testUtils.increaseBlockTimeTo(preSaleOpeningTime) // Note that this can be inaccurate sometimes.
    })

    async function deployBitherTokens() {
        bitherToken = await BitherToken.new({from: bitherTokensOwner})
        bitherStockToken = await BitherStockToken.new({from: bitherTokensOwner})
    }

    async function deployBitherCrowdsale() {
        preSaleOpeningTime = (await time.latest()) + time.duration.weeks(8)
        crowdsaleOpeningTime = preSaleOpeningTime + time.duration.weeks(3)
        privateSaleClosingTime = preSaleOpeningTime - time.duration.days(2)

        bitherCrowdsale = await BitherCrowdsale.new(bitherToken.address, bitherStockToken.address,
            bitherTokensOwner, etherBenefactor, preSaleOpeningTime)
    }

    async function approveTokensForCrowdsaleAddress() {
        await bitherToken.approve(bitherCrowdsale.address, btrCrowdsaleTokens, {from: bitherTokensOwner})
        await bitherStockToken.approve(bitherCrowdsale.address, bskCrowdsaleTokens, {from: bitherTokensOwner})
    }

    describe("constructor()", () => {

        it("costs less than 2000000 gas", async () => {
            maxGasCost = 2000000
            deploymentReceipt = await web3.eth.getTransactionReceipt(bitherCrowdsale.transactionHash)
            deploymentCost = deploymentReceipt.gasUsed

            assert.isBelow(deploymentCost, maxGasCost)
        })
    })

    describe("buyTokens(address beneficiary) misc tests", () => {

        it("costs less than 200000 gas", async () => {
            const maxGasCost = 200000

            transaction = await bitherCrowdsale.buyTokens(tokenBenefactor, {
                value: oneEtherWeiValue,
                from: tokenBenefactor
            })
            const transactionGasCost = transaction.receipt.gasUsed

            assert.isBelow(transactionGasCost, maxGasCost)
        })

        it("deposits ether to etherBenefactor address", async () => {
            const etherBenefactorBalance = await web3.eth.getBalance(etherBenefactor)
            const expectedEtherBalance = new BN(etherBenefactorBalance).add(new BN(oneEtherWeiValue))

            await bitherCrowdsale.buyTokens(tokenBenefactor, {value: oneEtherWeiValue, from: tokenBenefactor})

            const actualEtherBalance = await web3.eth.getBalance(etherBenefactor)
            assert.equal(actualEtherBalance, expectedEtherBalance)
        })

        it("reverts after the crowdsale has ended", async () => {
            const closingTime = crowdsaleOpeningTime + time.duration.weeks(4) + time.duration.seconds(1)
            await testUtils.increaseBlockTimeTo(closingTime)

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: oneEtherWeiValue, from: tokenBenefactor}))
        })

        // The following 3 tests require ganache-cli to be run with '-e [account balance]' where account balance is a high amount of ether.
        it("reverts when cap of 300000 ether is reached", async () => {
            const largeEtherWeiValue = web3.utils.toWei('300000', 'ether')
            await bitherCrowdsale.buyTokens(tokenBenefactor, {value: largeEtherWeiValue, from: tokenBenefactor})

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: oneEtherWeiValue, from: tokenBenefactor}))
        })

        it("reverts when cap of 300000 ether is reached over multiple time periods", async () => {
            const largeEtherWeiValue = web3.utils.toWei('150000', 'ether')
            await bitherCrowdsale.buyTokens(tokenBenefactor, {value: largeEtherWeiValue, from: tokenBenefactor})
            await testUtils.increaseBlockTimeTo(preSaleOpeningTime + time.duration.days(2))
            await bitherCrowdsale.buyTokens(tokenBenefactor, {value: largeEtherWeiValue, from: tokenBenefactor})

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: oneEtherWeiValue, from: tokenBenefactor}))
        })

        it("has no allowance of tokens when cap of 300000 ether is reached", async () => {
            const largeEtherWeiValue = web3.utils.toWei('300000', 'ether')
            await bitherCrowdsale.buyTokens(tokenBenefactor, {value: largeEtherWeiValue, from: tokenBenefactor})

            const remainingBtr = await bitherCrowdsale.remainingTokens()
            const remainingBsk = await bitherStockToken.allowance(bitherTokensOwner, bitherCrowdsale.address)

            assert.equal(remainingBtr, 0)
            assert.equal(remainingBsk, 0)
        })

        it("reverts when allowance of tokens has been revoked", async () => {
            await bitherToken.approve(bitherCrowdsale.address, 0)
            await bitherStockToken.approve(bitherCrowdsale.address, 0)

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: oneEtherWeiValue, from: tokenBenefactor}))
        })

        it("reverts when contributing less than 0.1 ether after private sale period", async () => {
            const lessThanOneEth = web3.utils.toWei('99', 'finney')

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: lessThanOneEth, from: tokenBenefactor}))
        })

        it("reverts when contributing less than 69 ether at start of private sale period", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            const largeEthValue = web3.utils.toWei('68', 'ether')

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: largeEthValue, from: tokenBenefactor}))
        })

        it("reverts when contributing less than 69 ether at end of private sale period", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            await testUtils.increaseBlockTimeTo(privateSaleClosingTime - time.duration.seconds(2))
            const largeEthValue = web3.utils.toWei('68', 'ether')

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: largeEthValue, from: tokenBenefactor}))
        })

        it("reverts after private sale closing time", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            await testUtils.increaseBlockTimeTo(privateSaleClosingTime + time.duration.seconds(2))
            const largeEtherValue = web3.utils.toWei("69", "ether")
            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: largeEtherValue, from: tokenBenefactor}))
        })

        it("reverts before presale opening time", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            await testUtils.increaseBlockTimeTo(preSaleOpeningTime - time.duration.seconds(2))
            const largeEtherValue = web3.utils.toWei("69", "ether")
            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: largeEtherValue, from: tokenBenefactor}))
        })

        it("reverts after presale closing time", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            await testUtils.increaseBlockTimeTo(crowdsaleOpeningTime - time.duration.days(2) + time.duration.seconds(2))
            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: oneEtherWeiValue, from: tokenBenefactor}))
        })

        it("reverts before crowdsale opening time", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            const timeBeforeOpening = preSaleOpeningTime - time.duration.seconds(3)
            await testUtils.increaseBlockTimeTo(timeBeforeOpening)

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: oneEtherWeiValue, from: tokenBenefactor}))
        })

    })

    describe("send() BTR token tests", () => {

        const purchaseForEtherAtTimeTestCases = [
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "110", 0, StartOfDay, "at start of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "109", 1, StartOfDay, "at start of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "108", 5, StartOfDay, "at start of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "107", 9, StartOfDay, "at start of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "110", 21, StartOfDay, "at start of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "104", 28, StartOfDay, "at start of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "102", 35, StartOfDay, "at start of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "100", 42, StartOfDay, "at start of", "Bither Tokens"),

            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "110", 1, BeforeEndOfDay, "before end of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "109", 5, BeforeEndOfDay, "before end of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "108", 9, BeforeEndOfDay, "before end of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "107", 13, BeforeEndOfDay, "before end of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "106", 28, BeforeEndOfDay, "before end of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "104", 35, BeforeEndOfDay, "before end of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "102", 42, BeforeEndOfDay, "before end of", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "100", 49, BeforeEndOfDay, "before end of", "Bither Tokens"),

            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "165", 0, StartOfDay, "at", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "162", 6, StartOfDay, "at", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "159", 22, StartOfDay, "at", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "156", 29, StartOfDay, "at", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "153", 36, StartOfDay, "at", "Bither Tokens"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "150", 43, StartOfDay, "at", "Bither Tokens"),
        ]

        purchaseForEtherAtTimeTestCases.forEach((testCase) => {
            PurchaseForEtherAtTimeTest(testCase)
        })

        it("purchases 110 tokens for 1 ether before end of day 21 and hour 2", async () => {
            const phaseFinalTime = preSaleOpeningTime + time.duration.days(21) + time.duration.hours(2) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            const expectedTokenBalance = new BN('110' + decimals)
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, oneEtherWeiValue, bitherToken, phaseFinalTime)
        })

        it("purchases 106 tokens for 1 ether after day 21 and hour 2", async () => {
            const phaseOpeningTime = preSaleOpeningTime + time.duration.days(21) + time.duration.hours(2) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            const expectedTokenBalance = new BN('106' + decimals)
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, oneEtherWeiValue, bitherToken, phaseOpeningTime)
        })

        it("purchases 163.5 tokens for 1.5 ether at day 2", async () => {
            const expectedTokenBalance = new BN('163' + '500000000000000000') // The second part is what would come after the decimal point
            const phaseTime = preSaleOpeningTime + time.duration.days(2)
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, fractionalEtherWeiValue, bitherToken, phaseTime)
        })

        it("purchases 160.5 tokens for 1.5 ether at day 10", async () => {
            const expectedTokenBalance = new BN('160' + '500000000000000000') // The second part is what would come after the decimal point
            const phaseTime = preSaleOpeningTime + time.duration.days(10)
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, fractionalEtherWeiValue, bitherToken, phaseTime)
        })

        it("purchases 165 tokens for 1.5 ether at day 21 and 1 hour", async () => {
            const expectedTokenBalance = new BN('165' + decimals)
            const phaseTime = preSaleOpeningTime + time.duration.days(21) + time.duration.hours(1)
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, fractionalEtherWeiValue, bitherToken, phaseTime)
        })

        it("purchases 7590 tokens for 69 ether after deployment", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            const expectedTokenBalance = new BN('7590' + decimals)
            const phaseTime = await time.latest()
            const largeEtherWeiValue = web3.utils.toWei("69", "ether")
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, largeEtherWeiValue, bitherToken, phaseTime)
        })

        it("purchases 7590 tokens for 69 ether before private sale closing time", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            const expectedTokenBalance = new BN('7590' + decimals)
            const phaseTime = privateSaleClosingTime - time.duration.seconds(2)
            const largeEtherWeiValue = web3.utils.toWei("69", "ether")
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, largeEtherWeiValue, bitherToken, phaseTime)
        })
    })

    describe("send() BSK token tests", () => {

        const purchaseForEtherAtTimeTestCases = [
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "70", 0, StartOfDay, "at start of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "66", 1, StartOfDay, "at start of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "64", 5, StartOfDay, "at start of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "62", 9, StartOfDay, "at start of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "60", 21, StartOfDay, "at start of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "57", 28, StartOfDay, "at start of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "54", 35, StartOfDay, "at start of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "50", 42, StartOfDay, "at start of", "Bither Stock Tokens"),

            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "68", 1, BeforeEndOfDay, "before end of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "66", 5, BeforeEndOfDay, "before end of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "64", 9, BeforeEndOfDay, "before end of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "62", 13, BeforeEndOfDay, "before end of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "60", 28, BeforeEndOfDay, "before end of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "57", 35, BeforeEndOfDay, "before end of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "54", 42, BeforeEndOfDay, "before end of", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "50", 49, BeforeEndOfDay, "before end of", "Bither Stock Tokens"),

            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "105", 0, StartOfDay, "at", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "99", 2, StartOfDay, "at", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "96", 6, StartOfDay, "at", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "93", 10, StartOfDay, "at", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "90", 22, StartOfDay, "at", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "81", 36, StartOfDay, "at", "Bither Stock Tokens"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "75", 43, StartOfDay, "at", "Bither Stock Tokens"),
        ]

        purchaseForEtherAtTimeTestCases.forEach((testCase) => {
            PurchaseForEtherAtTimeTest(testCase)
        })

        it("purchases 70 tokens for 1 ether before hour 2", async () => {
            const phaseOpeningTime = preSaleOpeningTime + time.duration.hours(2) - time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            const expectedTokenBalance = new BN('70' + decimals) // The second part is what would come after the decimal point
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, oneEtherWeiValue, bitherStockToken, phaseOpeningTime)
        })

        it("purchases 68 tokens for 1 ether after hour 2", async () => {
            const phaseOpeningTime = preSaleOpeningTime + time.duration.hours(2) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            const expectedTokenBalance = new BN('68' + decimals) // The second part is what would come after the decimal point
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, oneEtherWeiValue, bitherStockToken, phaseOpeningTime)
        })

        it("purchases 102 tokens for 1.5 ether at hour 2", async () => {
            const expectedTokenBalance = new BN('102' + decimals)
            const phaseTime = preSaleOpeningTime + time.duration.hours(2)
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, fractionalEtherWeiValue, bitherStockToken, phaseTime)
        })

        it("purchases 85.5 tokens for 1.5 ether at day 29", async () => {
            const expectedTokenBalance = new BN('85' + '500000000000000000')
            const phaseTime = preSaleOpeningTime + time.duration.days(29)
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, fractionalEtherWeiValue, bitherStockToken, phaseTime)
        })

        it("purchases 4830 tokens for 69 ether after deployment", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            const expectedTokenBalance = new BN('4830' + decimals)
            const phaseTime = await time.latest()
            const largeEtherWeiValue = web3.utils.toWei("69", "ether")
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, largeEtherWeiValue, bitherStockToken, phaseTime)
        })

        it("purchases 4830 tokens for 69 ether before private sale closing time", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            const expectedTokenBalance = new BN('4830' + decimals)
            const phaseTime = privateSaleClosingTime - time.duration.seconds(2)
            const largeEtherWeiValue = web3.utils.toWei("69", "ether")
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, largeEtherWeiValue, bitherStockToken, phaseTime)
        })
    })

    function StartOfDay(day) { return time.duration.days(day) + time.duration.seconds(2) } // +2 seconds to account for variance when increasing the block time
    function BeforeEndOfDay(day) { return time.duration.days(day) - time.duration.seconds(2) } // -2 seconds to account for variance when increasing the block time

    function PurchaseForEtherAtTimeTestCase(ethPayment, expectedTokens, timeInCrowdsale, timeFunction, description, token) {
        this.ethPayment = ethPayment
        this.expectedTokens = expectedTokens
        this.timeInCrowdsale = timeInCrowdsale
        this.timeFunction = timeFunction
        this.description = description
        this.token = token
    }

    function PurchaseForEtherAtTimeTest(testCase) {
        const ethValue = web3.utils.fromWei(testCase.ethPayment, 'ether')

        it("purchases " + testCase.expectedTokens + " " + testCase.token + " for " + ethValue.toString() +
            " ether " + testCase.description + " day " + testCase.timeInCrowdsale.toString(), async () => {

            const token = testCase.token === "Bither Tokens" ? bitherToken : bitherStockToken
            const atDay = preSaleOpeningTime + testCase.timeFunction(testCase.timeInCrowdsale)
            const expectedTokenBalance = new BN(testCase.expectedTokens + decimals)
            await BuyTokensAndAssertTokensPurchased(expectedTokenBalance, testCase.ethPayment, token, atDay)
        })
    }

    async function BuyTokensAndAssertTokensPurchased(expectedTokenBalance, ethPayment, tokenContract, atTime) {
        await testUtils.increaseBlockTimeTo(atTime)
        await bitherCrowdsale.send(ethPayment, {from: tokenBenefactor})

        const actualTokenBalance = await tokenContract.balanceOf(tokenBenefactor)
        assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
    }


})