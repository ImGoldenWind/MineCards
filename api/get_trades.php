<?php
require_once "db.php";

$telegram_id = $_GET["telegram_id"] ?? null;

$userId = 0;
if ($telegram_id) {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE telegram_id = ?");
    $stmt->execute([$telegram_id]);
    $user = $stmt->fetch();
    if ($user) {
        $userId = $user["id"];
    }
}

$tradesStmt = $pdo->prepare("
  SELECT t.id, t.from_user_id, u.username, c.name, c.image_url, c.rarity, t.status
  FROM trades t
  JOIN trade_items ti ON ti.trade_id = t.id AND ti.from_user = 1
  JOIN user_cards uc ON ti.user_card_id = uc.id
  JOIN cards c ON uc.card_id = c.id
  JOIN users u ON t.from_user_id = u.id
  WHERE t.status = 'pending'
  ORDER BY t.from_user_id = ? DESC, t.created_at DESC
");
$tradesStmt->execute([$userId]);
echo json_encode($tradesStmt->fetchAll(PDO::FETCH_ASSOC));
