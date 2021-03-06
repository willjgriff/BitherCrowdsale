# Bither Crowdsale

This was a project done in a freelance capacity for http://bitherplatform.io/. It is a fairly basic crowdsale contract using Zeppelin contracts edited to fit requirements. It has a complete set of tests for the crowdsale contract. It uses the Gnosis multisig wallet.

## Instructions / Usage
Bither Crowdsale commands, all executed from within a terminal window.
Keep in mind that I use a mac/osx, some commands may differ on Windows.


### Installation:
Requires installation of: node, truffle (5.0.0-beta.1 version), ganache-cli and npm dependencies

Get node [here](https://nodejs.org/en/)

Once node is installed, install `truffle v5.0.0-beta.1` from the terminal with:  
    `npm install -g truffle@5.0.0-beta.1`  
The latest version v5.0.0-beta.2 seems to raise issues with my tests, either this version or my code has bugs, so use the version specified.

Install ganache-cli with:  
    `npm install -g ganache-cli`

Install npm dependencies by navigating to the bither-crowdsale directory and executing:  
    `npm install`

Navigate to the bither-crowdsale root directory and add a `.secret` file with:  
    `touch .secret`  
When running tests, this file can be left empty. When deploying to the blockchain, this file must contain the seed mnemonic for an account with Ether in it. The seed mnemonic can be copied/generated from MetaMask.

### Run project tests:
Requires the local test chain, ganache-cli, to be running with large amounts of eth in the accounts. In a new terminal window do:  
    `ganache-cli -e 99999999999`

In the original terminal window, navigate to the bither-crowdsale project directory and do:  
    `truffle test`

### Deployment to Ropsten TestNet:
Requires a mnemonic in the `.secret` file that represents an account with Ropsten Ether in it.
Requires migrations/DeploymentConfig.js to be configured accordingly.  
    `truffle migrate --network ropsten`


### Deployment to Main Net:
Requires a mnemonic in the .secret file that represents an account with Main Net Ether in it.
Requires migrations/DeploymentConfig.js to be configured accordingly.  
    `truffle migrate --network mainnnet`


### Post deployment scripts (consider using the MultiSig UI provided by Gnosis instead of these scripts):
Requires that the user copy the mnemonic that represents their account into the `.secret` file.
This account must be an owner of the MultiSig wallet.
These commands can take a while so wait after executing them.

This is a multi-step process, each of the MultiSig owners must download and install this project as per the
installation instructions above, then:  

`SubmitApprovalsToMultiSig.js` needs to be executed once by one of the MultiSig owners.

`SubmitConfirmationsToMultiSig.js` needs to be executed by enough owners of the MultiSig to satisfy
the confirmation count specified when the MultiSig was created.

`DisplayAllowanceForCrowdsale.js` can be executed once enough MultiSig owners have confirmed the approval transactions.
This will display the allowance of tokens for the Crowdsale to sell confirming if it is ready to distribute funds.


#### To execute `SubmitApprovalsToMultiSig.js`:  
If whoever deploys the contracts to the network is also one of the MultiSig owner's they don't have to edit the config file for this script. If whoever executes this script was not the deployer of the contracts, they must fill in the contract addresses in
`migrations/DeploymentConfig.js`. These addresses are displayed during deployment in the terminal window with label `contract address`.  
    `truffle --network [ropsten/mainnet] exec scripts/SubmitApprovalsToMultiSig.js`

#### To execute `SubmitConfirmationsToMultiSig.js`:  
This must be executed by enough of the MultiSig owners to satisfy the confirmations required. It requires the contract addresses in the migrations/DeploymentConfig.js file be filled in.  
    `truffle --network [ropsten/mainnet] exec scripts/SubmitConfirmationsToMultiSig.js`

#### To execute `DisplayAllowanceForCrowdsale.js`:  
This gets and displays the allowance of tokens the Crowdsale can spend, confirming if the process is complete.  
    `truffle --network [ropsten/mainnet] exec scripts/DisplayAllowanceForCrowdsale.js`

note `--network [ropsten/mainnet]` requires you to pick one network depending on where you've deployed the contracts, 
eg `--network mainnet`

See the commented function `approveAndConfirmTokensForCrowdsale()` in `migrations/2_deploy_contracts` for an impression
of the process above.

### Main Net Deployment Address:  
BitherCrowdsale: [0x8227d745273c29BD3179611df37e84E6cf068BEE](https://etherscan.io/address/0x8227d745273c29BD3179611df37e84E6cf068BEE)  


