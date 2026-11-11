<?php
declare(strict_types=1);

const DB_HOST = 'localhost';
const DB_NAME = 'ifti_portfolio';
const DB_USER = 'CHANGE_TO_HOSTING_DATABASE_USER';
const DB_PASSWORD = 'CHANGE_TO_HOSTING_DATABASE_PASSWORD';
const PORTFOLIO_ADMIN_USERNAME = 'CHANGE_ME';
const PORTFOLIO_ADMIN_PASSWORD = 'CHANGE_TO_A_LONG_RANDOM_PASSWORD';

function getDatabaseConnection(): PDO
{
    // Local XAMPP uses its standard root account; live hosting can provide these values as environment variables.
    $hostName = strtolower((string) ($_SERVER['SERVER_NAME'] ?? ''));
    $isLocalRequest = in_array($hostName, ['localhost', '127.0.0.1'], true);
    $databaseHost = getenv('PORTFOLIO_DB_HOST') ?: ($isLocalRequest ? '127.0.0.1' : DB_HOST);
    $databaseName = getenv('PORTFOLIO_DB_NAME') ?: DB_NAME;
    $databaseUser = getenv('PORTFOLIO_DB_USER');
    $databasePassword = getenv('PORTFOLIO_DB_PASSWORD');

    if ($databaseUser === false || $databaseUser === '') {
        $databaseUser = $isLocalRequest ? 'root' : DB_USER;
    }

    if ($databasePassword === false) {
        $databasePassword = $isLocalRequest ? '' : DB_PASSWORD;
    }

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $databaseHost, $databaseName);

    return new PDO($dsn, $databaseUser, $databasePassword, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
}

function ensureProjectLinkColumn(PDO $pdo): void
{
    $column = $pdo->query("SHOW COLUMNS FROM projects LIKE 'project_link'");
    if ($column->fetch() !== false) {
        return;
    }

    try {
        $pdo->exec('ALTER TABLE projects ADD COLUMN project_link VARCHAR(1000) NULL AFTER image');
    } catch (PDOException $exception) {
        $column = $pdo->query("SHOW COLUMNS FROM projects LIKE 'project_link'");
        if ($column->fetch() === false) {
            throw $exception;
        }
    }
}

function ensureProjectTypeColumn(PDO $pdo): void
{
    $column = $pdo->query("SHOW COLUMNS FROM projects LIKE 'project_type'")->fetch();
    if ($column === false) {
        try {
            $pdo->exec(
                "ALTER TABLE projects ADD COLUMN project_type ENUM('hotel', 'business', 'educational') NULL AFTER project_link"
            );
        } catch (PDOException $exception) {
            $column = $pdo->query("SHOW COLUMNS FROM projects LIKE 'project_type'")->fetch();
            if ($column === false) {
                throw $exception;
            }
        }

        $column = $pdo->query("SHOW COLUMNS FROM projects LIKE 'project_type'")->fetch();
    }

    if ($column['Null'] === 'YES') {
        // Classify old rows once so existing projects remain visible after the category migration.
        $pdo->exec(
            "UPDATE projects SET project_type = CASE
                WHEN LOWER(title) LIKE '%hotel%' OR LOWER(title) LIKE '%resort%' THEN 'hotel'
                WHEN LOWER(title) LIKE '%school%' OR LOWER(title) LIKE '%college%'
                    OR LOWER(title) LIKE '%education%' OR LOWER(title) LIKE '%university%' THEN 'educational'
                ELSE 'business'
            END
            WHERE project_type IS NULL"
        );

        try {
            $pdo->exec(
                "ALTER TABLE projects MODIFY COLUMN project_type ENUM('hotel', 'business', 'educational') NOT NULL DEFAULT 'business'"
            );
        } catch (PDOException $exception) {
            $column = $pdo->query("SHOW COLUMNS FROM projects LIKE 'project_type'")->fetch();
            if ($column === false || $column['Null'] === 'YES') {
                throw $exception;
            }
        }
    }
}
