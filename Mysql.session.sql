CREATE TABLE trades(
    id BIGINT AUTO_INCREMENT,
    symbol varchar(255) NOT NULL,
    direction varchar(10) NOT NULL ,
    price FLOAT(24) NOT NULL,
    size float(24) NOT NULL,
    time BIGINT NOT NULL ,
    PRIMARY KEY (id)

);


--@block ALTER TABLE Persons

ALTER TABLE marketOrders
ALTER direction CHECK (direction = "buy" OR "sell") ;


--@block
ALTER TABLE askLimitOrders
  DROP COLUMN postOnly;

--@block
INSERT into askLimitOrders(symbol,direction,price,type,size,time,postOnly) VALUES("BTC/USD",'sell',2,'limit',1,11,true)