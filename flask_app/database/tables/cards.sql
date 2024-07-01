CREATE TABLE IF NOT EXISTS `cards` (
`card_id`         int(11)  	      NOT NULL auto_increment	  COMMENT 'the id of this card',
`list_id`         int(11)         NOT NULL            		  COMMENT 'id of list card is apart of',
`content`         varchar(256)    NOT NULL                    COMMENT 'card content',
PRIMARY KEY (`card_id`),
FOREIGN KEY (list_id) REFERENCES lists(list_id)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT="Contains all card information";