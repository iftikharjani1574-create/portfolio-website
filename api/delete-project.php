<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

session_set_cookie_params([
    'httponly' => true,
    'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    'samesite' => 'Strict',
]);
session_start();

function respond(int $status, array $data): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['success' => false, 'message' => 'Method not allowed.']);
}

if (empty($_SESSION['admin_authenticated'])) {
    respond(401, ['success' => false, 'message' => 'Please sign in to manage projects.']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input) || !isset($input['id']) || filter_var($input['id'], FILTER_VALIDATE_INT) === false
    || (int) $input['id'] < 1) {
    respond(422, ['success' => false, 'message' => 'A valid project ID is required.']);
}

require_once __DIR__ . '/../config.php';

try {
    $pdo = getDatabaseConnection();
    $statement = $pdo->prepare('SELECT image FROM projects WHERE id = :id');
    $statement->execute([':id' => (int) $input['id']]);
    $project = $statement->fetch();
    if ($project === false) {
        respond(404, ['success' => false, 'message' => 'Project not found.']);
    }

    $delete = $pdo->prepare('DELETE FROM projects WHERE id = :id');
    $delete->execute([':id' => (int) $input['id']]);

    if (str_starts_with($project['image'], 'uploads/projects/')
        && basename($project['image']) === substr($project['image'], strlen('uploads/projects/'))) {
        $uploadedFile = __DIR__ . '/../' . $project['image'];
        if (is_file($uploadedFile) && !unlink($uploadedFile)) {
            error_log('Unable to remove deleted project image: ' . $project['image']);
        }
    }

    respond(200, ['success' => true, 'message' => 'Project deleted successfully.']);
} catch (PDOException $exception) {
    error_log('Unable to delete portfolio project: ' . $exception->getMessage());
    respond(500, ['success' => false, 'message' => 'Unable to delete this project right now.']);
}
