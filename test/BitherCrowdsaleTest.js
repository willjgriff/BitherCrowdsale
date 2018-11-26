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
            bitherTokensOwner, etherBenefactor, preSaleOpeningTime, crowdsaleOpeningTime)
    }

    async function approveTokensForCrowdsaleAddress() {
        await bitherToken.approve(bitherCrowdsale.address, btrCrowdsaleTokens, {from: bitherTokensOwner})
        await bitherStockToken.approve(bitherCrowdsale.address, bskCrowdsaleTokens, {from: bitherTokensOwner})
    }

    describe("constructor()", async () => {

        it("costs less than 2500000 gas", async () => {
            maxGasCost = 2500000
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
            const closingTime = crowdsaleOpeningTime + time.duration.weeks(4) + time.duration.seconds(1)
            await testUtils.increaseBlockTimeTo(closingTime)

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: oneEtherWeiValue, from: tokenBenefactor}))
        })

        it("reverts before the crowdsale has started", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            const timeBeforeOpening = preSaleOpeningTime - time.duration.seconds(3)
            await testUtils.increaseBlockTimeTo(timeBeforeOpening)

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

        // it("has no allowance of tokens when cap of 300000 ether is reached", async () => {
        //
        //     remainingBtr = await bitherCrowdsale.remainingTokens()
        //     remainingBsk = await bitherStockToken.allowance(bitherTokensOwner, bitherCrowdsale.address)
        //
        //     console.log(remainingBtr.toString())
        //     console.log(remainingBsk.toString())
        //
        //     const largeEtherWeiValue = web3.utils.toWei('300000', 'ether')
        //     await bitherCrowdsale.buyTokens(tokenBenefactor, {value: largeEtherWeiValue, from: tokenBenefactor})
        //
        //     remainingBtr = await bitherCrowdsale.remainingTokens()
        //     remainingBsk = await bitherStockToken.allowance(bitherTokensOwner, bitherCrowdsale.address)
        //
        //     console.log(remainingBtr.toString())
        //     console.log(remainingBsk.toString())
        //
        //     assert.equal(remainingBtr, 0)
        //     assert.equal(remainingBsk, 0)
        // })

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

        it("reverts when contributing less than 69 ether during private sale period", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            const lessThanSixtyNineEth = web3.utils.toWei('68', 'ether')

            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor,
                {value: lessThanSixtyNineEth, from: tokenBenefactor}))
        })

    })

    describe("buyTokens(address beneficiary) BTR token tests", async () => {

        const startOfDay = (day) => time.duration.days(day) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
        const beforeEndOfDay = (day) => time.duration.days(day) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time

        const purchaseForEtherAtTimeTestCases = [
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "110", 0, startOfDay, "at start of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "109", 1, startOfDay, "at start of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "108", 5, startOfDay, "at start of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "107", 9, startOfDay, "at start of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "110", 21, startOfDay, "at start of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "104", 28, startOfDay, "at start of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "102", 35, startOfDay, "at start of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "100", 42, startOfDay, "at start of"),

            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "109", 5, beforeEndOfDay, "before end of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "108", 9, beforeEndOfDay, "before end of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "107", 13, beforeEndOfDay, "before end of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "106", 28, beforeEndOfDay, "before end of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "104", 35, beforeEndOfDay, "before end of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "102", 42, beforeEndOfDay, "before end of"),
            new PurchaseForEtherAtTimeTestCase(oneEtherWeiValue, "100", 49, beforeEndOfDay, "before end of"),

            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "165", 0, startOfDay, "at"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "162", 6, startOfDay, "at"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "159", 22, startOfDay, "at"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "156", 29, startOfDay, "at"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "153", 36, startOfDay, "at"),
            new PurchaseForEtherAtTimeTestCase(fractionalEtherWeiValue, "150", 42, startOfDay, "at"),
        ]

        purchaseForEtherAtTimeTestCases.forEach((testCase) => {
            const ethValue = web3.utils.fromWei(testCase.ethPayment, 'ether')
            it("purchases " + testCase.expectedTokens + " tokens for " + ethValue.toString() +
                " ether " + testCase.description + " day " + testCase.timeInCrowdsale.toString(), async () => {
                const atDay = preSaleOpeningTime + testCase.timeFunction(testCase.timeInCrowdsale)
                const expectedTokenBalance = new BN(testCase.expectedTokens + decimals)
                await buyTokensAndAssertTokensPurchased(expectedTokenBalance, testCase.ethPayment, bitherToken, atDay)
            })
        })

        it("purchases 110 tokens for 1 ether before end of day 21 and hour 2", async () => {
            const phaseFinalTime = preSaleOpeningTime + time.duration.days(21) + time.duration.hours(2) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
            const expectedTokenBalance = new BN('110' + decimals)
            await buyTokensAndAssertTokensPurchased(expectedTokenBalance, oneEtherWeiValue, bitherToken, phaseFinalTime)
        })

        it("purchases 106 tokens for 1 ether after day 21 and hour 2", async () => {
            const phaseOpeningTime = preSaleOpeningTime + time.duration.days(21) + time.duration.hours(2) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
            const expectedTokenBalance = new BN('106' + decimals)
            await buyTokensAndAssertTokensPurchased(expectedTokenBalance, oneEtherWeiValue, bitherToken, phaseOpeningTime)
        })

        it("purchases 163.5 tokens for 1.5 ether at day 2", async () => {
            const expectedTokenBalance = new BN('163' + '500000000000000000') // The second part is what would come after the decimal point
            const phaseTime = preSaleOpeningTime + time.duration.days(2)
            await buyTokensAndAssertTokensPurchased(expectedTokenBalance, fractionalEtherWeiValue, bitherToken, phaseTime)
        })

        it("purchases 160.5 tokens for 1.5 ether at day 10", async () => {
            const expectedTokenBalance = new BN('160' + '500000000000000000') // The second part is what would come after the decimal point
            const phaseTime = preSaleOpeningTime + time.duration.days(10)
            await buyTokensAndAssertTokensPurchased(expectedTokenBalance, fractionalEtherWeiValue, bitherToken, phaseTime)
        })

        it("purchases 165 tokens for 1.5 ether at day 21 and 1 hour", async () => {
            const expectedTokenBalance = new BN('165' + decimals)
            const phaseTime = preSaleOpeningTime + time.duration.days(21) + time.duration.hours(1)
            await buyTokensAndAssertTokensPurchased(expectedTokenBalance, fractionalEtherWeiValue, bitherToken, phaseTime)
        })

        it("purchases 7590 tokens for 69 ether after deployment", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            const expectedTokenBalance = new BN('7590' + decimals)
            const phaseTime = await time.latest()
            const largeEtherWeiValue = web3.utils.toWei("69", "ether")
            await buyTokensAndAssertTokensPurchased(expectedTokenBalance, largeEtherWeiValue, bitherToken, phaseTime)
        })

        it("purchases 7590 tokens for 69 ether before private sale closing time", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            const expectedTokenBalance = new BN('7590' + decimals)
            const phaseTime = privateSaleClosingTime - time.duration.seconds(2)
            const largeEtherWeiValue = web3.utils.toWei("69", "ether")
            await buyTokensAndAssertTokensPurchased(expectedTokenBalance, largeEtherWeiValue, bitherToken, phaseTime)
        })

        it("reverts after private sale closing time", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            await testUtils.increaseBlockTimeTo(privateSaleClosingTime + time.duration.seconds(2))
            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor, {from: tokenBenefactor}))
        })

        it("reverts before presale opening time", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            await testUtils.increaseBlockTimeTo(preSaleOpeningTime - time.duration.seconds(2))
            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor, {from: tokenBenefactor}))
        })

        it("reverts after presale closing time", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            await testUtils.increaseBlockTimeTo(crowdsaleOpeningTime - time.duration.days(2) + time.duration.seconds(2))
            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor, {from: tokenBenefactor}))
        })

        it("reverts before crowdsale opening time", async () => {
            await deployBitherCrowdsale()
            await approveTokensForCrowdsaleAddress()
            await testUtils.increaseBlockTimeTo(crowdsaleOpeningTime - time.duration.seconds(2))
            await shouldFail.reverting(bitherCrowdsale.buyTokens(tokenBenefactor, {from: tokenBenefactor}))
        })
    })

    describe("buyTokens(address beneficiary) BSK token tests", async () => {

        // const purchaseFor1EtherAfterDayTestCases = [
        //     new PurchaseFor1EtherAfterDayTestCase("70", 0),
        //     new PurchaseFor1EtherAfterDayTestCase("66", 1),
        //     new PurchaseFor1EtherAfterDayTestCase("64", 5),
        //     new PurchaseFor1EtherAfterDayTestCase("62", 9),
        //     new PurchaseFor1EtherAfterDayTestCase("60", 13),
        //     new PurchaseFor1EtherAfterDayTestCase("57", 20),
        //     new PurchaseFor1EtherAfterDayTestCase("54", 27),
        //     new PurchaseFor1EtherAfterDayTestCase("50", 34),
        // ]
        //
        // purchaseFor1EtherAfterDayTestCases.forEach((testCase) => {
        //     it("purchases " + testCase.expectedTokens + " tokens for 1 ether after day " + testCase.timeInCrowdsale.toString(), async () => {
        //         const phaseOpeningTime = openingTime + time.duration.days(testCase.timeInCrowdsale) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
        //         await buyTokensAndAssertTokensPurchased(testCase.expectedTokens, bitherStockToken, phaseOpeningTime)
        //     })
        // })
        //
        // const purchaseFor1EtherBeforeDayTestCases = [
        //     new PurchaseFor1EtherBeforeDayTestCase("68", 1),
        //     new PurchaseFor1EtherBeforeDayTestCase("66", 5),
        //     new PurchaseFor1EtherBeforeDayTestCase("64", 9),
        //     new PurchaseFor1EtherBeforeDayTestCase("62", 13),
        //     new PurchaseFor1EtherBeforeDayTestCase("60", 20),
        //     new PurchaseFor1EtherBeforeDayTestCase("57", 27),
        //     new PurchaseFor1EtherBeforeDayTestCase("54", 34),
        //     new PurchaseFor1EtherBeforeDayTestCase("50", 41),
        // ]
        //
        // purchaseFor1EtherBeforeDayTestCases.forEach((testCase) => {
        //     it("purchases " + testCase.expectedTokens + " tokens for 1 ether before the end of day " + testCase.beforeDay.toString(), async () => {
        //         const phaseFinalTime = openingTime + time.duration.days(testCase.beforeDay) - time.duration.seconds(2) // -2 seconds to account for variance when increasing the block time
        //         await buyTokensAndAssertTokensPurchased(testCase.expectedTokens, bitherStockToken, phaseFinalTime)
        //     })
        // })
        //
        // const purchaseFor1500FinneyAtDayTestCases = [
        //     new PurchaseFor1500FinneyAtDayTestCase("105", 0),
        //     new PurchaseFor1500FinneyAtDayTestCase("99", 2),
        //     new PurchaseFor1500FinneyAtDayTestCase("96", 6),
        //     new PurchaseFor1500FinneyAtDayTestCase("93", 10),
        //     new PurchaseFor1500FinneyAtDayTestCase("90", 15),
        //     new PurchaseFor1500FinneyAtDayTestCase("81", 28),
        //     new PurchaseFor1500FinneyAtDayTestCase("75", 35),
        // ]
        //
        // purchaseFor1500FinneyAtDayTestCases.forEach((testCase) => {
        //     it("purchases " + testCase.expectedTokens + " tokens for 1.5 ether at day " + testCase.atDay.toString(), async () => {
        //         const expectedTokenBalance = new BN(testCase.expectedTokens + decimals) // The second part is what would come after the decimal point
        //         const phaseTime = openingTime + time.duration.days(testCase.atDay)
        //         await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherStockToken, phaseTime)
        //     })
        // })
        //
        // it("purchases 68 tokens for 1 ether after hour 2", async () => {
        //     const phaseOpeningTime = openingTime + time.duration.hours(2) + time.duration.seconds(2) // +2 seconds to account for variance when increasing the block time
        //     await buyTokensAndAssertTokensPurchased('68', bitherStockToken, phaseOpeningTime)
        // })
        //
        // it("purchases 102 tokens for 1.5 ether at hour 2", async () => {
        //     const expectedTokenBalance = new BN('102' + decimals)
        //     const phaseTime = openingTime + time.duration.hours(2)
        //     await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherStockToken, phaseTime)
        // })
        //
        // it("purchases 85.5 tokens for 1.5 ether at day 21", async () => {
        //     const expectedTokenBalance = new BN('85' + '500000000000000000')
        //     const phaseTime = openingTime + time.duration.days(21)
        //     await buyFractionalTokensAndAssertTokensPurchased(expectedTokenBalance, bitherStockToken, phaseTime)
        // })
    })

    function PurchaseForEtherAtTimeTestCase(ethPayment, expectedTokens, timeInCrowdsale, timeFunction, description) {
        this.ethPayment = ethPayment
        this.expectedTokens = expectedTokens
        this.timeInCrowdsale = timeInCrowdsale
        this.timeFunction = timeFunction
        this.description = description
    }

    async function buyTokensAndAssertTokensPurchased(expectedTokenBalance, ethPayment, tokenContract, atTime) {
        await testUtils.increaseBlockTimeTo(atTime)

        await bitherCrowdsale.buyTokens(tokenBenefactor, {value: ethPayment, from: tokenBenefactor})

        const actualTokenBalance = await tokenContract.balanceOf(tokenBenefactor)
        assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
    }


})