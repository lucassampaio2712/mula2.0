<?php
/**
 * ============================================================
 * ETAPA 1 — PONTE DE SEGURANÇA / GERAÇÃO DE CHECKOUT
 * Endpoint: POST /api/criar-assinatura.php
 * ============================================================
 * 
 * Este script recebe os dados do front-end (plano, dados pessoais,
 * endereço e pagamento) e faz uma requisição autenticada para a
 * API da Yampi (POST /v2/{alias}/checkouts) usando cURL.
 * 
 * O front-end NUNCA tem acesso direto às credenciais da API.
 * Todas as chaves ficam protegidas neste servidor PHP.
 * ============================================================
 */

// ── Headers CORS (permitir requisições do front-end) ──
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');   // Em produção, restrinja ao seu domínio
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Responder preflight CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Aceitar apenas POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido. Use POST.']);
    exit;
}

// ── Carregar credenciais ──
require_once __DIR__ . '/config.php';

// ── Ler corpo da requisição ──
$rawBody = file_get_contents('php://input');
$data = json_decode($rawBody, true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido ou corpo vazio.']);
    exit;
}

// ── Extrair dados recebidos do front-end ──
$planoId     = isset($data['planoId'])     ? $data['planoId']     : null;
$emailCliente = isset($data['emailCliente']) ? $data['emailCliente'] : null;
$personal    = isset($data['personal'])    ? $data['personal']    : [];
$delivery    = isset($data['delivery'])    ? $data['delivery']    : [];
$payment     = isset($data['payment'])     ? $data['payment']     : [];
$planDetails = isset($data['planDetails']) ? $data['planDetails'] : [];

// ── Validação básica ──
if (empty($emailCliente)) {
    http_response_code(400);
    echo json_encode(['error' => 'E-mail do cliente é obrigatório.']);
    exit;
}

if (empty($personal['fullName']) || empty($personal['cpf']) || empty($personal['phone'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Nome, CPF e telefone são obrigatórios.']);
    exit;
}

if (empty($payment['cardNumber']) || empty($payment['cardholderName']) || 
    empty($payment['expiryDate']) || empty($payment['cvv'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados do cartão são obrigatórios.']);
    exit;
}

// ── Limpar CPF e telefone (remover formatação) ──
$cpfLimpo    = preg_replace('/\D/', '', $personal['cpf']);
$phoneLimpo  = preg_replace('/\D/', '', $personal['phone']);
$cardLimpo   = preg_replace('/\D/', '', $payment['cardNumber']);

// ── Separar nome e sobrenome ──
$nameParts = explode(' ', trim($personal['fullName']), 2);
$firstName = $nameParts[0];
$lastName  = isset($nameParts[1]) ? $nameParts[1] : '';

// ── Separar mês/ano do cartão ──
$expiryParts = explode('/', $payment['expiryDate']);
$expiryMonth = isset($expiryParts[0]) ? trim($expiryParts[0]) : '';
$expiryYear  = isset($expiryParts[1]) ? trim($expiryParts[1]) : '';
// Converter ano de 2 dígitos para 4 se necessário
if (strlen($expiryYear) === 2) {
    $expiryYear = '20' . $expiryYear;
}

// ── Montar corpo da requisição para a API Yampi ──
// Documentação: https://docs.yampi.com.br
$yampiBody = [
    // Produto da assinatura
    'items' => [
        [
            'product_id' => YAMPI_PRODUCT_ID,  // "Pacote Preferência" - ID: 44223231
            'quantity'    => 1,
            'name'        => 'Pacote Preferência',
        ]
    ],

    // Dados do cliente
    'customer' => [
        'first_name' => $firstName,
        'last_name'  => $lastName,
        'email'      => $emailCliente,
        'cpf'        => $cpfLimpo,
        'phone'      => [
            'area_code' => substr($phoneLimpo, 0, 2),
            'number'    => substr($phoneLimpo, 2),
        ],
    ],

    // Dados de pagamento (checkout transparente via Stone)
    'payment' => [
        'method'   => 'credit_card',
        'card' => [
            'holder_name'      => $payment['cardholderName'],
            'number'           => $cardLimpo,
            'expiration_month' => $expiryMonth,
            'expiration_year'  => $expiryYear,
            'security_code'    => $payment['cvv'],
        ],
    ],

    // Dados de entrega
    'shipping' => buildShippingData($delivery),

    // Metadados do plano (para referência)
    'metadata' => [
        'plano_tipo'  => isset($planDetails['plan'])      ? $planDetails['plan']      : '',
        'peso'        => isset($planDetails['amount'])     ? $planDetails['amount']    : '',
        'moagem'      => isset($planDetails['grindType'])  ? $planDetails['grindType'] : '',
        'frequencia'  => isset($planDetails['frequency'])  ? $planDetails['frequency'] : '',
    ],
];

/**
 * Monta os dados de envio com base no tipo de entrega
 */
function buildShippingData($delivery) {
    if (empty($delivery) || (isset($delivery['type']) && $delivery['type'] === 'pickup')) {
        return [
            'type'  => 'pickup',
            'store' => isset($delivery['store']) ? $delivery['store'] : 'goiania',
        ];
    }

    return [
        'type'         => 'delivery',
        'zip_code'     => preg_replace('/\D/', '', isset($delivery['zipCode']) ? $delivery['zipCode'] : ''),
        'street'       => isset($delivery['street'])       ? $delivery['street']       : '',
        'number'       => isset($delivery['number'])        ? $delivery['number']       : '',
        'complement'   => isset($delivery['complement'])    ? $delivery['complement']   : '',
        'neighborhood' => isset($delivery['neighborhood'])  ? $delivery['neighborhood'] : '',
        'city'         => isset($delivery['city'])          ? $delivery['city']         : '',
        'state'        => isset($delivery['state'])         ? $delivery['state']        : '',
    ];
}

// ── Fazer requisição autenticada para a API Yampi ──
$url = YAMPI_API_BASE . '/checkouts';

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($yampiBody),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'User-Token: '      . YAMPI_TOKEN,
        'User-Secret-Key: ' . YAMPI_SECRET,
    ],
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => true,
]);

$response     = curl_exec($ch);
$httpCode     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError    = curl_error($ch);
curl_close($ch);

// ── Tratar erros de conexão ──
if ($curlError) {
    error_log("[Mula Coffee] Erro cURL ao criar checkout: $curlError");
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'error'   => 'Falha na comunicação com o gateway de pagamento. Tente novamente.',
    ]);
    exit;
}

// ── Processar resposta da Yampi ──
$yampiResponse = json_decode($response, true);

// Log para debug (remover em produção ou configurar nível de log)
error_log("[Mula Coffee] Yampi Response (HTTP $httpCode): " . $response);

if ($httpCode >= 200 && $httpCode < 300 && $yampiResponse) {
    // Sucesso — extrair checkout_url e dados relevantes
    $checkoutUrl    = isset($yampiResponse['data']['checkout_url'])    
                        ? $yampiResponse['data']['checkout_url'] 
                        : (isset($yampiResponse['checkout_url']) ? $yampiResponse['checkout_url'] : null);
    
    $subscriptionId = isset($yampiResponse['data']['id'])             
                        ? $yampiResponse['data']['id'] 
                        : (isset($yampiResponse['id']) ? $yampiResponse['id'] : null);

    $status         = isset($yampiResponse['data']['status'])         
                        ? $yampiResponse['data']['status'] 
                        : (isset($yampiResponse['status']) ? $yampiResponse['status'] : null);

    echo json_encode([
        'success'        => true,
        'checkout_url'   => $checkoutUrl,
        'subscriptionId' => $subscriptionId,
        'status'         => $status,
        'message'        => 'Assinatura criada com sucesso!',
    ]);
    exit;

} else {
    // Erro da API Yampi
    $errorMessage = 'Erro ao processar pagamento.';
    
    if (isset($yampiResponse['message'])) {
        $errorMessage = $yampiResponse['message'];
    } elseif (isset($yampiResponse['errors'])) {
        if (is_array($yampiResponse['errors'])) {
            $errorMessage = implode('. ', array_map(function($e) {
                return is_array($e) ? implode(', ', $e) : $e;
            }, $yampiResponse['errors']));
        } else {
            $errorMessage = $yampiResponse['errors'];
        }
    }

    error_log("[Mula Coffee] Yampi Erro (HTTP $httpCode): $errorMessage");

    http_response_code($httpCode >= 400 ? $httpCode : 500);
    echo json_encode([
        'success' => false,
        'error'   => $errorMessage,
    ]);
    exit;
}
