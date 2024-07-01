CREATE TABLE IF NOT EXISTS `lists` (
`list_id`          int(11)  	   NOT NULL auto_increment	  COMMENT 'the id of this list',
`board_id`         int(11)         NOT NULL            		  COMMENT 'id of board list is apart of',
`name`             varchar(256)    NOT NULL                   COMMENT 'name of the list',
PRIMARY KEY (`list_id`),
FOREIGN KEY (board_id) REFERENCES boards(board_id)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COMMENT="Contains all list information";