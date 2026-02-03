
<?php
require_once "db.php";
$input = json_decode(file_get_contents("php://input"), true);
$telegram_id = $input["telegram_id"];
$username = $input["username"];
$first_name = $input["first_name"];
$last_name = $input["last_name"];
if (!$telegram_id) {
  http_response_code(400);
  echo json_encode(["error" => "Нет Telegram ID"]);
  exit;
}
$stmt = $pdo->prepare("SELECT id, spins_balance FROM users WHERE telegram_id = ?");
$stmt->execute([$telegram_id]);
$user = $stmt->fetch();
if (!$user) {
  $stmt = $pdo->prepare("INSERT INTO users (telegram_id, username, first_name, last_name) VALUES (?, ?, ?, ?)");
  $stmt->execute([$telegram_id, $username, $first_name, $last_name]);
  $user_id = $pdo->lastInsertId();
  $spins_balance = 0;
} else {
  $user_id = $user['id'];
  $spins_balance = $user['spins_balance'];
}
$stmt = $pdo->prepare("SELECT last_claim_at FROM claim_cooldowns WHERE user_id = ?");
$stmt->execute([$user_id]);
$cooldown = $stmt->fetch();
$next_claim = time();
$COOLDOWN = 6 * 60 * 60;
if ($cooldown) {
  $last_claim = strtotime($cooldown['last_claim_at']);
  $next_claim = $last_claim + $COOLDOWN;
}
echo json_encode([
  "next_claim_at" => date("c", $next_claim),
  "spins_balance" => $spins_balance
]);
?>
