pragma solidity 0.8.0;
pragma experimental ABIEncoderV2;
import "./Wallet.sol";

contract Dex is Wallet {

    using SafeMath for uint256;

    enum Side {
        BUY,
        SELL
    }

    struct Order {
        uint id;
        address trader;
        Side side;
        bytes32 ticker;
        uint amount;
        uint price;
        uint filled;
    }

    uint public nextOrderId = 0;

    mapping(bytes32 => mapping(uint => Order[])) public orderBook;

    function getOrderBook(bytes32 ticker, Side side) view public returns(Order[] memory){
        return orderBook[ticker][uint(side)];
    }

    function createLimitOrder(Side side, bytes32 ticker, uint amount, uint price) public {
        if(side == Side.BUY){
            require(balances[msg.sender]["ETH"] >= amount.mul(price));
        }
        else if(side == Side.SELL){
            require(balances[msg.sender][ticker] >= amount);
        }
        Order[] storage orders = orderBook[ticker][uint(side)];
        orders.push(
            Order(nextOrderId, msg.sender, side, ticker, amount, price, 0)
        );
        //Bubble Sort
        uint i = orders.length > 0 ? orders.length - 1: 0;
        if(side == Side.BUY){
            while(i > 0) {
                if(orders[i-1].price > orders[i].price){
                    break;
                }
                Order memory orderToMove = orders[i-1];
                orders[i-1] = orders[i];
                orders[i] = orderToMove;
                i--;
            }
        }
        else if (side == Side.SELL){
            while(i > 0){
                if(orders[i-1].price < orders[i].price){
                    break;
                }
                Order memory orderToMove = orders[i -1];
                orders[i -1] = orders[i];
                orders[i] = orderToMove;
                i--;
            }
        }
        nextOrderId++;
    }
    function createMarketOrder(Side side, bytes32 ticker, uint amount) public {
        if(side == Side.SELL){
            require(balances[msg.sender][ticker] >= amount, "Insufficient balance");
        }

        uint orderBookSide;
        if(side == Side.BUY){
            orderBookSide = 1;
        }
        else {
            orderBookSide = 0;
        }
        Order[] storage orders = orderBook[ticker][orderBookSide];

        uint totalFilled;
        //Calculate how much we can fill from order[i]
        for(uint256 i = 0; i < orders.length && totalFilled < amount; i++){
            uint leftToFill = amount.sub(totalFilled); // amount - totalFilled
            uint availableToFill = orders[i].amount.sub(orders[i].filled); //order.amount - order.filled
            uint filled = 0;
            if(availableToFill > leftToFill){
                filled = leftToFill; //Fill the entire market order
            }
            else {
                filled = availableToFill; //Fill as much as is available in order[i]
            }
            totalFilled = totalFilled.add(filled);
            orders[i].filled = orders[i].filled.add(filled);
            uint cost = filled.mul(orders[i].price);

            // Execute the trade & shift balances between buyer/seller
            if(side == Side.BUY){
                //Verify that the buyer has enough ETH to cover the purchase(require)
                require(balances[msg.sender]["ETH"] >= cost);
                //Transfer ETH to Buyer
                balances[msg.sender][ticker] = balances[msg.sender][ticker].add(filled);
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].sub(cost);
                //Transfer Tokens from Seller 
                balances[orders[i].trader][ticker] = balances[orders[i].trader][ticker].sub(filled);
                balances[orders[i].trader]["ETH"] = balances[orders[i].trader]["ETH"].add(cost);
            }
            else if(side == Side.SELL){
                //Transfer ETH to Buyer
                balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(filled);
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].add(cost);
                //Transfer ETH from Buyer to Seller
                balances[orders[i].trader][ticker] = balances[orders[i].trader][ticker].add(filled);
                balances[orders[i].trader]["ETH"] = balances[orders[i].trader]["ETH"].sub(cost);               
                //Transfer tokens from Seller to Buyer
            }

        }
        // Remove 100% filled orders from the orderbook
        while(orders.length > 0 && orders[0].filled == orders[0].amount){
            //Remove the top element in the orders array by overwriting every element
            //with the next element in the order list
            for(uint256 i = 0; i < orders.length -1; i++){
                orders[i] = orders[i +1];
            }
            orders.pop();
        }
    }

}