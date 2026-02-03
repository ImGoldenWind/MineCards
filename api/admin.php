<?php
require_once "db.php";
$secret = "supersecret";

if ($_GET['pass'] !== $secret) {
  die("Access denied");
}

if (isset($_GET["mass"]) && $_GET["mass"] === "give_all") {
  $count = intval($_GET["count"] ?? 0);
  if ($count <= 0) {
    exit("Неверное количество круток");
  }

  $stmt = $pdo->prepare("UPDATE users SET spins_balance = spins_balance + ?");
  $stmt->execute([$count]);
  echo "Выдано $count круток всем игрокам";
  exit;
}

$telegram_id = $_GET['telegram_id'] ?? null;
$count = intval($_GET['count'] ?? 0);
if (!$telegram_id || $count <= 0) {
  die("Missing parameters");
}

$stmt = $pdo->prepare("UPDATE users SET spins_balance = spins_balance + ? WHERE telegram_id = ?");
$stmt->execute([$count, $telegram_id]);
echo "Выдано $count круток пользователю $telegram_id";
