// =============================================
// SISTEMA COMPLETO DE GESTÃO DE FUNCIONÁRIOS
// WMOLDES - MANUTENÇÃO CORRETIVA
// =============================================

// CONFIGURAÇÕES GLOBAIS E CONSTANTES
const CONFIG = {
    SENHA_ADMIN: "admin123", // Senha padrão do administrador - PODE SER ALTERADA
    MESES: {
        'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4, 'MAIO': 5, 'JUNHO': 6,
        'JULHO': 7, 'AGOSTO': 8, 'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
    },
    TURNOS: ['Manhã', 'Tarde', 'Noite'],
    FUNCOES: ['Lider', 'Ajustador', 'Ajustador/Soldador', 'Polidor', 'Carregador/Foscador', 'Vertech'],
    TURMAS: ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4', 'Diaria']
};

// ESTADO GLOBAL DA APLICAÇÃO
const APP_STATE = {
    isAdmin: false,
    funcionarios: {},
    filtros: {
        turno: 'todos',
        funcao: 'todos',
        turma: 'todos',
        ferias: 'todos',
        busca: ''
    },
    funcionarioEditando: null,
    estatisticas: {
        total: 0,
        feriasMesAtual: 0,
        proximasFerias: 0,
        feriasAtrasadas: 0,
        porTurno: { Manhã: 0, Tarde: 0, Noite: 0 }
    }
};

// =============================================
// FUNÇÕES DE INICIALIZAÇÃO E FIREBASE
// =============================================

/**
 * Inicializa a aplicação quando o DOM estiver carregado
 */
function inicializarAplicacao() {
    console.log('🚀 Inicializando Sistema de Gestão de Funcionários WMOLDES...');
    
    // Verificar se Firebase está disponível
    if (!window.firebaseDatabase) {
        console.error('❌ Firebase não foi carregado corretamente');
        mostrarErro('Erro de conexão com o banco de dados. Recarregue a página.');
        return;
    }
    
    configurarEventListeners();
    carregarDadosFirebase();
    atualizarInterface();
    
    console.log('✅ Sistema inicializado com sucesso!');
}

/**
 * Configura todos os event listeners da aplicação
 */
function configurarEventListeners() {
    // Fechar modais ao clicar fora
    document.addEventListener('click', (event) => {
        const modalLogin = document.getElementById('admin-login-modal');
        const modalFuncionario = document.getElementById('funcionario-modal');
        
        if (event.target === modalLogin) fecharModalLogin();
        if (event.target === modalFuncionario) fecharModalFuncionario();
        
        // Fechar zoom ao clicar fora do card
        const zoomedCard = document.querySelector('.card.zoomed');
        if (zoomedCard && !zoomedCard.contains(event.target)) {
            fecharZoomCard();
        }
    });
    
    // Teclas de atalho
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            fecharModalLogin();
            fecharModalFuncionario();
            fecharZoomCard();
        }
        
        // Navegação com teclado (setas)
        if (event.key === 'ArrowLeft') scrollCarousel('left');
        if (event.key === 'ArrowRight') scrollCarousel('right');
        
        // Atalho para busca (Ctrl + F)
        if (event.ctrlKey && event.key === 'f') {
            event.preventDefault();
            document.getElementById('searchInput').focus();
        }
    });
    
    // Enter no campo de senha do admin
    document.getElementById('admin-password')?.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') verificarSenhaAdmin();
    });
    
    console.log('✅ Event listeners configurados');
}

/**
 * Carrega dados do Firebase em tempo real
 */
function carregarDadosFirebase() {
    try {
        const funcionariosRef = window.firebaseRef(window.firebaseDatabase, 'funcionarios');
        
        window.firebaseOnValue(funcionariosRef, (snapshot) => {
            const data = snapshot.val();
            APP_STATE.funcionarios = data || {};
            console.log(`📊 Dados carregados: ${Object.keys(APP_STATE.funcionarios).length} funcionários`);
            
            calcularEstatisticas();
            renderizarInterface();
            atualizarDashboardStats();
        }, (error) => {
            console.error('❌ Erro ao carregar dados do Firebase:', error);
            mostrarErro('Erro ao carregar dados. Verifique sua conexão.');
        });
        
    } catch (error) {
        console.error('❌ Erro na configuração do Firebase:', error);
        mostrarErro('Erro de configuração do banco de dados.');
    }
}

// =============================================
// FUNÇÕES DE AUTENTICAÇÃO ADMIN
// =============================================

/**
 * Abre o modal de login administrativo
 */
function abrirModalLogin() {
    document.getElementById('admin-login-modal').style.display = 'block';
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-password').focus();
    document.getElementById('login-error').textContent = '';
}

/**
 * Fecha o modal de login administrativo
 */
function fecharModalLogin() {
    document.getElementById('admin-login-modal').style.display = 'none';
}

/**
 * Verifica a senha do administrador
 */
function verificarSenhaAdmin() {
    const senha = document.getElementById('admin-password').value;
    const errorElement = document.getElementById('login-error');
    
    if (!senha) {
        errorElement.textContent = '⚠️ Por favor, digite a senha.';
        return;
    }
    
    if (senha === CONFIG.SENHA_ADMIN) {
        APP_STATE.isAdmin = true;
        fecharModalLogin();
        ativarModoAdmin();
        mostrarSucesso('🔓 Acesso administrativo concedido!');
    } else {
        errorElement.textContent = '❌ Senha incorreta. Tente novamente.';
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-password').focus();
    }
}

/**
 * Ativa o modo administrativo na interface
 */
function ativarModoAdmin() {
    document.getElementById('admin-controls').style.display = 'flex';
    document.getElementById('admin-access').style.display = 'none';
    
    // Adicionar botões de edição nos cards existentes
    document.querySelectorAll('.card').forEach(card => {
        if (!card.querySelector('.action-btn.editar')) {
            const btnEditar = document.createElement('button');
            btnEditar.className = 'action-btn editar';
            btnEditar.textContent = '✏️ Editar';
            btnEditar.onclick = (e) => {
                e.stopPropagation();
                const funcionarioId = card.getAttribute('data-id');
                editarFuncionario(funcionarioId);
            };
            card.querySelector('.card-actions').appendChild(btnEditar);
        }
    });
    
    console.log('🔓 Modo administrativo ativado');
}

/**
 * Desativa o modo administrativo
 */
function sairModoAdmin() {
    APP_STATE.isAdmin = false;
    document.getElementById('admin-controls').style.display = 'none';
    document.getElementById('admin-access').style.display = 'block';
    
    // Remover botões de edição dos cards
    document.querySelectorAll('.action-btn.editar').forEach(btn => btn.remove());
    
    mostrarSucesso('🚪 Modo administrativo desativado.');
}

// =============================================
// FUNÇÕES DE GERENCIAMENTO DE FUNCIONÁRIOS
// =============================================

/**
 * Abre modal para adicionar novo funcionário
 */
function abrirModalNovoFuncionario() {
    if (!APP_STATE.isAdmin) {
        mostrarErro('⚠️ Acesso negado. Faça login como administrador.');
        return;
    }
    
    APP_STATE.funcionarioEditando = null;
    document.getElementById('modal-title').textContent = '📝 Adicionar Novo Funcionário';
    document.getElementById('salvar-funcionario').textContent = '💾 Salvar Funcionário';
    document.getElementById('excluir-funcionario').style.display = 'none';
    
    // Limpar formulário
    document.getElementById('edit-nome').value = '';
    document.getElementById('edit-drt').value = '';
    document.getElementById('edit-funcao').value = '';
    document.getElementById('edit-turno').value = '';
    document.getElementById('edit-turma').value = '';
    document.getElementById('edit-ferias').value = '';
    document.getElementById('edit-telefone').value = '';
    document.getElementById('edit-admissao').value = '';
    document.getElementById('edit-foto').value = '';
    
    document.getElementById('funcionario-modal').style.display = 'block';
}

/**
 * Abre modal para editar funcionário existente
 */
function editarFuncionario(funcionarioId) {
    if (!APP_STATE.isAdmin) {
        mostrarErro('⚠️ Acesso negado. Faça login como administrador.');
        return;
    }
    
    const funcionario = APP_STATE.funcionarios[funcionarioId];
    if (!funcionario) {
        mostrarErro('❌ Funcionário não encontrado.');
        return;
    }
    
    APP_STATE.funcionarioEditando = funcionarioId;
    document.getElementById('modal-title').textContent = '✏️ Editar Funcionário';
    document.getElementById('salvar-funcionario').textContent = '💾 Atualizar Funcionário';
    document.getElementById('excluir-funcionario').style.display = 'inline-block';
    
    // Preencher formulário com dados existentes
    document.getElementById('edit-nome').value = funcionario.nome || '';
    document.getElementById('edit-drt').value = funcionario.drt || '';
    document.getElementById('edit-funcao').value = funcionario.funcao || '';
    document.getElementById('edit-turno').value = funcionario.turno || '';
    document.getElementById('edit-turma').value = funcionario.turma || '';
    document.getElementById('edit-ferias').value = funcionario.ferias || '';
    document.getElementById('edit-telefone').value = funcionario.telefone || '';
    document.getElementById('edit-admissao').value = funcionario.admissao || '';
    document.getElementById('edit-foto').value = funcionario.foto || '';
    
    document.getElementById('funcionario-modal').style.display = 'block';
}

/**
 * Fecha o modal de funcionário
 */
function fecharModalFuncionario() {
    document.getElementById('funcionario-modal').style.display = 'none';
    APP_STATE.funcionarioEditando = null;
}

/**
 * Salva ou atualiza um funcionário no Firebase
 */
function salvarFuncionario() {
    if (!APP_STATE.isAdmin) {
        mostrarErro('⚠️ Acesso negado. Faça login como administrador.');
        return;
    }
    
    // Validar campos obrigatórios
    const dados = obterDadosFormulario();
    if (!dados) return;
    
    try {
        if (APP_STATE.funcionarioEditando) {
            // Atualizar funcionário existente
            atualizarFuncionarioFirebase(APP_STATE.funcionarioEditando, dados);
        } else {
            // Adicionar novo funcionário
            adicionarFuncionarioFirebase(dados);
        }
        
        fecharModalFuncionario();
        mostrarSucesso(APP_STATE.funcionarioEditando ? 
            '✅ Funcionário atualizado com sucesso!' : 
            '✅ Funcionário adicionado com sucesso!');
            
    } catch (error) {
        console.error('❌ Erro ao salvar funcionário:', error);
        mostrarErro('❌ Erro ao salvar funcionário. Tente novamente.');
    }
}

/**
 * Obtém e valida dados do formulário
 */
function obterDadosFormulario() {
    const nome = document.getElementById('edit-nome').value.trim();
    const drt = document.getElementById('edit-drt').value.trim();
    const funcao = document.getElementById('edit-funcao').value;
    const turno = document.getElementById('edit-turno').value;
    const turma = document.getElementById('edit-turma').value;
    const ferias = document.getElementById('edit-ferias').value;
    const telefone = document.getElementById('edit-telefone').value.trim();
    const admissao = document.getElementById('edit-admissao').value;
    const foto = document.getElementById('edit-foto').value.trim();
    
    // Validações
    if (!nome) { mostrarErroModal('⚠️ O nome é obrigatório.'); return null; }
    if (!drt) { mostrarErroModal('⚠️ A DRT é obrigatória.'); return null; }
    if (!funcao) { mostrarErroModal('⚠️ A função é obrigatória.'); return null; }
    if (!turno) { mostrarErroModal('⚠️ O turno é obrigatório.'); return null; }
    if (!turma) { mostrarErroModal('⚠️ A turma é obrigatória.'); return null; }
    if (!telefone) { mostrarErroModal('⚠️ O telefone é obrigatório.'); return null; }
    
    // Verificar se DRT já existe (apenas para novos funcionários)
    if (!APP_STATE.funcionarioEditando) {
        const drtExistente = Object.values(APP_STATE.funcionarios).find(f => f.drt === drt);
        if (drtExistente) {
            mostrarErroModal('❌ Já existe um funcionário com esta DRT.');
            return null;
        }
    }
    
    return {
        nome,
        drt,
        funcao,
        turno,
        turma,
        ferias: ferias || 'Não informado',
        telefone,
        admissao: admissao || 'Não informado',
        foto: foto || 'https://via.placeholder.com/300x120/2d3748/4a5568?text=Sem+Foto',
        dataCriacao: new Date().toISOString(),
        dataAtualizacao: new Date().toISOString()
    };
}

/**
 * Adiciona novo funcionário ao Firebase
 */
async function adicionarFuncionarioFirebase(dados) {
    const funcionariosRef = window.firebaseRef(window.firebaseDatabase, 'funcionarios');
    await window.firebasePush(funcionariosRef, dados);
}

/**
 * Atualiza funcionário existente no Firebase
 */
async function atualizarFuncionarioFirebase(funcionarioId, dados) {
    const funcionarioRef = window.firebaseRef(window.firebaseDatabase, `funcionarios/${funcionarioId}`);
    dados.dataAtualizacao = new Date().toISOString();
    await window.firebaseUpdate(funcionarioRef, dados);
}

/**
 * Exclui um funcionário do Firebase
 */
async function excluirFuncionario() {
    if (!APP_STATE.isAdmin || !APP_STATE.funcionarioEditando) {
        mostrarErro('⚠️ Acesso negado ou funcionário não selecionado.');
        return;
    }
    
    const confirmacao = confirm('⚠️ Tem certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita.');
    if (!confirmacao) return;
    
    try {
        const funcionarioRef = window.firebaseRef(window.firebaseDatabase, `funcionarios/${APP_STATE.funcionarioEditando}`);
        await window.firebaseRemove(funcionarioRef);
        
        fecharModalFuncionario();
        mostrarSucesso('✅ Funcionário excluído com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro ao excluir funcionário:', error);
        mostrarErro('❌ Erro ao excluir funcionário. Tente novamente.');
    }
}

// =============================================
// FUNÇÕES DE INTERFACE E RENDERIZAÇÃO
// =============================================

/**
 * Renderiza toda a interface baseada nos dados
 */
function renderizarInterface() {
    renderizarSecoesFerias();
    renderizarTurnos();
    aplicarFiltros();
}

/**
 * Renderiza as seções de férias
 */
function renderizarSecoesFerias() {
    renderizarProximasFerias();
    renderizarFeriasMesAtual();
}

/**
 * Renderiza cards de próximas férias
 */
function renderizarProximasFerias() {
    const container = document.getElementById('proximas-ferias-container');
    const funcionariosProximosFerias = Object.entries(APP_STATE.funcionarios)
        .filter(([_, func]) => isProximaFerias(func.ferias))
        .slice(0, 10); // Limitar a 10 cards
    
    container.innerHTML = funcionariosProximosFerias.length > 0 ? 
        funcionariosProximosFerias.map(([id, func]) => criarCardFuncionario(id, func, true)).join('') :
        '<div class="no-data">Nenhuma férias próxima encontrada.</div>';
}

/**
 * Renderiza cards de férias do mês atual
 */
function renderizarFeriasMesAtual() {
    const container = document.getElementById('ferias-mes-container');
    const funcionariosFeriasAtual = Object.entries(APP_STATE.funcionarios)
        .filter(([_, func]) => isFeriasMesAtual(func.ferias));
    
    container.innerHTML = funcionariosFeriasAtual.length > 0 ? 
        funcionariosFeriasAtual.map(([id, func]) => criarCardFuncionario(id, func, true)).join('') :
        '<div class="no-data">Nenhum funcionário de férias este mês.</div>';
}

/**
 * Renderiza os turnos com seus funcionários
 */
function renderizarTurnos() {
    const container = document.getElementById('turnos-container');
    
    const html = CONFIG.TURNOS.map(turno => {
        const funcionariosTurno = Object.entries(APP_STATE.funcionarios)
            .filter(([_, func]) => func.turno === turno);
        
        const countFerias = funcionariosTurno.filter(([_, func]) => 
            isFeriasMesAtual(func.ferias)
        ).length;
        
        return `
            <div class="turno-section" data-turno="${turno}">
                <div class="turno-header">
                    <h3 class="turno-title">${obterIconeTurno(turno)} ${turno}</h3>
                    <div class="turno-stats">
                        <span class="turno-count">${funcionariosTurno.length} funcionários</span>
                        <span class="turno-ferias">${countFerias} de férias</span>
                    </div>
                </div>
                <div class="cards-container" id="cards-${turno}">
                    ${funcionariosTurno.map(([id, func]) => criarCardFuncionario(id, func)).join('')}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
    
    // Adicionar botões de edição se estiver no modo admin
    if (APP_STATE.isAdmin) {
        document.querySelectorAll('.card').forEach(card => {
            if (!card.querySelector('.action-btn.editar')) {
                const btnEditar = document.createElement('button');
                btnEditar.className = 'action-btn editar';
                btnEditar.textContent = '✏️ Editar';
                btnEditar.onclick = (e) => {
                    e.stopPropagation();
                    const funcionarioId = card.getAttribute('data-id');
                    editarFuncionario(funcionarioId);
                };
                card.querySelector('.card-actions').appendChild(btnEditar);
            }
        });
    }
}

/**
 * Cria o HTML de um card de funcionário
 */
function criarCardFuncionario(id, funcionario, isCompact = false) {
    const statusFerias = getStatusFerias(funcionario.ferias);
    const badge = statusFerias.badge ? `<div class="card-badge ${statusFerias.badge}">${statusFerias.text}</div>` : '';
    
    return `
        <div class="card" data-id="${id}" data-turno="${funcionario.turno}" data-funcao="${funcionario.funcao}" data-turma="${funcionario.turma}" data-ferias="${funcionario.ferias}" onclick="toggleZoom(this)">
            ${badge}
            <img src="${funcionario.foto}" alt="Foto de ${funcionario.nome}" onerror="this.src='https://via.placeholder.com/300x120/2d3748/4a5568?text=Sem+Foto'">
            <h2 class="nome">${funcionario.nome}</h2>
            <p class="id"><span class="info-label">DRT:</span> ${funcionario.drt}</p>
            <p class="cargo"><span class="info-label">Função:</span> ${funcionario.funcao}</p>
            <p class="Turma"><span class="info-label">Turma:</span> ${funcionario.turma}</p>
            <p class="ferias"><span class="info-label">Férias:</span> <span class="ferias-status ${statusFerias.class}">${funcionario.ferias}</span></p>
            <p class="Telefone"><span class="info-label">Telefone:</span> ${funcionario.telefone}</p>
            <p class="Start"><span class="info-label">Admissão:</span> ${funcionario.admissao}</p>
            <div class="card-actions">
                <button class="action-btn whatsapp" onclick="event.stopPropagation(); abrirWhatsApp('${funcionario.telefone}')">📞 WhatsApp</button>
                <button class="action-btn detalhes" onclick="event.stopPropagation(); mostrarDetalhesFuncionario('${id}')">📋 Detalhes</button>
                ${APP_STATE.isAdmin ? `<button class="action-btn editar" onclick="event.stopPropagation(); editarFuncionario('${id}')">✏️ Editar</button>` : ''}
            </div>
            ${!isCompact ? `<img class="additional-img" src="${funcionario.foto}" alt="Documento adicional">` : ''}
        </div>
    `;
}

// =============================================
// FUNÇÕES DE FILTRO E BUSCA
// =============================================

/**
 * Aplica todos os filtros ativos
 */
function aplicarFiltros() {
    const busca = document.getElementById('searchInput').value.toLowerCase();
    const turno = document.getElementById('filter-turno').value;
    const funcao = document.getElementById('filter-funcao').value;
    const turma = document.getElementById('filter-turma').value;
    const ferias = document.getElementById('filter-ferias').value;
    
    // Atualizar estado dos filtros
    APP_STATE.filtros = { busca, turno, funcao, turma, ferias };
    
    // Aplicar filtros em todos os cards
    document.querySelectorAll('.card').forEach(card => {
        const cardTurno = card.getAttribute('data-turno');
        const cardFuncao = card.getAttribute('data-funcao');
        const cardTurma = card.getAttribute('data-turma');
        const cardFerias = card.getAttribute('data-ferias');
        const cardTexto = card.textContent.toLowerCase();
        
        const matchBusca = !busca || cardTexto.includes(busca);
        const matchTurno = turno === 'todos' || cardTurno === turno;
        const matchFuncao = funcao === 'todos' || cardFuncao === funcao;
        const matchTurma = turma === 'todos' || cardTurma === turma;
        const matchFerias = aplicarFiltroFerias(ferias, cardFerias);
        
        const shouldShow = matchBusca && matchTurno && matchFuncao && matchTurma && matchFerias;
        card.style.display = shouldShow ? 'block' : 'none';
    });
    
    // Atualizar contadores dos turnos
    atualizarContadoresTurnos();
}

/**
 * Aplica filtro específico para férias
 */
function aplicarFiltroFerias(filtro, feriasFuncionario) {
    switch (filtro) {
        case 'todos': return true;
        case 'feriados': return isFeriasMesAtual(feriasFuncionario);
        case 'proximos': return isProximaFerias(feriasFuncionario);
        case 'atrasadas': return isFeriasAtrasada(feriasFuncionario);
        case 'este-mes': return isFeriasMesAtual(feriasFuncionario);
        case 'nao-informado': return feriasFuncionario === 'Não informado';
        default: return true;
    }
}

/**
 * Reseta todos os filtros para valores padrão
 */
function resetarFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filter-turno').value = 'todos';
    document.getElementById('filter-funcao').value = 'todos';
    document.getElementById('filter-turma').value = 'todos';
    document.getElementById('filter-ferias').value = 'todos';
    
    aplicarFiltros();
    mostrarSucesso('🔄 Filtros resetados com sucesso!');
}

/**
 * Atualiza contadores de funcionários por turno após filtragem
 */
function atualizarContadoresTurnos() {
    CONFIG.TURNOS.forEach(turno => {
        const cardsVisiveis = document.querySelectorAll(`.card[data-turno="${turno}"]:not([style*="display: none"])`);
        const countElement = document.querySelector(`[data-turno="${turno}"] .turno-count`);
        if (countElement) {
            countElement.textContent = `${cardsVisiveis.length} funcionários`;
        }
    });
}

// =============================================
// FUNÇÕES DE CÁLCULO E ESTATÍSTICAS
// =============================================

/**
 * Calcula todas as estatísticas do sistema
 */
function calcularEstatisticas() {
    const funcionarios = Object.values(APP_STATE.funcionarios);
    
    APP_STATE.estatisticas = {
        total: funcionarios.length,
        feriasMesAtual: funcionarios.filter(f => isFeriasMesAtual(f.ferias)).length,
        proximasFerias: funcionarios.filter(f => isProximaFerias(f.ferias)).length,
        feriasAtrasadas: funcionarios.filter(f => isFeriasAtrasada(f.ferias)).length,
        porTurno: {
            Manhã: funcionarios.filter(f => f.turno === 'Manhã').length,
            Tarde: funcionarios.filter(f => f.turno === 'Tarde').length,
            Noite: funcionarios.filter(f => f.turno === 'Noite').length
        }
    };
}

/**
 * Atualiza o dashboard de estatísticas
 */
function atualizarDashboardStats() {
    const stats = APP_STATE.estatisticas;
    
    document.getElementById('total-funcionarios').textContent = stats.total;
    document.getElementById('ferias-mes-atual').textContent = stats.feriasMesAtual;
    document.getElementById('proximas-ferias').textContent = stats.proximasFerias;
    document.getElementById('ferias-atrasadas').textContent = stats.feriasAtrasadas;
    document.getElementById('total-manha').textContent = stats.porTurno.Manhã;
    document.getElementById('total-tarde').textContent = stats.porTurno.Tarde;
    document.getElementById('total-noite').textContent = stats.porTurno.Noite;
}

// =============================================
// FUNÇÕES AUXILIARES E UTILITÁRIAS
// =============================================

/**
 * Verifica se as férias são do mês atual
 */
function isFeriasMesAtual(ferias) {
    if (!ferias || ferias === 'Não informado') return false;
    
    const [mesStr, anoStr] = ferias.split('/');
    const mes = CONFIG.MESES[mesStr.toUpperCase()];
    const ano = parseInt(anoStr);
    
    if (!mes || !ano) return false;
    
    const agora = new Date();
    return mes === agora.getMonth() + 1 && ano === agora.getFullYear();
}

/**
 * Verifica se as férias são próximas (próximos 60 dias)
 */
function isProximaFerias(ferias) {
    if (!ferias || ferias === 'Não informado') return false;
    
    const [mesStr, anoStr] = ferias.split('/');
    const mes = CONFIG.MESES[mesStr.toUpperCase()];
    const ano = parseInt(anoStr);
    
    if (!mes || !ano) return false;
    
    const agora = new Date();
    const dataFerias = new Date(ano, mes - 1, 1);
    const diffTempo = dataFerias.getTime() - agora.getTime();
    const diffDias = diffTempo / (1000 * 3600 * 24);
    
    return diffDias > 0 && diffDias <= 60;
}

/**
 * Verifica se as férias estão atrasadas
 */
function isFeriasAtrasada(ferias) {
    if (!ferias || ferias === 'Não informado') return false;
    
    const [mesStr, anoStr] = ferias.split('/');
    const mes = CONFIG.MESES[mesStr.toUpperCase()];
    const ano = parseInt(anoStr);
    
    if (!mes || !ano) return false;
    
    const agora = new Date();
    const dataFerias = new Date(ano, mes - 1, 1);
    return dataFerias < agora;
}

/**
 * Obtém o status das férias para estilização
 */
function getStatusFerias(ferias) {
    if (!ferias || ferias === 'Não informado') {
        return { class: '', badge: '', text: '' };
    }
    
    if (isFeriasMesAtual(ferias)) {
        return { class: 'ferias-atual', badge: 'ferias-atual', text: 'Férias' };
    }
    if (isProximaFerias(ferias)) {
        return { class: 'ferias-proximas', badge: 'ferias-proximas', text: 'Próxima' };
    }
    if (isFeriasAtrasada(ferias)) {
        return { class: 'ferias-atrasadas', badge: 'ferias-atrasadas', text: 'Atrasada' };
    }
    
    return { class: '', badge: '', text: '' };
}

/**
 * Obtém ícone correspondente ao turno
 */
function obterIconeTurno(turno) {
    const icones = {
        'Manhã': '🌅',
        'Tarde': '🌇', 
        'Noite': '🌃'
    };
    return icones[turno] || '👤';
}

/**
 * Abre WhatsApp com o número do funcionário
 */
function abrirWhatsApp(telefone) {
    const numero = telefone.replace(/\D/g, '');
    const url = `https://wa.me/55${numero}`;
    window.open(url, '_blank');
}

/**
 * Mostra detalhes completos do funcionário
 */
function mostrarDetalhesFuncionario(funcionarioId) {
    const funcionario = APP_STATE.funcionarios[funcionarioId];
    if (!funcionario) return;
    
    const statusFerias = getStatusFerias(funcionario.ferias);
    
    alert(`
📋 DETALHES DO FUNCIONÁRIO

👤 Nome: ${funcionario.nome}
🔢 DRT: ${funcionario.drt}
💼 Função: ${funcionario.funcao}
🌅 Turno: ${funcionario.turno}
📅 Turma: ${funcionario.turma}
🏖️ Férias: ${funcionario.ferias} ${statusFerias.text ? `(${statusFerias.text})` : ''}
📞 Telefone: ${funcionario.telefone}
📅 Admissão: ${funcionario.admissao}
    `.trim());
}

// =============================================
// FUNÇÕES DE ZOOM E ANIMAÇÕES
// =============================================

/**
 * Alterna zoom do card
 */
function toggleZoom(card) {
    const zoomedCard = document.querySelector('.card.zoomed');
    
    if (zoomedCard && zoomedCard !== card) {
        fecharZoomCard();
    }
    
    if (card.classList.contains('zoomed')) {
        fecharZoomCard();
    } else {
        card.classList.add('zoomed');
        card.querySelector('.additional-img').style.opacity = '1';
        document.querySelectorAll('.shift-container, .ferias-section').forEach(section => 
            section.classList.add('blurred-background')
        );
    }
}

/**
 * Fecha o zoom do card ativo
 */
function fecharZoomCard() {
    const zoomedCard = document.querySelector('.card.zoomed');
    if (zoomedCard) {
        zoomedCard.classList.remove('zoomed');
        zoomedCard.querySelector('.additional-img').style.opacity = '0';
        document.querySelectorAll('.shift-container, .ferias-section').forEach(section => 
            section.classList.remove('blurred-background')
        );
    }
}

/**
 * Rola o carrossel de cards
 */
function scrollCarousel(direction) {
    const carousel = document.querySelector('.dashboard-container');
    if (!carousel) return;
    
    const scrollAmount = 300;
    carousel.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
    });
}

// =============================================
// FUNÇÕES DE TEMA E PREFERÊNCIAS
// =============================================

/**
 * Alterna entre tema claro e escuro
 */
function alternarTema() {
    const body = document.body;
    const overlay = document.querySelector('.transition-overlay');
    const isLightMode = body.classList.contains('light-mode');
    
    body.classList.add('blurred');
    overlay.classList.add(isLightMode ? 'dark-mode-transition' : 'light-mode-transition');
    
    setTimeout(() => {
        body.classList.toggle('light-mode');
        document.getElementById('theme-toggle').textContent = 
            body.classList.contains('light-mode') ? '🌙 Modo Escuro' : '☀️ Modo Claro';
        
        // Salvar preferência
        localStorage.setItem('tema', body.classList.contains('light-mode') ? 'claro' : 'escuro');
        
        body.classList.remove('blurred');
        overlay.classList.remove('dark-mode-transition', 'light-mode-transition');
    }, 500);
}

/**
 * Carrega tema salvo das preferências
 */
function carregarTemaSalvo() {
    const temaSalvo = localStorage.getItem('tema');
    const body = document.body;
    
    if (temaSalvo === 'claro') {
        body.classList.add('light-mode');
        document.getElementById('theme-toggle').textContent = '🌙 Modo Escuro';
    } else {
        document.getElementById('theme-toggle').textContent = '☀️ Modo Claro';
    }
}

// =============================================
// FUNÇÕES DE EXPORTAÇÃO E RELATÓRIOS
// =============================================

/**
 * Exporta dados para CSV
 */
function exportarDados() {
    if (!APP_STATE.isAdmin) {
        mostrarErro('⚠️ Acesso negado. Faça login como administrador.');
        return;
    }
    
    const funcionarios = Object.values(APP_STATE.funcionarios);
    
    // Cabeçalhos do CSV
    const headers = ['Nome', 'DRT', 'Função', 'Turno', 'Turma', 'Férias', 'Telefone', 'Admissão'];
    
    // Dados
    const dados = funcionarios.map(func => [
        `"${func.nome}"`,
        func.drt,
        `"${func.funcao}"`,
        `"${func.turno}"`,
        `"${func.turma}"`,
        `"${func.ferias}"`,
        `"${func.telefone}"`,
        `"${func.admissao}"`
    ]);
    
    // Criar conteúdo CSV
    const csvContent = [headers.join(','), ...dados.map(row => row.join(','))].join('\n');
    
    // Criar e baixar arquivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `funcionarios_wmoldes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarSucesso('📊 Dados exportados com sucesso!');
}

// =============================================
// FUNÇÕES DE NOTIFICAÇÃO E FEEDBACK
// =============================================

/**
 * Mostra mensagem de sucesso
 */
function mostrarSucesso(mensagem) {
    // Implementação simples - pode ser substituída por uma lib de notificações
    console.log('✅ ' + mensagem);
    alert('✅ ' + mensagem);
}

/**
 * Mostra mensagem de erro
 */
function mostrarErro(mensagem) {
    console.error('❌ ' + mensagem);
    alert('❌ ' + mensagem);
}

/**
 * Mostra erro no modal
 */
function mostrarErroModal(mensagem) {
    // Poderia ser implementado com um elemento de erro no modal
    alert('❌ ' + mensagem);
}

/**
 * Atualiza interface com base no estado
 */
function atualizarInterface() {
    carregarTemaSalvo();
    
    // Configurar botão de tema
    document.getElementById('theme-toggle').onclick = alternarTema;
    
    // Configurar botão de fechar
    document.getElementById('closeButton').onclick = () => {
        if (confirm('Tem certeza que deseja fechar o sistema?')) {
            window.close();
        }
    };
    
    // Configurar botão de tela cheia
    document.getElementById('fullscreen-btn').onclick = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };
}

// =============================================
// INICIALIZAÇÃO DA APLICAÇÃO
// =============================================

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', inicializarAplicacao);

// Configurar eventos de fullscreen
document.addEventListener('fullscreenchange', () => {
    document.body.style.zoom = document.fullscreenElement ? "100%" : "100%";
});

// Exportar funções globais necessárias
window.toggleZoom = toggleZoom;
window.aplicarFiltros = aplicarFiltros;
window.resetarFiltros = resetarFiltros;
window.abrirModalLogin = abrirModalLogin;
window.fecharModalLogin = fecharModalLogin;
window.verificarSenhaAdmin = verificarSenhaAdmin;
window.abrirModalNovoFuncionario = abrirModalNovoFuncionario;
window.fecharModalFuncionario = fecharModalFuncionario;
window.salvarFuncionario = salvarFuncionario;
window.excluirFuncionario = excluirFuncionario;
window.sairModoAdmin = sairModoAdmin;
window.exportarDados = exportarDados;
window.abrirWhatsApp = abrirWhatsApp;
window.mostrarDetalhesFuncionario = mostrarDetalhesFuncionario;
window.scrollCarousel = scrollCarousel;
window.alternarTema = alternarTema;

console.log('🔧 Sistema WMOLDES carregado e pronto!');
