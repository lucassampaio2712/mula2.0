/**
 * ============================================================
 * BACKEND INTEGRATION — Ponte Front-end ↔ PHP ↔ API Yampi
 * ============================================================
 * 
 * Este arquivo fornece:
 *  1. A função iniciarAssinatura(planoId, emailCliente) — conforme
 *     solicitado na Etapa 1 — que envia dados via fetch POST para
 *     o servidor PHP.
 * 
 *  2. O objeto global `api` com método createSubscription() — 
 *     compatível com a chamada já existente em script.js.
 * 
 *  3. Ao receber a checkout_url da Yampi, redireciona o usuário
 *     automaticamente para o checkout.
 * ============================================================
 */

// URL base do backend PHP (ajuste para produção)
// Em produção: 'https://seudominio.com/api'
// Em desenvolvimento local com PHP embutido: 'http://localhost:8000/api'
const API_BASE_URL = 'api';

// ============================================================
// FUNÇÃO PRINCIPAL: iniciarAssinatura(planoId, emailCliente)
// ============================================================

/**
 * Envia os dados da assinatura para o servidor PHP, que por sua vez
 * faz a requisição autenticada para a API da Yampi.
 * 
 * @param {string} planoId - Identificador do plano (ex: "preferencia", "experiencia")
 * @param {string} emailCliente - E-mail do cliente
 * @param {Object} dadosCompletos - Objeto completo com personal, delivery, payment, planDetails
 * @returns {Promise<Object>} Resposta do servidor com checkout_url
 */
async function iniciarAssinatura(planoId, emailCliente, dadosCompletos = {}) {
    console.log('🚀 Iniciando assinatura...', { planoId, emailCliente });

    const payload = {
        planoId: planoId,
        emailCliente: emailCliente,
        personal: dadosCompletos.personal || {},
        delivery: dadosCompletos.delivery || {},
        payment: dadosCompletos.payment || {},
        planDetails: {
            plan: dadosCompletos.plan || planoId,
            amount: dadosCompletos.amount || null,
            price: dadosCompletos.price || null,
            grindType: dadosCompletos.grindType || null,
            grindMethod: dadosCompletos.grindMethod || null,
            frequency: dadosCompletos.frequency || null,
            selectedCoffees: dadosCompletos.selectedCoffees || [],
        },
    };

    try {
        const response = await fetch(`${API_BASE_URL}/criar-assinatura.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Erro HTTP ${response.status}`);
        }

        if (result.success) {
            console.log('✅ Assinatura criada com sucesso!', result);

            // Se a Yampi retornou uma checkout_url, redirecionar automaticamente
            if (result.checkout_url) {
                console.log('🔗 Redirecionando para checkout:', result.checkout_url);
                window.location.href = result.checkout_url;
                return result;
            }

            // Se não há redirect (checkout transparente processado direto), retornar sucesso
            return result;
        } else {
            throw new Error(result.error || 'Erro desconhecido ao criar assinatura.');
        }

    } catch (error) {
        console.error('❌ Erro em iniciarAssinatura:', error);
        throw error;
    }
}


// ============================================================
// OBJETO GLOBAL `api` — Compatível com script.js existente
// ============================================================

/**
 * Objeto api global usado por script.js: api.createSubscription(subscriptionData)
 * Extrai os campos relevantes do subscriptionData e chama iniciarAssinatura()
 */
const api = {

    /**
     * Cria a assinatura enviando todos os dados acumulados no wizard.
     * 
     * @param {Object} subscriptionData - Dados completos da assinatura
     * @returns {Promise<Object>} { success, subscriptionId, checkout_url, ... }
     */
    async createSubscription(subscriptionData) {
        // Extrair dados do plano
        const planoId = subscriptionData.plan || 'preferencia';
        const emailCliente = subscriptionData.personal 
            ? subscriptionData.personal.email 
            : '';

        if (!emailCliente) {
            throw new Error('E-mail do cliente não informado.');
        }

        // Chamar a função principal
        const result = await iniciarAssinatura(planoId, emailCliente, subscriptionData);

        // Formatar resposta compatível com o que script.js espera
        return {
            success: true,
            subscriptionId: result.subscriptionId || result.checkout_url || 'pending',
            checkoutUrl: result.checkout_url || null,
            status: result.status || 'created',
        };
    },
};

// ============================================================
// HELPERS PARA O STEP 6 (Formatação de inputs de cartão)
// ============================================================

/**
 * Formata número do cartão com espaços: 0000 0000 0000 0000
 */
function formatCardNumber(value) {
    const cleaned = value.replace(/\D/g, '').slice(0, 16);
    const groups = cleaned.match(/.{1,4}/g);
    return groups ? groups.join(' ') : cleaned;
}

/**
 * Formata data de validade: MM/AA
 */
function formatExpiryDate(value) {
    const cleaned = value.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
        return cleaned.slice(0, 2) + '/' + cleaned.slice(2);
    }
    return cleaned;
}

/**
 * Limita CVV a 3-4 dígitos
 */
function formatCVV(value) {
    return value.replace(/\D/g, '').slice(0, 4);
}

/**
 * Inicializa formatadores de input do cartão (chamado quando Step 6 fica ativo)
 */
function initPaymentFormatters() {
    const cardNumberInput = document.getElementById('cardNumber');
    const expiryInput = document.getElementById('expiryDate');
    const cvvInput = document.getElementById('cvv');

    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function () {
            const pos = this.selectionStart;
            const oldLen = this.value.length;
            this.value = formatCardNumber(this.value);
            const newLen = this.value.length;
            // Ajustar cursor
            this.setSelectionRange(pos + (newLen - oldLen), pos + (newLen - oldLen));
        });
    }

    if (expiryInput) {
        expiryInput.addEventListener('input', function () {
            this.value = formatExpiryDate(this.value);
        });
    }

    if (cvvInput) {
        cvvInput.addEventListener('input', function () {
            this.value = formatCVV(this.value);
        });
    }
}


// ============================================================
// STEP 6: VALIDAÇÃO, RESUMO E FINALIZAÇÃO
// ============================================================

document.addEventListener('DOMContentLoaded', function () {

    // ── Inicializar formatadores de cartão ──
    initPaymentFormatters();

    // ── Preencher resumo de compra no Step 6 ──
    function updatePaymentSummary() {
        const sd = window.subscriptionData || {};

        // Plano
        const planEl = document.getElementById('summary-plan');
        if (planEl) {
            const planNames = {
                'experiencia': 'Coffee Experiência',
                'preferencia': 'Coffee Preferência',
            };
            planEl.textContent = planNames[sd.plan] || sd.plan || '-';
        }

        // Quantidade
        const qtyEl = document.getElementById('summary-qty');
        if (qtyEl && sd.amount) {
            const packages = parseInt(sd.amount) / 250;
            qtyEl.textContent = `${packages} pacote(s) — ${sd.amount}g`;
        }

        // Grãos selecionados
        const coffeesEl = document.getElementById('summary-coffees');
        if (coffeesEl) {
            if (sd.plan === 'experiencia') {
                coffeesEl.textContent = 'Seleção da casa (surpresa)';
            } else if (sd.selectedCoffees && sd.selectedCoffees.length > 0) {
                const names = sd.selectedCoffees.map(c => c.name).join(', ');
                coffeesEl.textContent = names;
            } else {
                coffeesEl.textContent = '-';
            }
        }

        // Moagem
        const grindEl = document.getElementById('summary-grind');
        if (grindEl) {
            if (sd.grindType === 'beans') {
                grindEl.textContent = 'Em grãos';
            } else if (sd.grindType === 'ground' && sd.grindMethod) {
                const methodNames = {
                    'filtrado': 'Moído — Filtrado',
                    'espresso': 'Moído — Espresso',
                    'prensa': 'Moído — Prensa Francesa',
                };
                grindEl.textContent = methodNames[sd.grindMethod] || sd.grindMethod;
            } else {
                grindEl.textContent = '-';
            }
        }

        // Frequência
        const freqEl = document.getElementById('summary-freq');
        if (freqEl && sd.frequency) {
            freqEl.textContent = `A cada ${sd.frequency} dias (${sd.deliveriesPerYear}x/ano)`;
        }

        // Entrega
        const deliveryEl = document.getElementById('summary-delivery');
        if (deliveryEl && sd.delivery) {
            if (sd.delivery.type === 'pickup') {
                const storeNames = {
                    'goiania': 'Loja Goiânia',
                    'brasilia': 'Loja Brasília',
                };
                deliveryEl.textContent = storeNames[sd.delivery.store] || sd.delivery.store;
            } else {
                deliveryEl.textContent = `${sd.delivery.street}, ${sd.delivery.number} — ${sd.delivery.city}/${sd.delivery.state}`;
            }
        }

        // Valor total
        const totalEl = document.getElementById('summary-total');
        if (totalEl && sd.price) {
            totalEl.textContent = `R$ ${sd.price}`;
        }
    }

    // Expor globalmente para ser chamada ao entrar no Step 6
    window.updatePaymentSummary = updatePaymentSummary;

    // ── Validação do Step 6 ──
    function validateStep6() {
        const cardholderName = document.getElementById('cardholderName');
        const cardNumber = document.getElementById('cardNumber');
        const expiryDate = document.getElementById('expiryDate');
        const cvv = document.getElementById('cvv');
        const acceptTerms = document.getElementById('acceptTerms');
        const payBtn = document.getElementById('step6-pay');
        const warning = document.getElementById('step6-warning');

        let isValid = true;

        // Titular
        if (!cardholderName || cardholderName.value.trim().length < 3) {
            isValid = false;
        }

        // Número do cartão (16 dígitos)
        if (!cardNumber || cardNumber.value.replace(/\D/g, '').length < 13) {
            isValid = false;
        }

        // Validade (MM/AA)
        if (!expiryDate || !/^\d{2}\/\d{2}$/.test(expiryDate.value)) {
            isValid = false;
        }

        // CVV (3-4 dígitos)
        if (!cvv || cvv.value.replace(/\D/g, '').length < 3) {
            isValid = false;
        }

        // Termos aceitos
        if (!acceptTerms || !acceptTerms.checked) {
            isValid = false;
        }

        // Habilitar/desabilitar botão
        if (payBtn) {
            payBtn.disabled = !isValid;
        }

        // Warning
        if (warning) {
            warning.style.display = isValid ? 'none' : 'none'; // Mostrar só ao tentar submeter
        }

        return isValid;
    }

    // ── Listeners de validação em tempo real ──
    const paymentInputs = document.querySelectorAll(
        '#cardholderName, #cardNumber, #expiryDate, #cvv, #acceptTerms'
    );
    paymentInputs.forEach(input => {
        if (input) {
            input.addEventListener('input', validateStep6);
            input.addEventListener('change', validateStep6);
        }
    });

    // Validação inicial
    validateStep6();

    // ── Handler do botão "Finalizar Assinatura" ──
    const payBtn = document.getElementById('step6-pay');
    if (payBtn) {
        payBtn.addEventListener('click', async function (e) {
            e.preventDefault();

            // Validar
            if (!validateStep6()) {
                const warning = document.getElementById('step6-warning');
                if (warning) warning.style.display = 'block';
                return;
            }

            // Coletar dados de pagamento e adicionar ao subscriptionData
            const sd = window.subscriptionData || {};
            sd.payment = {
                cardholderName: document.getElementById('cardholderName').value.trim(),
                cardNumber: document.getElementById('cardNumber').value.trim(),
                expiryDate: document.getElementById('expiryDate').value.trim(),
                cvv: document.getElementById('cvv').value.trim(),
            };

            // ── Estado de loading ──
            const originalText = payBtn.textContent;
            payBtn.textContent = 'Processando...';
            payBtn.disabled = true;
            payBtn.style.opacity = '0.7';

            try {
                // Chamar a API — iniciarAssinatura faz o fetch para o PHP
                const result = await api.createSubscription(sd);

                if (result.success) {
                    // Salvar no localStorage para referência
                    sd.subscriptionId = result.subscriptionId;
                    localStorage.setItem('subscriptionId', result.subscriptionId);
                    localStorage.setItem('subscriptionData', JSON.stringify(sd));
                    
                    console.log('✅ Assinatura finalizada:', result);

                    // Se houver checkout_url, o redirecionamento já foi feito
                    // em iniciarAssinatura(). Caso contrário, mostrar sucesso:
                    if (!result.checkoutUrl) {
                        alert('🎉 Assinatura criada com sucesso!\n\nVocê receberá um e-mail de confirmação em breve.');
                    }
                }

            } catch (error) {
                console.error('❌ Erro ao finalizar assinatura:', error);
                
                const warning = document.getElementById('step6-warning');
                if (warning) {
                    warning.textContent = '⚠️ ' + (error.message || 'Erro ao processar pagamento. Tente novamente.');
                    warning.style.display = 'block';
                }

                // Restaurar botão
                payBtn.textContent = originalText;
                payBtn.disabled = false;
                payBtn.style.opacity = '1';
            }
        });
    }

    // ── Observar quando Step 6 ficar ativo para atualizar resumo ──
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const step6 = document.getElementById('step-6');
                if (step6 && step6.classList.contains('active')) {
                    updatePaymentSummary();
                }
            }
        });
    });

    const step6 = document.getElementById('step-6');
    if (step6) {
        observer.observe(step6, { attributes: true });
    }
});
