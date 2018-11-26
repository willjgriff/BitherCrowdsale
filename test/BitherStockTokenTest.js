const BitherStockToken = artifacts.require("BitherStockToken.sol")

contract("BitherStockToken", accounts => {

    describe("constructor()", async () => {

        it("mints 100000000 tokens for account 0", async () => {
            const bitherStockToken = await BitherStockToken.new()
            const expectedTokensMinted = 100000000 * (10 ** 18)
            const actualTokensMinted = await bitherStockToken.balanceOf(accounts[0])

            assert.equal(actualTokensMinted, expectedTokensMinted)
        })
    })
})