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
        bitherToken = await BitherToken.new({from: bitherTokensOwner})
        bitherStockToken = await BitherStockToken.new({from: bitherTokensOwner})
    }

    async function deployBitherCrowdsale() {
        openingTime = (await time.latest()) + time.duration.days(1)
        bitherCrowdsale = await BitherCrowdsale.new(bitherToken.address, bitherStockToken.address,
            bitherTokensOwner, etherBenefactor, openingTime)
    }

    async function approveTokensForCrowdsaleAddress() {
        await bitherToken.approve(bitherCrowdsale.address, btrCrowdsaleTokens, {from: bitherTokensOwner})
        await bitherStockToken.approve(bitherCrowdsale.address, bskCrowdsaleTokens, {from: bitherTokensOwner})
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
            const closingTime = openingTime + time.duration.days(41) + time.duration.seconds(1)
            await testUtils.increaseBlockTimeTo(closingTime)

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: oneEtherWeiValue, from: tokenBenefactor}))
        })

        it("reverts before the crowdsale has started", async () => {
            await deployBitherCrowdsale()
            const timeBeforeOpening = openingTime - time.duration.seconds(3)
            await testUtils.increaseBlockTimeTo(timeBeforeOpening)

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: oneEtherWeiValue, from: tokenBenefactor}))
        })

        // The following 3 tests require ganache-cli to be run with '-e [account balance]' where account balance is a high amount of ether.
        it("reverts when cap of 300000 ether is reached", async () => {
            // 300000 * 110 (first day BTR rate) = 30000000 BTR tokens + 3000000 bonus BTR tokens = 33000000 BTR
            // 300000 * 70 (first 2 hours BSK rate) = 15000000 BSK tokens + 6000000 bonus BSK tokens = 21000000 BTR
            const largeEtherWeiValue = web3.utils.toWei('300000', 'ether')
            await bitherCrowdsale.buyTokens(tokenBenefactor, {value: largeEtherWeiValue, from: tokenBenefactor})

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: oneEtherWeiValue, from: tokenBenefactor}))
        })

        it("reverts when cap of 300000 ether is reached over multiple time periods", async () => {
            const largeEtherWeiValue = web3.utils.toWei('150000', 'ether')
            await bitherCrowdsale.buyTokens(tokenBenefactor, {value: largeEtherWeiValue, from: tokenBenefactor})
            await testUtils.increaseBlockTimeTo(openingTime + time.duration.days(2))
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

    })

    describe("buyTokens(address beneficiary) BTR token tests", async () => {

        const purchaseFor1EtherAfterDayTestCases = [
            new PurchaseFor1EtherAfterDayTestCase("110", 0),
            new PurchaseFor1EtherAfterDayTestCase("109", 1),
            new PurchaseFor1EtherAfterDayTestCase("108", 5),
            new PurchaseFor1EtherAfterDayTestCase("107", 9),
            new PurchaseFor1EtherAfterDayTestCase("110", 13),
            new PurchaseFor1EtherAfterDayTestCase("104", 20),
            new PurchaseFor1EtherAfterDayTestCase("102", 27),
            new PurchaseFor1EtherAfterDayTestCase("100", 34),
        ]

        purchaseFor1EtherAfterDayTestCases.forEach((testCase) => {
            it("purchases " + testCase.expectedTokens + " tokens for 1 ether after day " + testCase.afterDay.toString(), async () => {
                const phaseOpeningTime = openingTime + time.duration.days(testCase.afterDay) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
                await buyTokensAndAssertTokensPurchased(testCase.expectedTokens, bitherToken, phaseOpeningTime)
            })
        })

        const purchaseFor1EtherBeforeDayTestCases = [
            new PurchaseFor1EtherBeforeDayTestCase("109", 5),
            new PurchaseFor1EtherBeforeDayTestCase("108", 9),
            new PurchaseFor1EtherBeforeDayTestCase("107", 13),
            new PurchaseFor1EtherBeforeDayTestCase("107", 13),
            new PurchaseFor1EtherBeforeDayTestCase("106", 20),
            new PurchaseFor1EtherBeforeDayTestCase("104", 27),
            new PurchaseFor1EtherBeforeDayTestCase("102", 34),
            new PurchaseFor1EtherBeforeDayTestCase("100", 41),
        ]

        purchaseFor1EtherBeforeDayTestCases.forEach((testCase) => {
            it("purchases " + testCase.expectedTokens + " tokens for 1 ether before the end of day " + testCase.beforeDay.toString(), async () => {
                const phaseFinalTime = openingTime + time.duration.days(testCase.beforeDay) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
                await buyTokensAndAssertTokensPurchased(testCase.expectedTokens, bitherToken, phaseFinalTime)
            })
        })

        const purchaseFor1500FinneyAtDayTestCases = [
            new PurchaseFor1500FinneyAtDayTestCase("165", 0),
            new PurchaseFor1500FinneyAtDayTestCase("162", 6),
            new PurchaseFor1500FinneyAtDayTestCase("159", 15),
            new PurchaseFor1500FinneyAtDayTestCase("156", 21),
            new PurchaseFor1500FinneyAtDayTestCase("153", 28),
            new PurchaseFor1500FinneyAtDayTestCase("150", 35),
        ]

        purchaseFor1500FinneyAtDayTestCases.forEach((testCase) => {
            it("purchases " + testCase.expectedTokens + " tokens for 1.5 ether at day " + testCase.atDay.toString(), async () => {
                const expectedTokenBalance = new BN(testCase.expectedTokens + decimals) // The second part is what would come after the decimal point
                const phaseTime = openingTime + time.duration.days(testCase.atDay)
                await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherToken, phaseTime)
            })
        })

        it("purchases 110 tokens for 1 ether before the end of day 14 and hour 2", async () => {
            const phaseFinalTime = openingTime + time.duration.days(13) + time.duration.hours(2) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('110', bitherToken, phaseFinalTime)
        })

        it("purchases 106 tokens for 1 ether after day 14 and hour 2", async () => {
            const phaseOpeningTime = openingTime + time.duration.days(13) + time.duration.hours(2) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('106', bitherToken, phaseOpeningTime)
        })

        it("purchases 163.5 tokens for 1.5 ether at day 2", async () => {
            const expectedTokenBalance = new BN('163' + '500000000000000000') // The second part is what would come after the decimal point
            const phaseTime = openingTime + time.duration.days(2)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherToken, phaseTime)
        })

        it("purchases 160.5 tokens for 1.5 ether at day 10", async () => {
            const expectedTokenBalance = new BN('160' + '500000000000000000') // The second part is what would come after the decimal point
            const phaseTime = openingTime + time.duration.days(10)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherToken, phaseTime)
        })

        it("purchases 165 tokens for 1.5 ether at day 13 and 1 hour", async () => {
            const expectedTokenBalance = new BN('165' + decimals)
            const phaseTime = openingTime + time.duration.days(13) + time.duration.hours(1)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherToken, phaseTime)
        })
    })

    describe("buyTokens(address beneficiary) BSK token tests", async () => {

        const purchaseFor1EtherAfterDayTestCases = [
            new PurchaseFor1EtherAfterDayTestCase("70", 0),
            new PurchaseFor1EtherAfterDayTestCase("66", 1),
            new PurchaseFor1EtherAfterDayTestCase("64", 5),
            new PurchaseFor1EtherAfterDayTestCase("62", 9),
            new PurchaseFor1EtherAfterDayTestCase("60", 13),
            new PurchaseFor1EtherAfterDayTestCase("57", 20),
            new PurchaseFor1EtherAfterDayTestCase("54", 27),
            new PurchaseFor1EtherAfterDayTestCase("50", 34),
        ]

        purchaseFor1EtherAfterDayTestCases.forEach((testCase) => {
            it("purchases " + testCase.expectedTokens + " tokens for 1 ether after day " + testCase.afterDay.toString(), async () => {
                const phaseOpeningTime = openingTime + time.duration.days(testCase.afterDay) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
                await buyTokensAndAssertTokensPurchased(testCase.expectedTokens, bitherStockToken, phaseOpeningTime)
            })
        })

        const purchaseFor1EtherBeforeDayTestCases = [
            new PurchaseFor1EtherBeforeDayTestCase("68", 1),
            new PurchaseFor1EtherBeforeDayTestCase("66", 5),
            new PurchaseFor1EtherBeforeDayTestCase("64", 9),
            new PurchaseFor1EtherBeforeDayTestCase("62", 13),
            new PurchaseFor1EtherBeforeDayTestCase("60", 20),
            new PurchaseFor1EtherBeforeDayTestCase("57", 27),
            new PurchaseFor1EtherBeforeDayTestCase("54", 34),
            new PurchaseFor1EtherBeforeDayTestCase("50", 41),
        ]

        purchaseFor1EtherBeforeDayTestCases.forEach((testCase) => {
            it("purchases " + testCase.expectedTokens + " tokens for 1 ether before the end of day " + testCase.beforeDay.toString(), async () => {
                const phaseFinalTime = openingTime + time.duration.days(testCase.beforeDay) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
                await buyTokensAndAssertTokensPurchased(testCase.expectedTokens, bitherStockToken, phaseFinalTime)
            })
        })

        const purchaseFor1500FinneyAtDayTestCases = [
            new PurchaseFor1500FinneyAtDayTestCase("105", 0),
            new PurchaseFor1500FinneyAtDayTestCase("99", 2),
            new PurchaseFor1500FinneyAtDayTestCase("96", 6),
            new PurchaseFor1500FinneyAtDayTestCase("93", 10),
            new PurchaseFor1500FinneyAtDayTestCase("90", 15),
            new PurchaseFor1500FinneyAtDayTestCase("81", 28),
            new PurchaseFor1500FinneyAtDayTestCase("75", 35),
        ]

        purchaseFor1500FinneyAtDayTestCases.forEach((testCase) => {
            it("purchases " + testCase.expectedTokens + " tokens for 1.5 ether at day " + testCase.atDay.toString(), async () => {
                const expectedTokenBalance = new BN(testCase.expectedTokens + decimals) // The second part is what would come after the decimal point
                const phaseTime = openingTime + time.duration.days(testCase.atDay)
                await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherStockToken, phaseTime)
            })
        })

        it("purchases 68 tokens for 1 ether after hour 2", async () => {
            const phaseOpeningTime = openingTime + time.duration.hours(2) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            await buyTokensAndAssertTokensPurchased('68', bitherStockToken, phaseOpeningTime)
        })

        it("purchases 102 tokens for 1.5 ether at hour 2", async () => {
            const expectedTokenBalance = new BN('102' + decimals)
            const phaseTime = openingTime + time.duration.hours(2)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherStockToken, phaseTime)
        })

        it("purchases 85.5 tokens for 1.5 ether at day 21", async () => {
            const expectedTokenBalance = new BN('85' + '500000000000000000')
            const phaseTime = openingTime + time.duration.days(21)
            await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherStockToken, phaseTime)
        })
    })

    function PurchaseFor1EtherAfterDayTestCase(expectedTokens, afterDay) {
        this.expectedTokens = expectedTokens
        this.afterDay = afterDay
    }

    function PurchaseFor1EtherBeforeDayTestCase(expectedTokens, beforeDay) {
        this.expectedTokens = expectedTokens
        this.beforeDay = beforeDay
    }

    function PurchaseFor1500FinneyAtDayTestCase(expectedTokens, atDay) {
        this.expectedTokens = expectedTokens
        this.atDay = atDay
    }

    async function buyTokensAndAssertTokensPurchased(expectedTokenBalanceString, tokenContract, atTime) {
        const expectedTokenBalance = new BN(expectedTokenBalanceString + decimals)
        await testUtils.increaseBlockTimeTo(atTime)

        await bitherCrowdsale.buyTokens(tokenBenefactor, {value: oneEtherWeiValue, from: tokenBenefactor})

        const actualTokenBalance = await tokenContract.balanceOf(tokenBenefactor)
        assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
    }

    async function buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalanceBn, tokenContract, atTime) {
        await testUtils.increaseBlockTimeTo(atTime)

        await bitherCrowdsale.buyTokens(tokenBenefactor, {value: fractionalEtherWeiValue, from: tokenBenefactor})

        const actualTokenBalance = await tokenContract.balanceOf(tokenBenefactor)
        assert.equal(actualTokenBalance.toString(), expectedTokenBalanceBn.toString())
    }


})