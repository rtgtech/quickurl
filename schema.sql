CREATE TABLE IF NOT EXISTS quickurl (
    short_code VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
    url TEXT NOT NULL,
    PRIMARY KEY (short_code)
);

CREATE TABLE IF NOT EXISTS counter_state (
    id INT PRIMARY KEY,
    value BIGINT NOT NULL
);

INSERT IGNORE INTO counter_state (id, value) VALUES (1, 1000);
