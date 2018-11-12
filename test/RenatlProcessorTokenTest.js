const RentalProcessorToken = artifacts.require("RentalProcessorToken.sol")

contract("RentalProcessorToken", accounts => {

    let rentalProcessorToken

    beforeEach(async () => {
        rentalProcessorToken = await RentalProcessorToken.new()
    })

    describe("constructor()", async () => {

        it("mints 500000000 tokens for account 0", async () => {
            const expectedTokensMinted = 500000000 * (10 ** 18)
            const actualTokensMinted = await rentalProcessorToken.balanceOf(accounts[0])

            assert.equal(actualTokensMinted, expectedTokensMinted)
        })
    })
})