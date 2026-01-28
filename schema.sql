CREATE TABLE IF NOT EXISTS quickurl (
    short_code TEXT NOT NULL,
    url TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS counter_state (
    id INT PRIMARY KEY,
    value BIGINT NOT NULL
);

INSERT IGNORE INTO counter_state (id, value) VALUES (1, 1000);
