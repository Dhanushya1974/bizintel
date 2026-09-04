-- Runs automatically the first time the MySQL container initialises an empty data dir.
-- (mounted at /docker-entrypoint-initdb.d/01-init.sql)

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  name          VARCHAR(255),
  mode          ENUM('own-idea', 'ai') DEFAULT 'ai',
  idea          VARCHAR(500),
  category      VARCHAR(120),
  budget        VARCHAR(60),
  country       VARCHAR(120),
  state         VARCHAR(120),
  city          VARCHAR(120),
  pincode       VARCHAR(20),
  plan          VARCHAR(40) DEFAULT 'explorer',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS opportunities (
  id                VARCHAR(40) NOT NULL PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  category          VARCHAR(120) NOT NULL,
  score             TINYINT UNSIGNED NOT NULL,
  confidence        ENUM('High', 'Medium', 'Low') DEFAULT 'Medium',
  demand            TINYINT UNSIGNED,
  competition       TINYINT UNSIGNED,
  investment_min    INT UNSIGNED,
  investment_max    INT UNSIGNED,
  break_even_months TINYINT UNSIGNED,
  rationale         TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS leads (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  idea       VARCHAR(500),
  city       VARCHAR(120),
  pincode    VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO opportunities
  (id, name, category, score, confidence, demand, competition, investment_min, investment_max, break_even_months, rationale)
VALUES
  ('opp-1', 'Specialty Coffee & Bakery', 'Food & Beverage', 87, 'High', 82, 34, 120000, 210000, 14,
   'Dense residential foot traffic, above-median household income, and only two comparable operators within a 6-minute walk.'),
  ('opp-2', 'Boutique Pilates Studio', 'Health & Wellness', 81, 'High', 74, 41, 180000, 260000, 18,
   'Strong 25-44 female demographic, wellness search intent up 38% YoY, no premium boutique studio within 1.5 miles.'),
  ('opp-3', 'Neighborhood Wine Bar', 'Food & Beverage', 74, 'Medium', 66, 52, 220000, 340000, 22,
   'Evening foot traffic strong, but three established wine bars nearby. Differentiation on food and events required.'),
  ('opp-4', 'Pet Daycare & Grooming', 'Consumer Services', 69, 'Medium', 71, 58, 95000, 165000, 20,
   'High pet-ownership index, limited grooming supply, but requires 3,500+ sq ft with outdoor access.'),
  ('opp-5', 'Fast-Casual Poke Bowls', 'Food & Beverage', 58, 'Low', 54, 71, 140000, 220000, 26,
   'Category is crowded within a 1-mile radius. Consider adjacent white-space or brand differentiation.')
AS new
ON DUPLICATE KEY UPDATE
  name = new.name, category = new.category, score = new.score;
