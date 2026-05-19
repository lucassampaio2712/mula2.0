// ========================================
// STEP WIZARD SYSTEM
// ========================================

// Dados dos cafés disponíveis
const coffeeData = [
    {
        id: 1,
        name: "Maria",
        city: "Norte Pioneiro do Paraná, Carlópolis",
        state: "PR",
        altitude: "600 metros",
        variety: "Arará",
        notes: ["Meleira", "Rapadura", "Caldo de Cana"],
        selectedQuantity: 0
    },
    {
        id: 2,
        name: "Sérgio",
        city: "Matas de Minas, Manhimirim",
        state: "MG",
        altitude: "1000m",
        variety: "Catuaí Amarelo IAC-62",
        notes: ["Doce de Leite", "Melado", "Chocolate ao Leite"],
        selectedQuantity: 0
    },
    {
        id: 3,
        name: "Thiago",
        city: "Cerrado Mineiro, Rio Paranaíba",
        state: "MG",
        altitude: "1100m",
        variety: "Séria",
        notes: ["Frutas Vermelhas", "Doce de Morango", "Amora"],
        selectedQuantity: 0
    }
];

// Armazenamento de dados da assinatura
const subscriptionData = {
    plan: null,
    amount: null,
    price: null,
    maxPackages: 0,
    selectedCoffees: [],
    grindType: null,      // "beans" ou "ground"
    grindMethod: null,    // "filtrado", "espresso", "prensa" (se ground)
    frequency: null,      // "15", "30", "45" (dias entre entregas)
    deliveriesPerYear: null  // 24, 12 ou 8
};

// Controle de steps
let currentStep = 1;
const totalSteps = 6;

// Função para ir para próximo step
function nextStep() {
    if (currentStep < totalSteps) {
        // Se estiver no Step 2, salvar seleção de cafés
        if (currentStep === 2) {
            saveStep2Selection();
        }
        
        const currentContent = document.getElementById(`step-${currentStep}`);
        
        // Lógica especial: pular Step 2 se o plano for "experiencia"
        let nextStepNumber = currentStep + 1;
        if (currentStep === 1 && subscriptionData.plan === 'experiencia') {
            nextStepNumber = 3; // Pula direto para o step 3
        }
        
        const nextContent = document.getElementById(`step-${nextStepNumber}`);
        
        // Animação de saída
        currentContent.classList.add('slide-out-left');
        
        setTimeout(() => {
            currentContent.classList.remove('active', 'slide-out-left');
            nextContent.classList.add('active', 'slide-in-right');
            
            // Atualizar indicadores
            document.querySelectorAll('.step-indicator')[currentStep - 1].classList.add('completed');
            
            // Se pular step, marcar o step 2 como completed também
            if (nextStepNumber === 3 && currentStep === 1) {
                document.querySelectorAll('.step-indicator')[1].classList.add('completed');
                document.querySelectorAll('.step-line')[0].classList.add('completed');
            }
            
            document.querySelectorAll('.step-indicator')[nextStepNumber - 1].classList.add('active');
            document.querySelectorAll('.step-line')[nextStepNumber - 2].classList.add('completed');
            
            currentStep = nextStepNumber;
            
            // Atualizar resumo ao entrar no Step 4
            if (nextStepNumber === 4) {
                updateStep4Summary();
            }
            
            // Scroll para o topo
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 300);
    }
}

// Função para voltar ao step anterior
function prevStep() {
    if (currentStep > 1) {
        const currentContent = document.getElementById(`step-${currentStep}`);
        
        // Se estiver voltando para o step 2 do step 3, restaurar seleção
        let prevStepNumber = currentStep - 1;
        if (currentStep === 3 && subscriptionData.plan === 'experiencia') {
            prevStepNumber = 1; // Voltar direto para o step 1
        }
        
        const prevContent = document.getElementById(`step-${prevStepNumber}`);
        
        currentContent.classList.remove('active');
        prevContent.classList.add('active');
        
        // Se voltar para step 2, restaurar quantidades
        if (prevStepNumber === 2) {
            restoreStep2Selection();
        }
        
        // Se voltar para step 3, restaurar seleção de moagem
        if (prevStepNumber === 3) {
            restoreStep3Selection();
        }
        
        // Se voltar para step 4, restaurar seleção de frequência
        if (prevStepNumber === 4) {
            restoreStep4Selection();
        }
        
        // Atualizar indicadores
        document.querySelectorAll('.step-indicator')[currentStep - 1].classList.remove('active', 'completed');
        
        // Se pular de volta, remover completed do step 2 também
        if (currentStep === 3 && prevStepNumber === 1 && subscriptionData.plan === 'experiencia') {
            document.querySelectorAll('.step-indicator')[1].classList.remove('completed');
            document.querySelectorAll('.step-line')[0].classList.remove('completed');
        }
        
        document.querySelectorAll('.step-indicator')[prevStepNumber - 1].classList.add('active');
        document.querySelectorAll('.step-line')[prevStepNumber - 1].classList.remove('completed');
        
        currentStep = prevStepNumber;
        
        // Scroll para o topo
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Salvar seleção do Step 2
function saveStep2Selection() {
    subscriptionData.selectedCoffees = coffeeData
        .filter(c => c.selectedQuantity > 0)
        .map(c => ({
            id: c.id,
            name: c.name,
            quantity: c.selectedQuantity
        }));
    
    console.log('Cafés selecionados:', subscriptionData);
}

// Restaurar seleção do Step 2
function restoreStep2Selection() {
    // Restaurar quantidades dos cafés baseado em selectedCoffees
    subscriptionData.selectedCoffees.forEach(selected => {
        const coffee = coffeeData.find(c => c.id === selected.id);
        if (coffee) {
            coffee.selectedQuantity = selected.quantity;
            
            // Atualizar UI
            const qtyDisplay = document.getElementById(`qty-${coffee.id}`);
            if (qtyDisplay) {
                qtyDisplay.textContent = coffee.selectedQuantity;
            }
            
            const coffeeCard = document.querySelector(`[data-coffee-id="${coffee.id}"]`);
            if (coffeeCard && coffee.selectedQuantity > 0) {
                coffeeCard.classList.add('selected');
            }
        }
    });
    
    // Atualizar sumário e validação
    updateSelectionSummary();
    validateStep2();
    updatePlusButtonsState();
}

// Event listeners para plan cards (Step 1)
document.addEventListener('DOMContentLoaded', function() {
    const planCards = document.querySelectorAll('.plan-card');
    
    planCards.forEach(card => {
        const selectBtn = card.querySelector('.plan-select-btn');
        
        selectBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            
            // Remover seleção anterior
            planCards.forEach(c => c.classList.remove('selected'));
            
            // Adicionar seleção atual
            card.classList.add('selected');
            
            // Armazenar dados do plano
            subscriptionData.plan = card.dataset.plan;
            subscriptionData.amount = card.dataset.amount;
            subscriptionData.price = card.dataset.price;
            
            // Calcular maxPackages baseado na quantidade
            switch(card.dataset.amount) {
                case '250':
                    subscriptionData.maxPackages = 1;
                    break;
                case '500':
                    subscriptionData.maxPackages = 2;
                    break;
                case '750':
                    subscriptionData.maxPackages = 3;
                    break;
                default:
                    subscriptionData.maxPackages = 1;
            }
            
            console.log('Plano selecionado:', subscriptionData);
            
            // Aguardar um pouco e ir para próximo step
            setTimeout(() => {
                nextStep();
            }, 500);
        });
    });
    
    // Event listeners para botões de navegação
    const prevButtons = document.querySelectorAll('.step-nav-btn.prev');
    prevButtons.forEach(btn => {
        btn.addEventListener('click', prevStep);
    });

    // Event listeners para botões "Próximo"
    const nextButtons = document.querySelectorAll('.step-nav-btn.next');
    nextButtons.forEach(btn => {
        btn.addEventListener('click', nextStep);
    });
    
    // ========================================
    // STEP 2: SELEÇÃO DE GRÃOS
    // ========================================
    
    // Atualizar quantidade de café
    function updateCoffeeQuantity(coffeeId, delta) {
        const coffee = coffeeData.find(c => c.id === coffeeId);
        if (!coffee) return;
        
        // Calcular total atual de pacotes
        const currentTotal = coffeeData.reduce((sum, c) => sum + c.selectedQuantity, 0);
        
        // Validar se pode adicionar mais
        if (delta > 0 && currentTotal >= subscriptionData.maxPackages) {
            return; // Já atingiu o limite
        }
        
        // Atualizar quantidade
        const newQuantity = coffee.selectedQuantity + delta;
        if (newQuantity >= 0 && newQuantity <= subscriptionData.maxPackages) {
            coffee.selectedQuantity = newQuantity;
            
            // Atualizar UI
            const qtyDisplay = document.getElementById(`qty-${coffeeId}`);
            if (qtyDisplay) {
                qtyDisplay.textContent = newQuantity;
            }
            
            // Atualizar card visual
            const coffeeCard = document.querySelector(`[data-coffee-id="${coffeeId}"]`);
            if (coffeeCard) {
                if (newQuantity > 0) {
                    coffeeCard.classList.add('selected');
                } else {
                    coffeeCard.classList.remove('selected');
                }
            }
            
            // Atualizar sumário e validação
            updateSelectionSummary();
            validateStep2();
            updatePlusButtonsState();
        }
    }
    
    // Atualizar sumário de seleção
    function updateSelectionSummary() {
        const uniqueTypes = coffeeData.filter(c => c.selectedQuantity > 0).length;
        const totalPackages = coffeeData.reduce((sum, c) => sum + c.selectedQuantity, 0);
        const maxPackages = subscriptionData.maxPackages || 3;
        
        const summaryText = document.getElementById('summary-text');
        if (summaryText) {
            summaryText.textContent = `${uniqueTypes} tipos de grãos • ${totalPackages} de ${maxPackages} pacotes selecionados`;
        }
    }
    
    // Validar se pode avançar do Step 2
    function validateStep2() {
        const totalPackages = coffeeData.reduce((sum, c) => sum + c.selectedQuantity, 0);
        const nextBtn = document.getElementById('step2-next');
        const warning = document.getElementById('step2-warning');
        
        if (totalPackages > 0) {
            if (nextBtn) nextBtn.disabled = false;
            if (warning) warning.style.display = 'none';
        } else {
            if (nextBtn) nextBtn.disabled = true;
            if (warning) warning.style.display = 'block';
        }
    }
    
    // Atualizar estado dos botões "+"
    function updatePlusButtonsState() {
        const currentTotal = coffeeData.reduce((sum, c) => sum + c.selectedQuantity, 0);
        const maxReached = currentTotal >= (subscriptionData.maxPackages || 3);
        
        document.querySelectorAll('.qty-btn.plus').forEach(btn => {
            if (maxReached) {
                btn.disabled = true;
                btn.classList.add('disabled');
            } else {
                btn.disabled = false;
                btn.classList.remove('disabled');
            }
        });
    }
    
    // Event listeners para botões de quantidade
    const qtyButtons = document.querySelectorAll('.qty-btn');
    if (qtyButtons.length > 0) {
        qtyButtons.forEach(btn => {
            btn.addEventListener('click', function() {
                const coffeeId = parseInt(this.dataset.coffeeId);
                const delta = this.classList.contains('plus') ? 1 : -1;
                updateCoffeeQuantity(coffeeId, delta);
            });
        });
        
        // Inicializar sumário do Step 2 apenas se os botões existirem
        updateSelectionSummary();
        validateStep2();
    }
    
    // ========================================
    // STEP 3: TIPO DE MOAGEM
    // ========================================
    
    // Selecionar tipo de moagem (grãos ou moído)
    function selectGrindType(type) {
        const grindCards = document.querySelectorAll('.grind-option-card');
        const detailOptions = document.getElementById('grind-detail-options');
        const nextBtn = document.getElementById('step3-next');
        
        // Remover seleções anteriores
        grindCards.forEach(card => card.classList.remove('selected'));
        
        // Selecionar card atual
        const selectedCard = document.querySelector(`[data-grind-type="${type}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // Armazenar escolha
        subscriptionData.grindType = type;
        
        if (type === 'beans') {
            // Em grãos: ocultar sub-opções e habilitar próximo
            if (detailOptions) {
                detailOptions.classList.remove('expanded');
            }
            subscriptionData.grindMethod = null; // Limpar método se havia
            if (nextBtn) nextBtn.disabled = false;
            
        } else if (type === 'ground') {
            // Moído: expandir sub-opções e desabilitar próximo até escolher método
            if (detailOptions) {
                detailOptions.classList.add('expanded');
            }
            if (nextBtn) nextBtn.disabled = true;
            
            // Se já tinha um método selecionado antes, manter seleção
            if (subscriptionData.grindMethod) {
                const methodCard = document.querySelector(`[data-grind-method="${subscriptionData.grindMethod}"]`);
                if (methodCard) {
                    methodCard.classList.add('selected');
                    if (nextBtn) nextBtn.disabled = false;
                }
            }
        }
        
        console.log('Tipo de moagem selecionado:', subscriptionData);
    }
    
    // Selecionar método de moagem (filtrado, espresso, prensa)
    function selectGrindMethod(method) {
        const subCards = document.querySelectorAll('.grind-sub-card');
        const nextBtn = document.getElementById('step3-next');
        
        // Remover seleções anteriores
        subCards.forEach(card => card.classList.remove('selected'));
        
        // Selecionar card atual
        const selectedCard = document.querySelector(`[data-grind-method="${method}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // Armazenar escolha
        subscriptionData.grindMethod = method;
        
        // Habilitar botão próximo
        if (nextBtn) nextBtn.disabled = false;
        
        console.log('Método de moagem selecionado:', subscriptionData);
    }
    
    // Validar Step 3
    function validateStep3() {
        const isValid = subscriptionData.grindType === 'beans' || 
                       (subscriptionData.grindType === 'ground' && subscriptionData.grindMethod !== null);
        
        const nextBtn = document.getElementById('step3-next');
        if (nextBtn) {
            nextBtn.disabled = !isValid;
        }
        
        return isValid;
    }
    
    // Restaurar seleção do Step 3
    function restoreStep3Selection() {
        if (subscriptionData.grindType) {
            const grindCard = document.querySelector(`[data-grind-type="${subscriptionData.grindType}"]`);
            if (grindCard) {
                grindCard.classList.add('selected');
            }
            
            const detailOptions = document.getElementById('grind-detail-options');
            
            if (subscriptionData.grindType === 'ground') {
                // Expandir sub-opções se for moído
                if (detailOptions) {
                    detailOptions.classList.add('expanded');
                }
                
                // Restaurar método se houver
                if (subscriptionData.grindMethod) {
                    const methodCard = document.querySelector(`[data-grind-method="${subscriptionData.grindMethod}"]`);
                    if (methodCard) {
                        methodCard.classList.add('selected');
                    }
                }
            } else {
                // Ocultar sub-opções se for em grãos
                if (detailOptions) {
                    detailOptions.classList.remove('expanded');
                }
            }
        }
        
        validateStep3();
    }
    
    // Event listeners para cards de tipo de moagem
    const grindCards = document.querySelectorAll('.grind-option-card');
    if (grindCards.length > 0) {
        grindCards.forEach(card => {
            card.addEventListener('click', function() {
                const type = this.dataset.grindType;
                selectGrindType(type);
            });
        });
    }
    
    // Event listeners para sub-cards de método de moagem
    const subCards = document.querySelectorAll('.grind-sub-card');
    if (subCards.length > 0) {
        subCards.forEach(card => {
            card.addEventListener('click', function() {
                const method = this.dataset.grindMethod;
                selectGrindMethod(method);
            });
        });
    }
    
    // ========================================
    // STEP 4: FREQUÊNCIA DE ENTREGA
    // ========================================
    
    // Atualizar resumo das seleções anteriores
    function updateStep4Summary() {
        // Atualizar Plano
        const planElement = document.getElementById('summary-plan');
        if (planElement && subscriptionData.plan) {
            planElement.textContent = subscriptionData.plan.toUpperCase();
        }
        
        // Atualizar Quantidade (pacotes)
        const quantityElement = document.getElementById('summary-quantity');
        if (quantityElement && subscriptionData.amount) {
            const packages = parseInt(subscriptionData.amount) / 250;
            quantityElement.textContent = `${packages} pacote(s)`;
        }
        
        // Atualizar Moagem
        const grindElement = document.getElementById('summary-grind');
        if (grindElement && subscriptionData.grindType) {
            if (subscriptionData.grindType === 'beans') {
                grindElement.textContent = 'Em grãos';
            } else if (subscriptionData.grindType === 'ground' && subscriptionData.grindMethod) {
                const methodName = {
                    'filtrado': 'Filtrado',
                    'espresso': 'Espresso',
                    'prensa': 'Prensa Francesa'
                }[subscriptionData.grindMethod] || subscriptionData.grindMethod;
                grindElement.textContent = `Moído - ${methodName}`;
            }
        }
        
        // Atualizar Peso Total
        const weightElement = document.getElementById('summary-weight');
        if (weightElement && subscriptionData.amount) {
            weightElement.textContent = `${subscriptionData.amount}g`;
        }
        
        // Atualizar preços em todos os cards de frequência
        const price = subscriptionData.price || '0,00';
        ['15', '30', '45'].forEach(freq => {
            const priceElement = document.getElementById(`price-${freq}`);
            if (priceElement) {
                priceElement.textContent = `R$ ${price}`;
            }
        });
    }
    
    // Selecionar frequência
    function selectFrequency(days) {
        const frequencyCards = document.querySelectorAll('.frequency-card');
        const nextBtn = document.getElementById('step4-next');
        
        // Remover seleções anteriores
        frequencyCards.forEach(card => card.classList.remove('selected'));
        
        // Selecionar card atual
        const selectedCard = document.querySelector(`[data-frequency="${days}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
        }
        
        // Armazenar escolha
        subscriptionData.frequency = days;
        
        // Calcular entregas por ano
        switch(days) {
            case '15':
                subscriptionData.deliveriesPerYear = 24;
                break;
            case '30':
                subscriptionData.deliveriesPerYear = 12;
                break;
            case '45':
                subscriptionData.deliveriesPerYear = 8;
                break;
            default:
                subscriptionData.deliveriesPerYear = null;
        }
        
        // Habilitar botão próximo
        if (nextBtn) nextBtn.disabled = false;
        
        console.log('Frequência selecionada:', subscriptionData);
    }
    
    // Validar Step 4
    function validateStep4() {
        const isValid = subscriptionData.frequency !== null;
        
        const nextBtn = document.getElementById('step4-next');
        if (nextBtn) {
            nextBtn.disabled = !isValid;
        }
        
        return isValid;
    }
    
    // Restaurar seleção do Step 4
    function restoreStep4Selection() {
        // Atualizar resumo
        updateStep4Summary();
        
        // Restaurar seleção de frequência se houver
        if (subscriptionData.frequency) {
            const frequencyCard = document.querySelector(`[data-frequency="${subscriptionData.frequency}"]`);
            if (frequencyCard) {
                frequencyCard.classList.add('selected');
            }
        }
        
        validateStep4();
    }
    
    // Event listeners para cards de frequência
    const frequencyCards = document.querySelectorAll('.frequency-card');
    if (frequencyCards.length > 0) {
        frequencyCards.forEach(card => {
            card.addEventListener('click', function() {
                const frequency = this.dataset.frequency;
                selectFrequency(frequency);
            });
        });
    }

    // ========================================
    // STEP 5: INFORMAÇÕES PESSOAIS E ENDEREÇO
    // ========================================

    // Extensão do subscriptionData para Step 5
    subscriptionData.personal = {
        fullName: '',
        email: '',
        cpf: '',
        phone: '',
        birthDate: ''
    };
    subscriptionData.delivery = {
        type: 'home', // ou 'pickup'
        store: null,
        zipCode: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: ''
    };
    subscriptionData.newsletter = false;

    // Formatadores de input
    function formatCPF(value) {
        value = value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 8) {
            return value.slice(0, 3) + '.' + value.slice(3, 6) + '.' + value.slice(6, 9) + '-' + value.slice(9, 11);
        } else if (value.length > 6) {
            return value.slice(0, 3) + '.' + value.slice(3, 6) + '.' + value.slice(6);
        } else if (value.length > 3) {
            return value.slice(0, 3) + '.' + value.slice(3);
        }
        return value;
    }

    function formatPhone(value) {
        value = value.replace(/\D/g, '');
        if (value.length > 11) value = value.slice(0, 11);
        if (value.length > 7) {
            return '(' + value.slice(0, 2) + ') ' + value.slice(2, 7) + '-' + value.slice(7, 11);
        } else if (value.length > 2) {
            return '(' + value.slice(0, 2) + ') ' + value.slice(2);
        }
        return value;
    }

    function formatZipCode(value) {
        value = value.replace(/\D/g, '');
        if (value.length > 8) value = value.slice(0, 8);
        if (value.length > 5) {
            return value.slice(0, 5) + '-' + value.slice(5);
        }
        return value;
    }

    // Validadores
    function validateEmail(email) {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }

    function validateCPF(cpf) {
        cpf = cpf.replace(/\D/g, '');
        if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
        
        // Validar primeiro dígito
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf[i]) * (10 - i);
        }
        let remainder = sum % 11;
        const digit1 = remainder < 2 ? 0 : 11 - remainder;
        
        // Validar segundo dígito
        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf[i]) * (11 - i);
        }
        remainder = sum % 11;
        const digit2 = remainder < 2 ? 0 : 11 - remainder;
        
        return parseInt(cpf[9]) === digit1 && parseInt(cpf[10]) === digit2;
    }

    function validatePhone(phone) {
        const regex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;
        return regex.test(phone);
    }

    function validateZipCode(zipCode) {
        const regex = /^\d{5}-\d{3}$/;
        return regex.test(zipCode);
    }

    // Buscar endereço pelo CEP (ViaCEP)
    async function fetchAddressFromZipCode(zipCode) {
        try {
            const cleanZipCode = zipCode.replace(/\D/g, '');
            const response = await fetch(`https://viacep.com.br/ws/${cleanZipCode}/json/`);
            const data = await response.json();

            if (data.erro) {
                showFieldError('zipCode', 'CEP não encontrado');
                return null;
            }

            return {
                street: data.logradouro,
                neighborhood: data.bairro,
                city: data.localidade,
                state: data.uf
            };
        } catch (error) {
            console.error('Erro ao buscar CEP:', error);
            showFieldError('zipCode', 'Erro ao buscar CEP');
            return null;
        }
    }

    // Mostrar/ocultar erro em campo
    function showFieldError(fieldName, message) {
        const field = document.getElementById(fieldName);
        const errorMsg = document.getElementById(`error-${fieldName}`);
        
        if (field) {
            if (message) {
                field.classList.add('error');
                if (errorMsg) {
                    errorMsg.textContent = message;
                    errorMsg.classList.add('show');
                }
            } else {
                field.classList.remove('error');
                if (errorMsg) {
                    errorMsg.textContent = '';
                    errorMsg.classList.remove('show');
                }
            }
        }
    }

    // Validar todos os campos do Step 5
    function validateStep5() {
        let isValid = true;

        // Validar informações pessoais
        const fullName = document.getElementById('fullName');
        if (!fullName.value.trim()) {
            showFieldError('fullName', 'Nome completo é obrigatório');
            isValid = false;
        } else if (fullName.value.trim().length < 3) {
            showFieldError('fullName', 'Nome deve ter pelo menos 3 caracteres');
            isValid = false;
        } else {
            showFieldError('fullName');
        }

        const email = document.getElementById('email');
        if (!email.value.trim()) {
            showFieldError('email', 'Email é obrigatório');
            isValid = false;
        } else if (!validateEmail(email.value.trim())) {
            showFieldError('email', 'Email inválido');
            isValid = false;
        } else {
            showFieldError('email');
        }

        const cpf = document.getElementById('cpf');
        if (!cpf.value.trim()) {
            showFieldError('cpf', 'CPF é obrigatório');
            isValid = false;
        } else if (!validateCPF(cpf.value)) {
            showFieldError('cpf', 'CPF inválido');
            isValid = false;
        } else {
            showFieldError('cpf');
        }

        const phone = document.getElementById('phone');
        if (!phone.value.trim()) {
            showFieldError('phone', 'Telefone é obrigatório');
            isValid = false;
        } else if (!validatePhone(phone.value)) {
            showFieldError('phone', 'Telefone inválido. Use: (XX) 9XXXX-XXXX');
            isValid = false;
        } else {
            showFieldError('phone');
        }

        // Validar endereço
        const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;

        if (deliveryType === 'home') {
            const zipCode = document.getElementById('zipCode');
            if (!zipCode.value.trim()) {
                showFieldError('zipCode', 'CEP é obrigatório');
                isValid = false;
            } else if (!validateZipCode(zipCode.value)) {
                showFieldError('zipCode', 'CEP inválido. Use: XXXXX-XXX');
                isValid = false;
            } else {
                showFieldError('zipCode');
            }

            const street = document.getElementById('street');
            if (!street.value.trim()) {
                showFieldError('street', 'Rua é obrigatória');
                isValid = false;
            } else {
                showFieldError('street');
            }

            const number = document.getElementById('number');
            if (!number.value.trim()) {
                showFieldError('number', 'Número é obrigatório');
                isValid = false;
            } else {
                showFieldError('number');
            }

            const neighborhood = document.getElementById('neighborhood');
            if (!neighborhood.value.trim()) {
                showFieldError('neighborhood', 'Bairro é obrigatório');
                isValid = false;
            } else {
                showFieldError('neighborhood');
            }

            const city = document.getElementById('city');
            if (!city.value.trim()) {
                showFieldError('city', 'Cidade é obrigatória');
                isValid = false;
            } else {
                showFieldError('city');
            }

            const state = document.getElementById('state');
            if (!state.value.trim()) {
                showFieldError('state', 'Estado é obrigatório');
                isValid = false;
            } else {
                showFieldError('state');
            }
        } else if (deliveryType === 'pickup') {
            const selectedStore = document.querySelector('input[name="selectedStore"]:checked');
            if (!selectedStore) {
                showFieldError('store', 'Selecione uma loja');
                isValid = false;
            } else {
                showFieldError('store');
            }
        }

        // Mostrar/ocultar aviso
        const warningMsg = document.getElementById('step5-warning');
        if (!isValid && warningMsg) {
            warningMsg.style.display = 'block';
        } else if (warningMsg) {
            warningMsg.style.display = 'none';
        }

        // Habilitar/desabilitar botão próximo
        const nextBtn = document.getElementById('step5-next');
        if (nextBtn) nextBtn.disabled = !isValid;

        return isValid;
    }

    // Event listeners para formulário do Step 5
    const cpfInput = document.getElementById('cpf');
    if (cpfInput) {
        cpfInput.addEventListener('input', function() {
            this.value = formatCPF(this.value);
            validateStep5();
        });
    }

    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            this.value = formatPhone(this.value);
            validateStep5();
        });
    }

    const zipCodeInput = document.getElementById('zipCode');
    if (zipCodeInput) {
        zipCodeInput.addEventListener('input', function() {
            this.value = formatZipCode(this.value);
        });

        // Buscar endereço ao sair do campo CEP
        zipCodeInput.addEventListener('blur', async function() {
            if (validateZipCode(this.value)) {
                const address = await fetchAddressFromZipCode(this.value);
                if (address) {
                    document.getElementById('street').value = address.street;
                    document.getElementById('neighborhood').value = address.neighborhood;
                    document.getElementById('city').value = address.city;
                    document.getElementById('state').value = address.state;
                    validateStep5();
                }
            }
        });
    }

    // Toggle entre "Receber em casa" e "Retirar na loja"
    const deliveryRadios = document.querySelectorAll('input[name="deliveryType"]');
    deliveryRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            const homeDeliveryForm = document.getElementById('home-delivery-form');
            const pickupDeliveryForm = document.getElementById('pickup-delivery-form');

            if (this.value === 'home') {
                homeDeliveryForm.classList.add('active');
                pickupDeliveryForm.classList.remove('active');
            } else {
                homeDeliveryForm.classList.remove('active');
                pickupDeliveryForm.classList.add('active');
            }

            validateStep5();
        });
    });

    // Event listeners para todos os inputs do formulário
    const formInputs = document.querySelectorAll('.form-input, .form-select, input[type="checkbox"]');
    formInputs.forEach(input => {
        input.addEventListener('change', validateStep5);
        input.addEventListener('input', validateStep5);
    });

    // Salvar dados do Step 5 ao avançar
    async function saveStep5Data() {
        subscriptionData.personal = {
            fullName: document.getElementById('fullName').value.trim(),
            email: document.getElementById('email').value.trim(),
            cpf: document.getElementById('cpf').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            birthDate: document.getElementById('birthDate').value
        };

        const deliveryType = document.querySelector('input[name="deliveryType"]:checked').value;
        
        if (deliveryType === 'home') {
            subscriptionData.delivery = {
                type: 'home',
                store: null,
                zipCode: document.getElementById('zipCode').value.trim(),
                street: document.getElementById('street').value.trim(),
                number: document.getElementById('number').value.trim(),
                complement: document.getElementById('complement').value.trim(),
                neighborhood: document.getElementById('neighborhood').value.trim(),
                city: document.getElementById('city').value.trim(),
                state: document.getElementById('state').value.trim()
            };
        } else {
            subscriptionData.delivery = {
                type: 'pickup',
                store: document.querySelector('input[name="selectedStore"]:checked').value,
                zipCode: '',
                street: '',
                number: '',
                complement: '',
                neighborhood: '',
                city: '',
                state: ''
            };
        }

        subscriptionData.newsletter = document.getElementById('newsletter').checked;

        console.log('💾 Dados do Step 5 salvos localmente:', subscriptionData);

        // Dados salvos localmente — o envio para a API Yampi acontece
        // no Step 6 ao clicar "Finalizar Assinatura" (backend-integration.js)
        return true;
    }

    // Sobrescrever função nextStep para salvar dados do Step 5
    const originalNextStep = window.nextStep;
    window.nextStep = async function() {
        if (currentStep === 5) {
            if (validateStep5()) {
                const saved = saveStep5Data();
                if (saved) {
                    originalNextStep();
                    // Atualizar resumo de compra ao entrar no Step 6
                    if (typeof window.updatePaymentSummary === 'function') {
                        setTimeout(() => window.updatePaymentSummary(), 350);
                    }
                }
            }
        } else {
            originalNextStep();
        }
    };

    // Validação inicial do Step 5
    if (document.getElementById('fullName')) {
        validateStep5();
    }
});

// ========================================
// STEP 6 - PAGAMENTO (lógica em backend-integration.js)
// ========================================

// Left sidebar: open/close when menu button or overlay/close is used
(function () {
    const menuBtn = document.getElementById('menu');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = sidebar && sidebar.querySelector('.sidebar-close');

    function openSidebar() {
        if (!overlay || !sidebar) return;
        overlay.classList.add('is-open');
        sidebar.classList.add('is-open');
        overlay.setAttribute('aria-hidden', 'false');
        sidebar.setAttribute('aria-hidden', 'false');
    }

    function closeSidebar() {
        if (!overlay || !sidebar) return;
        overlay.classList.remove('is-open');
        sidebar.classList.remove('is-open');
        overlay.setAttribute('aria-hidden', 'true');
        sidebar.setAttribute('aria-hidden', 'true');
    }

    if (menuBtn) {
        menuBtn.addEventListener('click', openSidebar);
    }
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }
})();

const videoElement = document.getElementById('bg-video');

// Garante loop perfeito para vídeos que apresentam gap ao terminar.
// Aplica um pequeno deslocamento (epsilon) antes/reinício para evitar frame preto.
if (videoElement) {
    const src = (videoElement.currentSrc || (videoElement.querySelector('source') && videoElement.querySelector('source').src) || '').toLowerCase();

    // Função genérica que cria um loop suave usando 'timeupdate'
    const enablePerfectLoop = (epsilon = 0.06, startOffset = 0.02) => {
        // Desativa o loop nativo para controlar manualmente
        videoElement.removeAttribute('loop');

        const onTimeUpdate = function() {
            if (!this.duration || this.duration === Infinity) return;
            if (this.currentTime >= this.duration - epsilon) {
                // Avança para um pequeno offset no início e continua
                this.currentTime = startOffset;
                this.play();
            }
        };

        videoElement.addEventListener('timeupdate', onTimeUpdate);
    };

    // Aplica apenas quando for o(s) arquivo(s) que precisam do ajuste
    if (src.includes('videobg.mp4') || src.includes('coffee-bg-.mp4') || src.includes('coffee-bg-')) {
        // Espera metadata para conhecer a duração
        if (videoElement.readyState >= 1) {
            enablePerfectLoop();
        } else {
            videoElement.addEventListener('loadedmetadata', () => enablePerfectLoop());
        }
    } else {
        // Fallback: manter o comportamento simples de repetir
        videoElement.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play();
        });
    }
}
const sections = document.querySelectorAll("section");

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visivel");
        }
    });
}, { threshold: 0.2 });

sections.forEach(section => observer.observe(section));
window.addEventListener("load", () => {
    const track = document.getElementById('track');
    if (!track) return;
    const originalImages = Array.from(track.children);
    
    // 1. Define uma velocidade constante (Ex: 100 pixels por segundo)
    const pixelsPerSecond = 50;
  
    const setup = () => {
      // Garante cobertura da tela
      while (track.scrollWidth < window.innerWidth) {
        originalImages.forEach(img => track.appendChild(img.cloneNode(true)));
      }
      
      // Duplica para o loop perfeito
      const currentContent = Array.from(track.children);
      currentContent.forEach(img => track.appendChild(img.cloneNode(true)));
  
      // 2. CALCULA A DURACÃO DINÂMICA
      // Distância a percorrer é 50% do scrollWidth total
      const distanceToScroll = track.scrollWidth / 2;
      const dynamicDuration = distanceToScroll / pixelsPerSecond;
  
      // Aplica o tempo calculado diretamente no elemento
      track.style.animationDuration = `${dynamicDuration}s`;
    };
  
    setup();
  });

/* Marquee captions: delegação para suportar imagens clonadas no loop */
(function() {
    const track = document.getElementById('track');
    let captionBox = document.getElementById('marquee-caption');

    if (!captionBox) {
        const marqueeContainer = document.querySelector('.marquee-container');
        if (marqueeContainer) {
            captionBox = document.createElement('div');
            captionBox.id = 'marquee-caption';
            captionBox.className = 'marquee-caption';
            captionBox.setAttribute('aria-live', 'polite');
            marqueeContainer.parentNode.insertBefore(captionBox, marqueeContainer.nextSibling);
        }
    }

    if (!track || !captionBox) return;

    let hideTimeout = null;

    function showCaption(text) {
        captionBox.textContent = text || '';
        if (!text) { captionBox.classList.remove('visible'); return; }
        captionBox.classList.add('visible');
        if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; }
    }

    function hideCaptionDelayed() {
        if (hideTimeout) clearTimeout(hideTimeout);
        hideTimeout = setTimeout(()=> captionBox.classList.remove('visible'), 300);
    }

    // Delegação: funciona para imagens originais e clones
    track.addEventListener('mouseover', (e) => {
        const img = e.target.closest('img');
        if (!img || !track.contains(img)) return;
        const caption = img.getAttribute('data-caption') || img.alt || '';
        showCaption(caption);
    });

    track.addEventListener('mouseout', (e) => {
        const fromImg = e.target.closest('img');
        if (!fromImg) return;
        const related = e.relatedTarget;
        if (related && (fromImg === related || fromImg.contains(related))) return;
        hideCaptionDelayed();
    });

// =====================
// Google Maps + Carousel
// =====================

// Coordenadas aproximadas da loja (Av. Pedroso de Morais, 213 - Pinheiros)
const SHOP_LAT = -23.5675;
const SHOP_LNG = -46.6910;

function initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    try {
        const center = { lat: SHOP_LAT, lng: SHOP_LNG };
        const map = new google.maps.Map(mapEl, {
            center: center,
            zoom: 16,
            gestureHandling: 'cooperative'
        });

        const marker = new google.maps.Marker({
            position: center,
            map: map,
            title: 'Mula Coffee - Pinheiros',
            // icon: 'assets/png/marker.png' // opcional
        });

        const infoContent = '<div style="font-family: Montserrat, sans-serif"><strong>Mula Coffee</strong><br>Av. Pedroso de Morais, 213<br><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps/dir/?api=1&destination=' + SHOP_LAT + ',' + SHOP_LNG + '">Ver rotas</a></div>';
        const infoWindow = new google.maps.InfoWindow({ content: infoContent });
        marker.addListener('click', () => infoWindow.open(map, marker));

        const directionsBtn = document.getElementById('directions-btn');
        if (directionsBtn) directionsBtn.href = 'https://www.google.com/maps/dir/?api=1&destination=' + SHOP_LAT + ',' + SHOP_LNG;

    } catch (e) {
        // Se algo falhar ao inicializar a API, usa fallback
        console.warn('Erro ao inicializar Google Maps API:', e);
        loadMapFallback();
    }
}

function loadMapFallback() {
    const mapEl = document.getElementById('map');
    const fallback = document.getElementById('map-fallback');
    const iframe = document.getElementById('map-iframe');
    if (!fallback || !iframe || !mapEl) return;

    // Esconde o container de API e mostra o iframe embed com a busca por endereço
    mapEl.style.display = 'none';
    const q = encodeURIComponent('Av. Pedroso de Morais 213, Pinheiros, São Paulo, SP');
    iframe.src = 'https://www.google.com/maps?q=' + q + '&output=embed';
    fallback.style.display = 'block';

    const directionsBtn = document.getElementById('directions-btn');
    if (directionsBtn) directionsBtn.href = 'https://www.google.com/maps/dir/?api=1&destination=' + SHOP_LAT + ',' + SHOP_LNG;
}

// Se a API não carregar em 5s, usa fallback
setTimeout(() => {
    if (typeof google === 'undefined' || !document.getElementById('map')) {
        loadMapFallback();
    }
}, 5000);

// Carousel simples
function setupCarousel() {
    const track = document.querySelector('.carousel-track');
    if (!track) return;
    const slides = Array.from(track.querySelectorAll('.carousel-slide'));
    const prevBtn = document.querySelector('.carousel-prev');
    const nextBtn = document.querySelector('.carousel-next');
    let current = 0;
    let autoplayId = null;

    function show(index) {
        slides.forEach((s, i) => s.classList.toggle('active', i === index));
        current = index;
    }

    function prev() { show((current - 1 + slides.length) % slides.length); }
    function next() { show((current + 1) % slides.length); }

    if (prevBtn) prevBtn.addEventListener('click', prev);
    if (nextBtn) nextBtn.addEventListener('click', next);

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') prev();
        if (e.key === 'ArrowRight') next();
    });

    // Autoplay
    if (slides.length > 1) {
        autoplayId = setInterval(next, 5000);
        // Pause on hover
        track.addEventListener('mouseenter', () => clearInterval(autoplayId));
        track.addEventListener('mouseleave', () => { autoplayId = setInterval(next, 5000); });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setupCarousel();
});

    track.addEventListener('focusin', (e) => {
        const img = e.target.closest('img');
        if (!img || !track.contains(img)) return;
        showCaption(img.getAttribute('data-caption') || img.alt || '');
    });
    track.addEventListener('focusout', hideCaptionDelayed);

    track.addEventListener('click', (e) => {
        const img = e.target.closest('img');
        if (!img || !track.contains(img)) return;
        const caption = img.getAttribute('data-caption') || img.alt || '';
        if (captionBox.classList.contains('visible') && captionBox.textContent === caption) captionBox.classList.remove('visible');
        else showCaption(caption);
    });

    // Fecha ao clicar fora
    document.addEventListener('click', (e)=> {
        if (!captionBox.contains(e.target) && !track.contains(e.target)) {
            captionBox.classList.remove('visible');
        }
    });
})();

