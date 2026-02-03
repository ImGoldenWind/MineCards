<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

require_once "db.php";

$data = json_decode(file_get_contents("php://input"), true);
$telegram_id = $data["telegram_id"] ?? null;
$user_card_id = $data["user_card_id"] ?? null;

if (!$telegram_id || !$user_card_id) {
    http_response_code(400);
    echo json_encode(["error" => "Недостаточно данных"]);
    exit;
}

$userStmt = $pdo->prepare("SELECT id FROM users WHERE telegram_id = ?");
$userStmt->execute([$telegram_id]);
$user = $userStmt->fetch();

if (!$user) {
    http_response_code(404);
    echo json_encode(["error" => "Пользователь не найден"]);
    exit;
}

$tradeStmt = $pdo->prepare("INSERT INTO trades (from_user_id, status) VALUES (?, 'pending')");
$tradeStmt->execute([$user["id"]]);
$tradeId = $pdo->lastInsertId();

$itemStmt = $pdo->prepare("INSERT INTO trade_items (trade_id, user_card_id, from_user) VALUES (?, ?, 1)");
$itemStmt->execute([$tradeId, $user_card_id]);

echo json_encode(["success" => true, "trade_id" => $tradeId]);
