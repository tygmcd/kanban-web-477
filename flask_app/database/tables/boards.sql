CREATE TABLE IF NOT EXISTS `boards` (
`board_id`         int(11)  	   NOT NULL auto_increment	  COMMENT 'the id of this board',
`owner_id`         int(11)         NOT NULL            		  COMMENT 'user id of owner',
`name`             varchar(256)    NOT NULL                   COMMENT 'name of the project',
PRIMARY KEY (`board_id`),
FOREIGN KEY (owner_id) REFERENCES users(user_id)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT="Contains all board information";