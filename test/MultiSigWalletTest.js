const MultiSigWallet = artifacts.require("MultiSigWallet.sol")
const BitherToken = artifacts.require("BitherToken.sol")
const BitherStockToken = artifacts.require("BitherStockToken.sol")
const BN = require("bn.js")
const testUtils = require("./TestUtils")

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
            const actualOwners = await multiSigWallet.getOwners()
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

        it("should execute dataless transaction when required confirmations are made", async () => {
            const expectedDestinationAccountBalance = (new BN(await web3.eth.getBalance(destinationAccount))).add(new BN(oneEtherWeiValue))
            const submitTransaction = await multiSigWallet.submitTransaction(destinationAccount, oneEtherWeiValue, zeroData)
            const transactionId = testUtils.getEventArgValue(submitTransaction, "Submission", "transactionId")
            const transactionIdBn = new BN(transactionId)

            await multiSigWallet.confirmTransaction(transactionIdBn, {from: owners[1]})

            const actualDestinationAccountBalance = await web3.eth.getBalance(destinationAccount)
            assert.equal(actualDestinationAccountBalance, expectedDestinationAccountBalance)
        })

        it("should execute addOwner() transaction when required confirmations are made", async () => {
            const newOwner = accounts[4]
            const expectedOwners = owners
            expectedOwners.push(newOwner)

            const addOwnerFunctionCall = multiSigWallet.contract.methods.addOwner(newOwner).encodeABI()
            const submitTransaction = await multiSigWallet.submitTransaction(multiSigWallet.address, 0, addOwnerFunctionCall)
            const transactionId = testUtils.getEventArgValue(submitTransaction, "Submission", "transactionId")
            const transactionIdBn = new BN(transactionId)

            await multiSigWallet.confirmTransaction(transactionIdBn, { from: owners[1] })

            const actualOwners = await multiSigWallet.getOwners()
            assert.deepEqual(actualOwners, expectedOwners)
        })
    })

    describe("submit and confirm transaction on BitherToken", () => {

        it("transfers expected tokens after enough confirmations are reached", async () => {
            const bitherTokenOwner = accounts[4]
            const bitherTokenReceiver = accounts[5]
            const bitherToken = await BitherToken.new({ from: bitherTokenOwner })
            await transferTokensToMultiSig(bitherToken, bitherTokenOwner);
            const expectedBalance = new BN('1000' + '000000000000000000')
            const submitTransaction = await submitTransferTransactionToMultisig(bitherToken, bitherTokenReceiver, expectedBalance);
            const transactionIdBn = getTransactionIdBn(submitTransaction);

            await multiSigWallet.confirmTransaction(transactionIdBn, { from: owners[1] })

            const actualBalance = await bitherToken.balanceOf(bitherTokenReceiver)
            assert.equal(actualBalance.toString(), expectedBalance.toString())
        })
    })

    async function transferTokensToMultiSig(bitherToken, bitherTokenOwner) {
        const allTokens = await bitherToken.balanceOf(bitherTokenOwner)
        await bitherToken.transfer(multiSigWallet.address, allTokens, {from: bitherTokenOwner})
    }

    async function submitTransferTransactionToMultisig(bitherToken, bitherTokenReceiver, expectedBalance) {
        const transferFunctionCall = bitherToken.contract.methods.transfer(bitherTokenReceiver, expectedBalance).encodeABI()
        return await multiSigWallet.submitTransaction(bitherToken.address, 0, transferFunctionCall);
    }

    function getTransactionIdBn(submitTransaction) {
        const transactionId = testUtils.getEventArgValue(submitTransaction, "Submission", "transactionId")
        return new BN(transactionId);
    }

})
