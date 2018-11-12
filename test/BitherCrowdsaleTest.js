const BitherCrowdsale = artifacts.require("BitherCrowdsale.sol")
const BitherToken = artifacts.require("BitherToken.sol")
const BN = require('bn.js');

contract("BitherCrowdsale", accounts => {

    let bitherToken, bitherCrowdsale
    const etherBenefactor = accounts[5]
    const bitherTokenOwner = accounts[0]
    const crowdsaleTokens = new BN('6750000' + '000000000000000000', 10) // 15% of total available * (10 ** 18) number of decimals in BTR token

    beforeEach(async () => {
        bitherToken = await BitherToken.new({ from: bitherTokenOwner })
        // console.log("Total BTR: " + await bitherToken.totalSupply())
        bitherCrowdsale = await BitherCrowdsale.new(bitherToken.address, bitherTokenOwner, etherBenefactor)
        await bitherToken.approve(bitherCrowdsale.address, crowdsaleTokens, { from: bitherTokenOwner })
        // console.log("Remaining tokens: " + await bitherCrowdsale.remainingTokens())
    })

    describe("buyTokens(address beneficiary)", async () => {

        it("purchases 110 tokens for 1 ether for account 1", async () => {
            const tokenBenefactor = accounts[1]
            const weiValue = web3.utils.toWei('1', 'ether')
            const expectedTokenBalance = new BN('110' + '000000000000000000', 10)

            await bitherCrowdsale.buyTokens(tokenBenefactor, { value: weiValue, from: tokenBenefactor })

            const actualTokenBalance = await bitherToken.balanceOf(tokenBenefactor)
            assert.equal(actualTokenBalance.toString(), expectedTokenBalance.toString())
        })

        // it("deposits eth to etherBenefactor", async () => {
        //
        // })
    })
})