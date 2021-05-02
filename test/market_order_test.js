const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const truffleAssert = require('truffle-assertions')

contract("Dex", accounts => {
//When creating a SELL market order, the seller needs to have enough tokens for the trade
    it("Should throw an error when creating a sell market order without adequate token balance", async() => {
        let dex = await Dex.deployed()
        let balance = await dex.balance(accounts[0], web3.utils.fromUtf8("LINK"))
        assert.equal(balance.toNumber(), 0, "Initial LINK balance is not 0");
        await truffleAssert.reverts(
            dex.createMarketOrder(1, web3.utils.fromUtf8("LINK"), 10)
        )
    })
//When creating a BUY market order, the seller needs to have enough ETH for the trade
    it("Should throw an error when creating a sell market order without adequate token balance", async() => {
        let dex = await Dex.deployed()
        let balance = await dex.balance(accounts[0], web3.utils.fromUtf8("LINK"))
        assert.equal(balance.toNumber(), 0, "Initial LINK balance is not 0");
        await truffleAssert.reverts(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)
        )
})
//Market orders can be submitted even if the order book is empty
    it("Market orders can be submitted even if the order book is empty", async() => {
        let dex = await Dex.deployed()
        await dex.depositEth({value: 10000});

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 0); //Get buy side orderbook
        assert(orderbook.length == 0, "Buy side Orderbook length is not 0");

        await truffleAssert.passes(
            dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10)
        )
})
//Market orders should be filled until the order book is empty or the market order is 100% filled
    it("Market orders should not fill more limit orders than the market order amount", async() => {
        let dex = await Dex.deployed()
        await dex.depositEth({value: 10000});

        let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");
        
        await dex.addToken(web3.utils.fromUtf8("LINK"), link.address)

        //Send LINK tokens to accounts 1, 2, 3 from account 0
        await link.transfer(accounts[1], 50)
        await link.transfer(accounts[2], 50)
        await link.transfer(accounts[3], 50)

        //Approve DEX for accounts 1, 2, 3
        await link.approve(dex.address, 50, {from: accounts[1]});
        await link.approve(dex.address, 50, {from: accounts[2]});
        await link.approve(dex.address, 50, {from: accounts[3]});

        //Deposit LINK into DEX for accounts 1, 2, 3
        await link.approve(dex.address, 50, {from: accounts[1]});
        await link.approve(dex.address, 50, {from: accounts[2]});
        await link.approve(dex.address, 50, {from: accounts[3]});

        //Fill up the sell order book
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 400, {from: accounts[2]})
        await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[3]})

        //Create market order that should fill 2/3 orders in the book
        await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 10);

        order = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1) // Get sell side orderbook
        assert(orderbook.length == 1, "Sell side Orderbook should only have 1 order left");
        assert(orderbook[0].filled == 0, "Sell side order should have 0 filled");
})
//Market orders should be filled until the order book is empty or the market order is 100% filled
it("Market orders should be filled until the order book is empty", async() => {
    let dex = await Dex.deployed()
    await dex.depositEth({value: 10000});

    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1); //Get sell side orderbook
    assert(orderbook.length == 1, "Sell side Orderbook should have 1 order left");
    
    //Fill up the sell order book again
    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 400, {from: accounts[1]})
    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 500, {from: accounts[2]})

    //Check buyer link balance before link purchase
    let balanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))

    //Create market order that could fill more than the enire order book (15 LINK)
    await dex.createMarketOrder(0, web3.utils.frmUtf8("LINK"), 50);

    //Check buyer link balance after link purchase
    let balanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"))

    //Buyer should have 15 more link after, even though order was for 50
    assert.equal(balanceBefore + 15, balanceAfter)

})
//The ETH balance of the buyer should decreasee with the filled amount
it("The ETH balance of the buyer should decreasee with the filled amount", async() => {
    let dex = await Dex.deployed()
    let link = await Link.deployed()

    //Seller deposits link and creates a sell limit order for 1 link for 300 wei
    await link.approve(dex.address, 500, {from: accounts[1]});
    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, {from:accounts[1]})

    //Check buyer ETH balance before trade
    let balanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"))
    await dex.createMarketOrder(0, web3.utils.frmUtf8("LINK"), 1);
    let balanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"))

    assert.equal(balanceBefore - 300, balanceAfter);
})

//The token balances of the limit order sellers should decrease with the fileld amounts
it("The token balances of the limit order sellers soud decrease witht he filled amounts", async() => {
    let dex = await Dex.deployed()
    let link = await Link.deployed()

    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8('LINK'), 1);
    assert(orrderbook.length == 0, "Sell side Orderbook should be empty at start of test");

    //Seller Account[1] already has approved and deposited Link
    //Seller Account[2] deposits link

    await link.approve(dex.address, 500, {from: accounts[2]});
    await dex.deposit(100, web3.utils.fromUtf8('LINK'), {from: accounts[2]});

    //Check sellers Link balances before trade
    let account1balanceBefore = await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, {from:accounts[1]})
    let account2balanceBefore = await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 400, {from:accounts[2]})

    //Account[0] created market order to buy up both sell orders
    await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2);

    //Check sellers Link balances after trade
    let account1balanceAfter = await dex.balances(accounts[1], web3.utils.fromUtf8("LINK"));
    let account2balanceAfter = await dex.balances(accounts[2], web3.utils.fromUtf8("LINK"));

    assert.equal(account1balanceBefore -1, account1balanceAfter);
    assert.equal(account2balanceBefore -1, account2balanceAfter);
})
//Filled limit orders should be removed from the orderbook
it("Filled limi orders should be removed from the orderbook", async() => {
    let dex = await Dex.deployed()

    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8('LINK'), 1);
    assert(orrderbook.length == 0, "Sell side Orderbook should be empty at start of test");

    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 1, 300, {from:accounts[1]})
    await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 1);

    orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    assert(orderbook.length == 0, "Sell side Orderbook should be empty after trade");
})
//Partly filled limit orders should be modified to represent the filled/remaining amount 
it("Limit orders filled property should be set correctly after a trade", async() => {
    let dex = await Dex.deployed()

    let orderbook = await dex.getOrderBook(web3.utils.fromUtf8('LINK'), 1);
    assert(orrderbook.length == 0, "Sell side Orderbook should be empty at start of test");

    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from:accounts[1]})
    await dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 2);

    orderbook = await dex.getOrderBook(web3.utils.fromUtf8("LINK"), 1);
    assert.equal(orderbook[0].filled, 2);
    assert.equal(orderbook[0].amount, 5);
})
//When creating a BUY market order, the buyer needs to have enough ETH for the trade
it("Should throw an error when creating a buy market order without adequate ETH balance", async () => {
    let dex = await Dex.deployed()
    
    let balance = await dex.balances(accounts[4], web3.utils.fromUtf8("ETH"))
    assert.equal( balance.toNumber(), 0, "Initial ETH balance is not 0" );
    await dex.createLimitOrder(1, web3.utils.fromUtf8("LINK"), 5, 300, {from: accounts[1]})

    await truffleAssert.reverts(
        dex.createMarketOrder(0, web3.utils.fromUtf8("LINK"), 5, {from: accounts[4]})
    )
})

})
