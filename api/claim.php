<?php
header('Content-Type: application/json');
require_once "db.php";

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['telegram_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Отсутствует telegram_id']);
    exit;
}

$telegram_id = $data['telegram_id'];
$type = $data['type'] ?? 'free';

$stmt = $pdo->prepare("SELECT * FROM users WHERE telegram_id = ?");
$stmt->execute([$telegram_id]);
$user = $stmt->fetch();

if (!$user) {
    http_response_code(404);
    echo json_encode(['error' => 'Пользователь не найден']);
    exit;
}

$user_id = $user['id'];

if ($type === 'free') {
    $stmt = $pdo->prepare("SELECT * FROM claim_cooldowns WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $cooldown = $stmt->fetch();

    $cooldownHours = 6;
    $now = new DateTime();
    $nextClaimTime = new DateTime($cooldown['last_claim_at'] ?? '1970-01-01');
    $nextClaimTime->modify("+{$cooldownHours} hours");

    if ($now < $nextClaimTime) {
        http_response_code(429);
        echo json_encode(['error' => 'Кулдаун не истёк']);
        exit;
    }
}

if ($type === 'paid') {
    if ($user['spins_balance'] <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Недостаточно донатных круток']);
        exit;
    }
}

$cardsStmt = $pdo->query("SELECT * FROM cards");
$cards = $cardsStmt->fetchAll(PDO::FETCH_ASSOC);

$totalWeight = 0;
foreach ($cards as $card) {
    $totalWeight += $card['drop_rate'];
}

$rand = mt_rand() / mt_getrandmax() * $totalWeight;

$selected = null;
$accumulator = 0;
foreach ($cards as $card) {
    $accumulator += $card['drop_rate'];
    if ($rand <= $accumulator) {
        $selected = $card;
        break;
    }
}

if (!$selected) {
    $selected = $cards[array_rand($cards)];
}

$stmt = $pdo->prepare("INSERT INTO user_cards (user_id, card_id) VALUES (?, ?)");
$stmt->execute([$user_id, $selected['id']]);

if ($type === 'paid') {
    $stmt = $pdo->prepare("UPDATE users SET spins_balance = spins_balance - 1 WHERE id = ?");
    $stmt->execute([$user_id]);
} else {
    $stmt = $pdo->prepare("INSERT INTO claim_cooldowns (user_id, last_claim_at) VALUES (?, NOW())
        ON DUPLICATE KEY UPDATE last_claim_at = NOW()");
    $stmt->execute([$user_id]);
}

echo json_encode([
    'card' => [
        'id' => $selected['id'],
        'name' => $selected['name'],
        'rarity' => $selected['rarity'],
        'image_url' => $selected['image_url']
    ]
]);
