const time = require("openzeppelin-solidity/test/helpers/time")

async function increaseBlockTime (duration) {
    const id = Date.now();

    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: '2.0',
            method: 'evm_increaseTime',
            params: [duration],
            id: id,
        }, err1 => {
            if (err1) return reject(err1);

            web3.currentProvider.send({
                jsonrpc: '2.0',
                method: 'evm_mine',
                id: id + 1,
            }, (err2, res) => {
                return err2 ? reject(err2) : resolve(res);
            });
        });
    });
}

/**
 * Beware that due to the need of calling two separate ganache methods and rpc calls overhead
 * it's hard to increase time precisely to a target point so design your test to tolerate
 * small fluctuations from time to time.
 *
 * @param target time in seconds
 */
async function increaseBlockTimeTo (target) {
    const now = (await time.latest());

    if (target < now) throw Error(`Cannot increase current time(${now}) to a moment in the past(${target})`);
    const diff = target - now;
    return increaseBlockTime(diff);
}

async function sleepUntil(timeStamp) {
    // console.log("Sleeping until " + timeStamp + "...")
    while (currentEpoch() < timeStamp) {
        await sleep(1000)
    }
}

const currentEpoch = () => Math.round(Date.now()/ 1000)

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


module.exports = {
    increaseBlockTime,
    increaseBlockTimeTo,
    sleepUntil,
    currentEpoch
}