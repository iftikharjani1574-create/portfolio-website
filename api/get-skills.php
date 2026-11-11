<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

require_once __DIR__ . '/../config.php';

try {
    $pdo = getDatabaseConnection();
    $statement = $pdo->query('SELECT id, skill_name, percentage FROM skills ORDER BY id ASC');
    echo json_encode($statement->fetchAll(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (PDOException $exception) {
    error_log('Unable to fetch portfolio skills: ' . $exception->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to load skills right now.']);
}
