const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const truffleAssert = require('truffle-assertions')

// The user must have ETH deposited such that deposited eth >= buy order value
contract ("Dex", accounts => {
    it ("should throw an error if ETH balance is too low when creating BUY limit order", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        await truffleAssert.passes(
            balances[msg.sender][ticker] >= 
        )
    })
})




