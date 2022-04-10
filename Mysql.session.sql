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

--@block
CREATE TABLE userDetails(
userId BIGINT AUTO_INCREMENT,
email VARCHAR(50) NOT NULL,
password VARCHAR(50) NOT NULL,
mobileNumber INT(20) NOT NULL,
PRIMARY KEY(userId)
);

--@block
ALTER TABLE userDetails
MODIFY password VARCHAR(255);

--@block
create TABLE ohlc(
id BIGINT AUTO_INCREMENT,
openTime BIGINT not NULL,
openPrice FLOAT(24) not NULL,
highPrice FLOAT(24) NOT NULL,
lowPrice FLOAT(24) not NULL,
closePrice FLOAT(24) not null,
volume FLOAT(24) not null,
closeTime BIGINT not NULL,
primary key(id)
)

--@block
alter TABLE userDetails MODIFY apiKey VARCHAR(255)

--@block
create TABLE ledger(
  lid bigint AUTO_INCREMENT,
  bitcoin FLOAT(24) not NULL,
  totalBalance FLOAT(24) not NULL,
  userId BIGINT,
  PRIMARY key (lid)
)

--@block 
alter TABLE ledger ADD FOREIGN key (userId) REFERENCES userDetails(userId);

--@block
alter table ledger alter column bitcoin set DEFAULT 0;

--@block
alter table trades add column userId BIGINT not NULL;

--@block 
alter table trades add FOREIGN key (userId) REFERENCES userDetails(userId);


