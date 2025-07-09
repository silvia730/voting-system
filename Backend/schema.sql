-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE,
    password VARCHAR(100),
    has_voted BOOLEAN DEFAULT 0
);

-- Positions table
CREATE TABLE positions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    category VARCHAR(100)
);

-- Candidates table
CREATE TABLE candidates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    image VARCHAR(255),
    position_id INT,
    FOREIGN KEY (position_id) REFERENCES positions(id)
);

-- Votes table
CREATE TABLE votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    position_id INT,
    candidate_id INT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (position_id) REFERENCES positions(id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id),
    UNIQUE KEY unique_vote (user_id, position_id)
); 