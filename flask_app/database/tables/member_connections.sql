CREATE TABLE IF NOT EXISTS `member_connections` (
`user_id`       int(11)        NOT NULL            		  COMMENT 'user_id of member',
`board_id`      int(11)        NOT NULL                   COMMENT 'board user is a member of',
FOREIGN KEY (user_id) REFERENCES users(user_id),
FOREIGN KEY (board_id) REFERENCES boards(board_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT="Creates connection between a user and a board";