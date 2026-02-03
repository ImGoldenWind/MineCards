<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json');
require_once __DIR__ . "/db.php";

try {

    if (!isset($_GET['telegram_id'])) {
        echo json_encode([]);
        exit;
    }

    $telegram_id = $_GET['telegram_id'];

    // Получаем user_id
    $stmt = $pdo->prepare("SELECT id FROM users WHERE telegram_id = ?");
    $stmt->execute([$telegram_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode([]);
        exit;
    }

    $user_id = $user['id'];

    // Считаем количество карт
    $stmt = $pdo->prepare("
        SELECT 
            c.id,
            c.name,
            c.image_url,
            c.rarity,
            COUNT(*) AS count
        FROM user_cards uc
        JOIN cards c ON c.id = uc.card_id
        WHERE uc.user_id = ?
        GROUP BY c.id, c.name, c.image_url, c.rarity
        ORDER BY 
            CASE c.rarity
                WHEN 'Legendary' THEN 1
                WHEN 'Epic' THEN 2
                WHEN 'Rare' THEN 3
                ELSE 4
            END
    ");
    $stmt->execute([$user_id]);

    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'SERVER_ERROR',
        'message' => $e->getMessage()
    ]);
}
