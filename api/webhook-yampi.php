<?php
/**
 * ============================================================
 * ETAPA 2 — RECEPTOR DE WEBHOOK PARA CONFIRMAÇÃO DE PAGAMENTO
 * Endpoint: POST /api/webhook-yampi.php
 * ============================================================
 * 
 * Este script recebe notificações POST da Yampi quando o status
 * de um pedido muda (ex: pagamento confirmado, pedido aprovado).
 * 
 * ============================================================
 * COMO CONFIGURAR NO PAINEL DA YAMPI:
 * ============================================================
 * 
 * 1. Acesse o painel Yampi: https://app.yampi.com.br
 * 
 * 2. No menu lateral, vá em:
 *    Configurações → Integrações → Webhooks
 * 
 * 3. Clique em "Adicionar Webhook" (ou "Novo Webhook")
 * 
 * 4. Preencha os campos:
 *    - URL: https://seudominio.com/api/webhook-yampi.php
 *      (substitua "seudominio.com" pelo domínio real do seu site)
 *    
 *    - Eventos: Selecione os seguintes eventos:
 *      ✅ Pedido pago (order.paid)
 *      ✅ Pedido aprovado (order.approved)
 *      ✅ Assinatura criada (subscription.created) — opcional
 *      ✅ Assinatura cancelada (subscription.cancelled) — opcional
 * 
 * 5. Clique em "Salvar"
 * 
 * 6. (Opcional) Use o botão "Testar" no painel para enviar um 
 *    webhook de teste e verificar se este script responde com 200 OK.
 * 
 * 7. Para verificar se está funcionando, consulte o log em:
 *    /api/logs/webhook.log
 * 
 * ============================================================
 * IMPORTANTE - SEGURANÇA EM PRODUÇÃO:
 * ============================================================
 * Em ambiente de produção, recomenda-se:
 * - Validar a assinatura/hash do webhook (se a Yampi fornecer)
 * - Filtrar IPs de origem permitidos (IPs da Yampi)
 * - Usar HTTPS obrigatoriamente
 * - Proteger o arquivo de log contra acesso público (.htaccess)
 * ============================================================
 */

// ── Headers ──
header('Content-Type: application/json; charset=utf-8');

// Aceitar apenas POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método não permitido. Este endpoint aceita apenas POST.']);
    exit;
}

// ── Ler corpo da requisição (JSON enviado pela Yampi) ──
$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);

// Verificar se o JSON é válido
if (!$payload) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido ou corpo vazio.']);
    logWebhook('ERRO', 'JSON inválido recebido', $rawBody);
    exit;
}

// ── Extrair dados relevantes do webhook ──
// A estrutura pode variar conforme o evento; tratar ambos formatos
$event    = isset($payload['event'])    ? $payload['event']    : 'desconhecido';
$resource = isset($payload['resource']) ? $payload['resource'] : $payload;

// Extrair status do pedido
$status = null;
if (isset($resource['status'])) {
    $status = strtolower($resource['status']);
} elseif (isset($resource['data']['status'])) {
    $status = strtolower($resource['data']['status']);
}

// Extrair dados do cliente
$customerEmail = null;
$customerName  = null;

if (isset($resource['customer']['email'])) {
    $customerEmail = $resource['customer']['email'];
    $customerName  = isset($resource['customer']['first_name']) 
                        ? $resource['customer']['first_name'] . ' ' . (isset($resource['customer']['last_name']) ? $resource['customer']['last_name'] : '')
                        : 'N/A';
} elseif (isset($resource['data']['customer']['email'])) {
    $customerEmail = $resource['data']['customer']['email'];
    $customerName  = isset($resource['data']['customer']['first_name']) 
                        ? $resource['data']['customer']['first_name'] . ' ' . (isset($resource['data']['customer']['last_name']) ? $resource['data']['customer']['last_name'] : '')
                        : 'N/A';
}

// Extrair ID do pedido
$orderId = isset($resource['id']) 
            ? $resource['id'] 
            : (isset($resource['data']['id']) ? $resource['data']['id'] : 'N/A');

// ── Verificar se o pagamento foi confirmado ──
if ($status === 'paid' || $status === 'approved') {
    
    /**
     * ✅ PAGAMENTO CONFIRMADO!
     * 
     * Aqui você deve implementar a lógica de ativação do serviço:
     * - Ativar a assinatura no seu banco de dados
     * - Enviar e-mail de boas-vindas ao cliente
     * - Registrar a primeira entrega no calendário
     * - Notificar a equipe de logística
     * 
     * Por enquanto, simulamos a ativação com um log:
     */
    
    $message = sprintf(
        "PAGAMENTO CONFIRMADO | Pedido: %s | Status: %s | Evento: %s | Cliente: %s (%s)",
        $orderId,
        $status,
        $event,
        $customerName,
        $customerEmail
    );

    logWebhook('SUCESSO', $message);

    // ── Simular ativação do serviço ──
    ativarServico($customerEmail, $customerName, $orderId, $status);

    // Responder 200 OK para a Yampi confirmar recebimento
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Pagamento processado com sucesso.',
    ]);
    exit;

} else {
    // Status diferente de paid/approved (ex: pending, cancelled, refunded)
    $message = sprintf(
        "EVENTO RECEBIDO | Pedido: %s | Status: %s | Evento: %s | Cliente: %s (%s)",
        $orderId,
        $status ?: 'N/A',
        $event,
        $customerName ?: 'N/A',
        $customerEmail ?: 'N/A'
    );

    logWebhook('INFO', $message);

    // Sempre responder 200 para a Yampi não reenviar
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Evento recebido e registrado.',
    ]);
    exit;
}


// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

/**
 * Simula a ativação do serviço para o cliente.
 * Em produção, substitua por lógica real (banco de dados, e-mail, etc.)
 */
function ativarServico($email, $nome, $orderId, $status) {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $activationLog = $logDir . '/ativacoes.log';
    $timestamp     = date('Y-m-d H:i:s');

    $entry = sprintf(
        "[%s] ✅ SERVIÇO ATIVADO\n" .
        "   Pedido:  %s\n" .
        "   Status:  %s\n" .
        "   Cliente: %s\n" .
        "   E-mail:  %s\n" .
        "   Ação:    Assinatura de café Mula Coffee ativada com sucesso.\n" .
        "   ---\n",
        $timestamp,
        $orderId,
        $status,
        $nome,
        $email
    );

    file_put_contents($activationLog, $entry, FILE_APPEND | LOCK_EX);

    // Log no error_log do PHP também (visível no painel da hospedagem)
    error_log("[Mula Coffee] Serviço ativado para: $email (Pedido: $orderId)");
}

/**
 * Registra eventos do webhook em arquivo de log
 */
function logWebhook($tipo, $mensagem, $rawData = null) {
    $logDir = __DIR__ . '/logs';
    if (!is_dir($logDir)) {
        mkdir($logDir, 0755, true);
    }

    $logFile   = $logDir . '/webhook.log';
    $timestamp = date('Y-m-d H:i:s');

    $entry = sprintf("[%s] [%s] %s\n", $timestamp, $tipo, $mensagem);
    
    if ($rawData) {
        $entry .= "   Raw: " . substr($rawData, 0, 500) . "\n";
    }

    file_put_contents($logFile, $entry, FILE_APPEND | LOCK_EX);
}
