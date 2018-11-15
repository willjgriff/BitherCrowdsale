const MultiSigWallet = artifacts.require("MultiSigWallet.sol")
const BN = require("bn.js")
const testUtils = require("./TestUtils")
const shouldFail = require("openzeppelin-solidity/test/helpers/shouldFail")

contract("MultiSigWallet", accounts => {

    let multiSigWallet
    const owners = [accounts[0], accounts[1], accounts[2]]
    const requiredConfirmations = 2

    const destinationAccount = accounts[3]
    const oneEtherWeiValue = web3.utils.toWei('1', 'ether')
    const zeroData = "0x00"

    beforeEach(async () => {
        multiSigWallet = await MultiSigWallet.new(owners, requiredConfirmations)
        await multiSigWallet.send(web3.utils.toWei('2', 'ether'))
    })

    describe("getOwners()", () => {

        it("returns the correct owners", async () => {
            actualOwners = await multiSigWallet.getOwners()
            assert.deepEqual(actualOwners, owners)
        })
    })

    describe("submitTransaction()", () => {

        it("adds dataless transaction to transactions array", async () => {
            const submitTransaction = await multiSigWallet.submitTransaction(destinationAccount, oneEtherWeiValue, zeroData)

            const transactionId = testUtils.getEventArgValue(submitTransaction, "Submission", "transactionId")
            const multiSigTransaction = await multiSigWallet.transactions(new BN(transactionId))
            assert.equal(multiSigTransaction.destination, destinationAccount)
            assert.equal(multiSigTransaction.value, oneEtherWeiValue)
            assert.equal(multiSigTransaction.data, zeroData)
        })
    })

    describe("executeTransaction()", () => {

        it("shouldn't execute transaction before required confirmations are made", async () => {
            const expectedDestinationAccountBalance = await web3.eth.getBalance(destinationAccount)
            const submitTransaction = await multiSigWallet.submitTransaction(destinationAccount, oneEtherWeiValue, zeroData)
            const transactionId = testUtils.getEventArgValue(submitTransaction, "Submission", "transactionId")

            await multiSigWallet.executeTransaction(new BN(transactionId))

            const actualDestinationAccountBalance = await web3.eth.getBalance(destinationAccount)
            assert.equal(actualDestinationAccountBalance, expectedDestinationAccountBalance)
        })
    })

    describe("confirmTransaction()", () => {

        it("should execute transaction when required confirmations are made", async () => {
            const expectedDestinationAccountBalance = (new BN(await web3.eth.getBalance(destinationAccount))).add(new BN(oneEtherWeiValue))
            const submitTransaction = await multiSigWallet.submitTransaction(destinationAccount, oneEtherWeiValue, zeroData)
            const transactionId = testUtils.getEventArgValue(submitTransaction, "Submission", "transactionId")
            const transactionIdBn = new BN(transactionId)

            await multiSigWallet.confirmTransaction(transactionIdBn, {from: owners[1]})

            const actualDestinationAccountBalance = await web3.eth.getBalance(destinationAccount)
            assert.equal(actualDestinationAccountBalance, expectedDestinationAccountBalance)
        })
    })
})
