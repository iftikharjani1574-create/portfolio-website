<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/../config.php';

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

function readJsonBody(): array
{
    $input = json_decode(file_get_contents('php://input'), true);
    return is_array($input) ? $input : [];
}

$action = $_GET['action'] ?? '';

if ($action === 'session') {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        header('Allow: GET');
        respond(405, ['success' => false, 'message' => 'Method not allowed.']);
    }

    respond(200, ['success' => true, 'authenticated' => !empty($_SESSION['admin_authenticated'])]);
}

if ($action === 'login') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: POST');
        respond(405, ['success' => false, 'message' => 'Method not allowed.']);
    }

    $input = readJsonBody();
    if (!isset($input['username'], $input['password'])
        || !is_string($input['username'])
        || !is_string($input['password'])) {
        respond(422, ['success' => false, 'message' => 'Enter your username and password.']);
    }

    if (PORTFOLIO_ADMIN_USERNAME === 'CHANGE_ME'
        || PORTFOLIO_ADMIN_PASSWORD === 'CHANGE_TO_A_LONG_RANDOM_PASSWORD') {
        respond(503, ['success' => false, 'message' => 'Set the admin username and password in config.php before signing in.']);
    }

    if (!hash_equals(PORTFOLIO_ADMIN_USERNAME, $input['username'])
        || !hash_equals(PORTFOLIO_ADMIN_PASSWORD, $input['password'])) {
        respond(401, ['success' => false, 'message' => 'Incorrect username or password.']);
    }

    session_regenerate_id(true);
    $_SESSION['admin_authenticated'] = true;
    respond(200, ['success' => true, 'message' => 'Signed in successfully.']);
}

if ($action === 'logout') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Allow: POST');
        respond(405, ['success' => false, 'message' => 'Method not allowed.']);
    }

    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $cookie = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $cookie['path'],
            'domain' => $cookie['domain'],
            'secure' => $cookie['secure'],
            'httponly' => $cookie['httponly'],
            'samesite' => 'Strict',
        ]);
    }
    session_destroy();
    respond(200, ['success' => true, 'message' => 'Signed out successfully.']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    respond(405, ['success' => false, 'message' => 'Method not allowed.']);
}

if (empty($_SESSION['admin_authenticated'])) {
    respond(401, ['success' => false, 'message' => 'Please sign in to manage projects.']);
}

$title = trim(is_string($_POST['title'] ?? null) ? $_POST['title'] : '');
$description = trim(is_string($_POST['description'] ?? null) ? $_POST['description'] : '');
$projectType = is_string($_POST['project_type'] ?? null) ? $_POST['project_type'] : '';
$imageUrl = trim(is_string($_POST['image_url'] ?? null) ? $_POST['image_url'] : '');
$projectLink = trim(is_string($_POST['project_link'] ?? null) ? $_POST['project_link'] : '');

if (!in_array($projectType, ['hotel', 'business', 'educational'], true)) {
    respond(422, ['success' => false, 'message' => 'Choose a valid website type.']);
}

if ($title === '' || strlen($title) > 200) {
    respond(422, ['success' => false, 'message' => 'Project title must be between 1 and 200 characters.']);
}

if ($description === '' || strlen($description) > 5000) {
    respond(422, ['success' => false, 'message' => 'Project description must be between 1 and 5000 characters.']);
}

if ($projectLink !== '' && (strlen($projectLink) > 1000
    || !filter_var($projectLink, FILTER_VALIDATE_URL)
    || !in_array(strtolower((string) parse_url($projectLink, PHP_URL_SCHEME)), ['http', 'https'], true))) {
    respond(422, ['success' => false, 'message' => 'Enter a valid project link using http or https.']);
}

$upload = $_FILES['image_file'] ?? null;
$hasUpload = is_array($upload) && ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;
if (!$hasUpload && $imageUrl === '') {
    respond(422, ['success' => false, 'message' => 'Enter an image URL or choose an image file.']);
}

$image = $imageUrl;
$uploadedFile = null;
if ($hasUpload) {
    if (($upload['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        respond(422, ['success' => false, 'message' => 'The image upload failed. Please try again.']);
    }

    if (($upload['size'] ?? 0) > 5 * 1024 * 1024) {
        respond(422, ['success' => false, 'message' => 'Image files must be 5 MB or smaller.']);
    }

    $imageInfo = @getimagesize($upload['tmp_name']);
    $fileInfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $fileInfo->file($upload['tmp_name']);
    $extensions = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];

    if ($imageInfo === false || !isset($extensions[$mimeType])) {
        respond(422, ['success' => false, 'message' => 'Choose a valid JPG, PNG, GIF, or WebP image.']);
    }

    $uploadDirectory = __DIR__ . '/../uploads/projects';
    if (!is_dir($uploadDirectory) && !mkdir($uploadDirectory, 0755, true) && !is_dir($uploadDirectory)) {
        error_log('Unable to create the project image upload directory.');
        respond(500, ['success' => false, 'message' => 'Unable to save the uploaded image.']);
    }

    $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mimeType];
    $uploadedFile = $uploadDirectory . '/' . $filename;
    if (!move_uploaded_file($upload['tmp_name'], $uploadedFile)) {
        error_log('Unable to move an uploaded project image.');
        respond(500, ['success' => false, 'message' => 'Unable to save the uploaded image.']);
    }

    $image = 'uploads/projects/' . $filename;
} elseif (strlen($imageUrl) > 500
    || !filter_var($imageUrl, FILTER_VALIDATE_URL)
    || !in_array(strtolower((string) parse_url($imageUrl, PHP_URL_SCHEME)), ['http', 'https'], true)) {
    respond(422, ['success' => false, 'message' => 'Enter a valid image URL using http or https.']);
}

try {
    $pdo = getDatabaseConnection();
    ensureProjectLinkColumn($pdo);
    ensureProjectTypeColumn($pdo);
    $statement = $pdo->prepare(
        'INSERT INTO projects (title, description, image, project_link, project_type)
         VALUES (:title, :description, :image, :project_link, :project_type)'
    );
    $statement->execute([
        ':title' => $title,
        ':description' => $description,
        ':image' => $image,
        ':project_link' => $projectLink !== '' ? $projectLink : null,
        ':project_type' => $projectType,
    ]);

    respond(201, ['success' => true, 'message' => 'Project saved successfully.', 'id' => (int) $pdo->lastInsertId()]);
} catch (PDOException $exception) {
    if ($uploadedFile !== null && is_file($uploadedFile)) {
        unlink($uploadedFile);
    }
    error_log('Unable to save portfolio project: ' . $exception->getMessage());
    respond(500, ['success' => false, 'message' => 'Unable to save this project right now.']);
}
