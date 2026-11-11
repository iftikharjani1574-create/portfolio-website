CREATE DATABASE IF NOT EXISTS ifti_portfolio
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE ifti_portfolio;

CREATE TABLE IF NOT EXISTS messages (
    id INT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB;

-- Contact submissions are inserted by api/contact.php; this is an optional manual example:
-- INSERT INTO messages (name, email, phone, message)
-- VALUES ('Example visitor', 'visitor@example.com', NULL, 'Example contact message');

CREATE TABLE IF NOT EXISTS skills (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    skill_name VARCHAR(100) NOT NULL,
    percentage TINYINT UNSIGNED NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT chk_skills_percentage CHECK (percentage <= 100)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS projects (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    image VARCHAR(500) NOT NULL,
    project_link VARCHAR(1000) NULL,
    project_type ENUM('hotel', 'business', 'educational') NOT NULL DEFAULT 'business',
    PRIMARY KEY (id)
) ENGINE=InnoDB;

INSERT INTO skills (skill_name, percentage) VALUES
    ('HTML', 90),
    ('CSS', 95),
    ('Bootstrap', 98),
    ('JavaScript', 60),
    ('AI Tools Usage', 100);

INSERT INTO projects (title, description, image, project_type)
SELECT 'Hotel Website', 'A welcoming, responsive website concept for a hotel and its guests.', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80', 'hotel'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE title = 'Hotel Website');

INSERT INTO projects (title, description, image, project_type)
SELECT 'Creative Studio', 'A clean, responsive home for a creative team and its latest work.', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80', 'business'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE title = 'Creative Studio');

INSERT INTO projects (title, description, image, project_type)
SELECT 'Commerce Concept', 'A considered shopping experience designed to make browsing feel effortless.', 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=900&q=80', 'business'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE title = 'Commerce Concept');

INSERT INTO projects (title, description, image, project_type)
SELECT 'Product Dashboard', 'A clear, data-focused dashboard concept for a modern digital product.', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=900&q=80', 'business'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE title = 'Product Dashboard');

INSERT INTO projects (title, description, image, project_type)
SELECT 'School Website', 'A welcoming, responsive school website for families, students, and staff.', 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80', 'educational'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE title = 'School Website');

INSERT INTO projects (title, description, image, project_type)
SELECT 'College Website', 'A modern college website highlighting programs, campus life, and admissions.', 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=900&q=80', 'educational'
WHERE NOT EXISTS (SELECT 1 FROM projects WHERE title = 'College Website');
