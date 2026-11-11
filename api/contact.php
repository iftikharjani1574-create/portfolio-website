<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST');
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

require_once __DIR__ . '/../config.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Request body must be valid JSON.']);
    exit;
}

if (!isset($input['name'], $input['email'], $input['message'])
    || !is_string($input['name'])
    || !is_string($input['email'])
    || !is_string($input['message'])) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Name, email, and message must be provided as text.']);
    exit;
}

$name = trim($input['name']);
$email = trim($input['email']);
$phone = $input['phone'] ?? '';
$message = trim($input['message']);

if (!is_string($phone)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Phone number must be text.']);
    exit;
}

$phone = trim($phone);

if ($name === '' || strlen($name) > 100) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please provide a name of 1 to 100 characters.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please provide a valid email address.']);
    exit;
}

if (strlen($phone) > 20) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Phone number must be 20 characters or fewer.']);
    exit;
}

if ($message === '' || strlen($message) > 5000) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Please provide a message of 1 to 5000 characters.']);
    exit;
}

try {
    $pdo = getDatabaseConnection();
    $statement = $pdo->prepare(
        'INSERT INTO messages (name, email, phone, message) VALUES (:name, :email, :phone, :message)'
    );
    $statement->execute([
        ':name' => $name,
        ':email' => $email,
        ':phone' => $phone !== '' ? $phone : null,
        ':message' => $message,
    ]);

    echo json_encode(['success' => true, 'message' => 'Message sent successfully']);
} catch (PDOException $exception) {
    error_log('Unable to save portfolio contact message: ' . $exception->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Unable to send your message right now.']);
}
