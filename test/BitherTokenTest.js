const BitherToken = artifacts.require("BitherToken.sol")

contract("BitherToken", accounts => {

    describe("constructor()", async () => {

        it("mints 45000000 tokens for account 0", async () => {
            const bitherToken = await BitherToken.new()
            const expectedTokensMinted = 45000000 * (10 ** 18)
            const actualTokensMinted = await bitherToken.balanceOf(accounts[0])

            assert.equal(actualTokensMinted, expectedTokensMinted)
        })
    })
})