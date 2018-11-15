
const getEventArgValue = (transaction, eventName, eventArgKey) => {
    return transaction.logs
        .filter(log => log.event === eventName)
        .map(log => log.args[eventArgKey])
}

module.exports = {
    getEventArgValue
}