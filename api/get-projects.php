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

$projectType = $_GET['project_type'] ?? null;
if ($projectType !== null && !in_array($projectType, ['hotel', 'business', 'educational'], true)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Invalid project type.']);
    exit;
}

try {
    $pdo = getDatabaseConnection();
    ensureProjectLinkColumn($pdo);
    ensureProjectTypeColumn($pdo);
    $query = 'SELECT id, title, description, image, project_link AS link, project_type
              FROM projects';
    if ($projectType !== null) {
        $statement = $pdo->prepare($query . ' WHERE project_type = :project_type ORDER BY id ASC');
        $statement->execute([':project_type' => $projectType]);
    } else {
        $statement = $pdo->query($query . ' ORDER BY id ASC');
    }
    echo json_encode($statement->fetchAll(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (PDOException $exception) {
    error_log('Unable to fetch portfolio projects: ' . $exception->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to load projects right now.']);
}
