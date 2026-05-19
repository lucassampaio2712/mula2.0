<?php
/**
 * ============================================================
 * CONFIGURAÇÃO DE CREDENCIAIS DA YAMPI
 * ============================================================
 * 
 * ATENÇÃO: Este arquivo contém credenciais sensíveis.
 * - NÃO versione este arquivo (adicione ao .gitignore)
 * - NÃO compartilhe publicamente
 * - Substitua os valores abaixo pelas suas credenciais reais
 * 
 * Onde encontrar suas credenciais:
 * 1. Acesse o painel Yampi: https://app.yampi.com.br
 * 2. Vá em Configurações → Integrações → API
 * 3. Copie o Token, Secret Key e o Alias da sua loja
 * ============================================================
 */

// Alias da loja (slug que aparece na URL do painel Yampi)
define('YAMPI_ALIAS', 'mula-coffee');

// Token de autenticação da API (User-Token)
define('YAMPI_TOKEN', 'SEU_TOKEN_AQUI');

// Secret Key da API (User-Secret-Key)
define('YAMPI_SECRET', 'SEU_SECRET_AQUI');

// ID do produto "Pacote Preferência" na Yampi
define('YAMPI_PRODUCT_ID', 44223231);

// URL base da API Yampi v2
define('YAMPI_API_BASE', 'https://api.yampi.com.br/v2/' . YAMPI_ALIAS);
