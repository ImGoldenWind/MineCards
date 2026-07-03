CREATE DATABASE IF NOT EXISTS minecards
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE minecards;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  telegram_id BIGINT UNSIGNED NOT NULL,
  username VARCHAR(64) NULL,
  first_name VARCHAR(255) NULL,
  last_name VARCHAR(255) NULL,
  spins_balance INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_telegram_id (telegram_id),
  KEY idx_users_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cards (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  rarity ENUM('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary') NOT NULL,
  image_url VARCHAR(512) NOT NULL,
  drop_rate DECIMAL(12, 6) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_cards_name (name),
  KEY idx_cards_rarity (rarity),
  CHECK (drop_rate > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_cards (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  card_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_cards_user_id (user_id),
  KEY idx_user_cards_card_id (card_id),
  CONSTRAINT fk_user_cards_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_user_cards_card
    FOREIGN KEY (card_id) REFERENCES cards (id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS claim_cooldowns (
  user_id BIGINT UNSIGNED NOT NULL,
  last_claim_at DATETIME NOT NULL,
  PRIMARY KEY (user_id),
  KEY idx_claim_cooldowns_last_claim_at (last_claim_at),
  CONSTRAINT fk_claim_cooldowns_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trades (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  from_user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('pending', 'accepted', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_trades_status_created_at (status, created_at),
  KEY idx_trades_from_user_status (from_user_id, status),
  CONSTRAINT fk_trades_from_user
    FOREIGN KEY (from_user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trade_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  trade_id BIGINT UNSIGNED NOT NULL,
  user_card_id BIGINT UNSIGNED NOT NULL,
  from_user TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_trade_items_trade_id (trade_id),
  KEY idx_trade_items_user_card_id (user_card_id),
  CONSTRAINT fk_trade_items_trade
    FOREIGN KEY (trade_id) REFERENCES trades (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_trade_items_user_card
    FOREIGN KEY (user_card_id) REFERENCES user_cards (id)
    ON DELETE RESTRICT,
  CHECK (from_user IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notified_users (
  user_id BIGINT UNSIGNED NOT NULL,
  notified_at DATETIME NOT NULL,
  PRIMARY KEY (user_id),
  KEY idx_notified_users_notified_at (notified_at),
  CONSTRAINT fk_notified_users_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO cards (id, name, rarity, image_url, drop_rate) VALUES
  (1, 'Creeper Spark', 'Common', '/cards/creeper-spark.svg', 0.420000),
  (2, 'Redstone Courier', 'Uncommon', '/cards/redstone-courier.svg', 0.300000),
  (3, 'Diamond Sentinel', 'Rare', '/cards/diamond-sentinel.svg', 0.190000),
  (4, 'Nether Architect', 'Epic', '/cards/nether-architect.svg', 0.075000),
  (5, 'Ender Crown', 'Legendary', '/cards/ender-crown.svg', 0.015000)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  rarity = VALUES(rarity),
  image_url = VALUES(image_url),
  drop_rate = VALUES(drop_rate);
