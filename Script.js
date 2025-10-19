// =============================================
// SISTEMA PROFISSIONAL WMOLDES
// Gestão de Funcionários - Design Empresarial
// =============================================

// CONFIGURAÇÕES GLOBAIS
const CONFIG = {
    SENHA_ADMIN: "admin123",
    MESES: {
        'JANEIRO': 1, 'FEVEREIRO': 2, 'MARÇO': 3, 'ABRIL': 4, 'MAIO': 5, 'JUNHO': 6,
        'JULHO': 7, 'AGOSTO': 8, 'SETEMBRO': 9, 'OUTUBRO': 10, 'NOVEMBRO': 11, 'DEZEMBRO': 12
    }
};

// ESTADO DA APLICAÇÃO
const STATE = {
    isAdmin: false,
    funcionarios: {},
    filtros: {
        turno: 'todos',
        funcao: 'todos',
        turma: 'todos',
        ferias: 'todos',
        busca: ''
    },
    funcionarioEditando: null
};

// =============================================
// INICIALIZAÇÃO
// =============================================

/**
 * Inicializa a aplicação quando o DOM estiver carregado
 */
function inicializarAplicacao() {
    console.log('🚀 Iniciando Sistema WMOLDES...');
    
    mostrarLoading();
    
    // Configurar tema inicial
    const temaSalvo = localStorage.getItem('tema') || 'dark';
    document.documentElement.setAttribute('data-theme', temaSalvo);
    atualizarIconeTema(temaSalvo);
    
    // Configurar event listeners
    configurarEventListeners();
    
    // Carregar dados do Firebase
    carregarDadosFirebase();
    
    // Configurar data de atualização
    atualizarDataAtualizacao();
}

/**
 * Configura todos os event listeners
 */
function configurarEventListeners() {
    // Enter no campo de senha
    document.getElementById('admin-password')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') verificarSenhaAdmin();
    });
    
    // Fechar modais ao clicar fora
    document.addEventListener('click', (e) => {
        if (e.target.id === 'admin-login-modal') fecharModalLogin();
        if (e.target.id === 'funcionario-modal') fecharModalFuncionario();
    });
    
    // Teclas de atalho
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            fecharModalLogin();
            fecharModalFuncionario();
        }
        if (e.ctrlKey && e.key === 'k') {
            e.preventDefault();
            document.getElementById('searchInput').focus();
        }
    });
}

/**
 * Mostra tela de loading
 */
function mostrarLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'flex';
}

/**
 * Esconde tela de loading
 */
function esconderLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.style.display = 'none';
}

// =============================================
// FIREBASE - GERENCIAMENTO DE DADOS
// =============================================

/**
 * Carrega dados do Firebase em tempo real
 */
function carregarDadosFirebase() {
    try {
        const funcionariosRef = window.firebaseRef(window.firebaseDatabase, 'funcionarios');
        
        window.firebaseOnValue(funcionariosRef, (snapshot) => {
            const data = snapshot.val();
            STATE.funcionarios = data || {};
            
            console.log(`📊 ${Object.keys(STATE.funcionarios).length} funcionários carregados`);
            
            renderizarInterface();
            calcularEstatisticas();
            esconderLoading();
            
        }, (error) => {
            console.error('❌ Erro ao carregar dados:', error);
            esconderLoading();
            mostrarNotificacao('Erro ao carregar dados do servidor', 'error');
        });
        
    } catch (error) {
        console.error('❌ Erro na configuração do Firebase:', error);
        esconderLoading();
        mostrarNotificacao('Erro de configuração do banco de dados', 'error');
    }
}

/**
 * Adiciona novo funcionário ao Firebase
 */
async function adicionarFuncionarioFirebase(dados) {
    const funcionariosRef = window.firebaseRef(window.firebaseDatabase, 'funcionarios');
    await window.firebasePush(funcionariosRef, {
        ...dados,
        dataCriacao: new Date().toISOString(),
        dataAtualizacao: new Date().toISOString()
    });
}

/**
 * Atualiza funcionário existente
 */
async function atualizarFuncionarioFirebase(funcionarioId, dados) {
    const funcionarioRef = window.firebaseRef(window.firebaseDatabase, `funcionarios/${funcionarioId}`);
    await window.firebaseUpdate(funcionarioRef, {
        ...dados,
        dataAtualizacao: new Date().toISOString()
    });
}

/**
 * Exclui funcionário do Firebase
 */
async function excluirFuncionarioFirebase(funcionarioId) {
    const funcionarioRef = window.firebaseRef(window.firebaseDatabase, `funcionarios/${funcionarioId}`);
    await window.firebaseRemove(funcionarioRef);
}

// =============================================
// AUTENTICAÇÃO ADMIN
// =============================================

/**
 * Abre modal de login administrativo
 */
function abrirModalLogin() {
    document.getElementById('admin-login-modal').style.display = 'flex';
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-password').focus();
    document.getElementById('login-error').textContent = '';
}

/**
 * Fecha modal de login
 */
function fecharModalLogin() {
    document.getElementById('admin-login-modal').style.display = 'none';
}

/**
 * Verifica senha do administrador
 */
function verificarSenhaAdmin() {
    const senha = document.getElementById('admin-password').value;
    const errorElement = document.getElementById('login-error');
    
    if (!senha) {
        errorElement.textContent = 'Por favor, digite a senha.';
        return;
    }
    
    if (senha === CONFIG.SENHA_ADMIN) {
        STATE.isAdmin = true;
        ativarModoAdmin();
        fecharModalLogin();
        mostrarNotificacao('Acesso administrativo concedido', 'success');
    } else {
        errorElement.textContent = 'Senha incorreta. Tente novamente.';
        document.getElementById('admin-password').value = '';
        document.getElementById('admin-password').focus();
    }
}

/**
 * Ativa modo administrativo
 */
function ativarModoAdmin() {
    document.getElementById('admin-controls').style.display = 'block';
    document.getElementById('admin-access-btn').style.display = 'none';
    document.getElementById('user-role').textContent = 'Administrador';
    
    // Adicionar botões de edição nos cards
    document.querySelectorAll('.card').forEach(card => {
        if (!card.querySelector('.btn-editar')) {
            const btnEditar = document.createElement('button');
            btnEditar.className = 'btn-action btn-secondary btn-editar';
            btnEditar.innerHTML = '<span>✏️</span> Editar';
            btnEditar.onclick = (e) => {
                e.stopPropagation();
                const funcionarioId = card.getAttribute('data-id');
                editarFuncionario(funcionarioId);
            };
            card.querySelector('.card-actions').appendChild(btnEditar);
        }
    });
}

/**
 * Desativa modo administrativo
 */
function sairModoAdmin() {
    STATE.isAdmin = false;
    document.getElementById('admin-controls').style.display = 'none';
    document.getElementById('admin-access-btn').style.display = 'block';
    document.getElementById('user-role').textContent = 'Visitante';
    
    // Remover botões de edição
    document.querySelectorAll('.btn-editar').forEach(btn => btn.remove());
    
    mostrarNotificacao('Modo administrativo desativado', 'info');
}

// =============================================
// GERENCIAMENTO DE FUNCIONÁRIOS
// =============================================

/**
 * Abre modal para novo funcionário
 */
function abrirModalNovoFuncionario() {
    if (!STATE.isAdmin) {
        mostrarNotificacao('Acesso negado. Faça login como administrador.', 'error');
        return;
    }
    
    STATE.funcionarioEditando = null;
    document.getElementById('modal-title').textContent = 'Adicionar Funcionário';
    document.getElementById('salvar-funcionario').textContent = 'Salvar Funcionário';
    document.getElementById('excluir-funcionario').style.display = 'none';
    
    // Limpar formulário
    const form = document.getElementById('funcionario-modal');
    form.querySelectorAll('input, select').forEach(input => {
        if (input.type !== 'button') input.value = '';
    });
    
    document.getElementById('funcionario-modal').style.display = 'flex';
}

/**
 * Abre modal para editar funcionário
 */
function editarFuncionario(funcionarioId) {
    if (!STATE.isAdmin) {
        mostrarNotificacao('Acesso negado. Faça login como administrador.', 'error');
        return;
    }
    
    const funcionario = STATE.funcionarios[funcionarioId];
    if (!funcionario) {
        mostrarNotificacao('Funcionário não encontrado', 'error');
        return;
    }
    
    STATE.funcionarioEditando = funcionarioId;
    document.getElementById('modal-title').textContent = 'Editar Funcionário';
    document.getElementById('salvar-funcionario').textContent = 'Atualizar Funcionário';
    document.getElementById('excluir-funcionario').style.display = 'inline-flex';
    
    // Preencher formulário
    document.getElementById('edit-nome').value = funcionario.nome || '';
    document.getElementById('edit-drt').value = funcionario.drt || '';
    document.getElementById('edit-funcao').value = funcionario.funcao || '';
    document.getElementById('edit-turno').value = funcionario.turno || '';
    document.getElementById('edit-turma').value = funcionario.turma || '';
    document.getElementById('edit-ferias').value = funcionario.ferias || '';
    document.getElementById('edit-telefone').value = funcionario.telefone || '';
    document.getElementById('edit-admissao').value = funcionario.admissao || '';
    document.getElementById('edit-foto').value = funcionario.foto || '';
    
    document.getElementById('funcionario-modal').style.display = 'flex';
}

/**
 * Fecha modal de funcionário
 */
function fecharModalFuncionario() {
    document.getElementById('funcionario-modal').style.display = 'none';
    STATE.funcionarioEditando = null;
}

/**
 * Salva ou atualiza funcionário
 */
async function salvarFuncionario() {
    if (!STATE.isAdmin) {
        mostrarNotificacao('Acesso negado', 'error');
        return;
    }
    
    const dados = obterDadosFormulario();
    if (!dados) return;
    
    try {
        if (STATE.funcionarioEditando) {
            await atualizarFuncionarioFirebase(STATE.funcionarioEditando, dados);
            mostrarNotificacao('Funcionário atualizado com sucesso', 'success');
        } else {
            await adicionarFuncionarioFirebase(dados);
            mostrarNotificacao('Funcionário adicionado com sucesso', 'success');
        }
        
        fecharModalFuncionario();
        
    } catch (error) {
        console.error('Erro ao salvar funcionário:', error);
        mostrarNotificacao('Erro ao salvar funcionário', 'error');
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
    if (!nome) { mostrarErro('O nome é obrigatório'); return null; }
    if (!drt) { mostrarErro('A DRT é obrigatória'); return null; }
    if (!funcao) { mostrarErro('A função é obrigatória'); return null; }
    if (!turno) { mostrarErro('O turno é obrigatório'); return null; }
    if (!turma) { mostrarErro('A turma é obrigatória'); return null; }
    if (!telefone) { mostrarErro('O telefone é obrigatório'); return null; }
    
    // Verificar DRT única (apenas para novos)
    if (!STATE.funcionarioEditando) {
        const drtExistente = Object.values(STATE.funcionarios).find(f => f.drt === drt);
        if (drtExistente) {
            mostrarErro('Já existe um funcionário com esta DRT');
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
        foto: foto || 'https://via.placeholder.com/400x200/6b7280/9ca3af?text=Sem+Foto'
    };
}

/**
 * Exclui funcionário
 */
async function excluirFuncionario() {
    if (!STATE.isAdmin || !STATE.funcionarioEditando) {
        mostrarNotificacao('Acesso negado', 'error');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este funcionário? Esta ação não pode ser desfeita.')) {
        return;
    }
    
    try {
        await excluirFuncionarioFirebase(STATE.funcionarioEditando);
        fecharModalFuncionario();
        mostrarNotificacao('Funcionário excluído com sucesso', 'success');
    } catch (error) {
        console.error('Erro ao excluir funcionário:', error);
        mostrarNotificacao('Erro ao excluir funcionário', 'error');
    }
}

// =============================================
// INTERFACE E RENDERIZAÇÃO
// =============================================

/**
 * Renderiza toda a interface
 */
function renderizarInterface() {
    renderizarDashboard();
    renderizarFerias();
    renderizarTurnos();
    aplicarFiltros();
}

/**
 * Renderiza dashboard com estatísticas
 */
function renderizarDashboard() {
    const stats = calcularEstatisticas();
    
    // Atualizar números
    document.getElementById('total-funcionarios').textContent = stats.total;
    document.getElementById('ferias-mes-atual').textContent = stats.feriasMesAtual;
    document.getElementById('proximas-ferias').textContent = stats.proximasFerias;
    document.getElementById('ferias-atrasadas').textContent = stats.feriasAtrasadas;
    
    // Atualizar gráfico de barras
    const total = stats.porTurno.Manhã + stats.porTurno.Tarde + stats.porTurno.Noite;
    
    document.getElementById('bar-manha').style.width = total ? `${(stats.porTurno.Manhã / total) * 100}%` : '0%';
    document.getElementById('bar-tarde').style.width = total ? `${(stats.porTurno.Tarde / total) * 100}%` : '0%';
    document.getElementById('bar-noite').style.width = total ? `${(stats.porTurno.Noite / total) * 100}%` : '0%';
    
    document.getElementById('value-manha').textContent = stats.porTurno.Manhã;
    document.getElementById('value-tarde').textContent = stats.porTurno.Tarde;
    document.getElementById('value-noite').textContent = stats.porTurno.Noite;
}

/**
 * Renderiza seções de férias
 */
function renderizarFerias() {
    renderizarProximasFerias();
    renderizarFeriasAtuais();
}

/**
 * Renderiza próximas férias
 */
function renderizarProximasFerias() {
    const container = document.getElementById('proximas-ferias-container');
    const funcionarios = Object.entries(STATE.funcionarios)
        .filter(([_, f]) => isProximaFerias(f.ferias))
        .slice(0, 6);
    
    container.innerHTML = funcionarios.length > 0 
        ? funcionarios.map(([id, f]) => criarCardFuncionario(id, f)).join('')
        : '<div class="text-center" style="grid-column: 1/-1; padding: 3rem; color: var(--text-tertiary);">Nenhuma férias próxima encontrada</div>';
}

/**
 * Renderiza férias atuais
 */
function renderizarFeriasAtuais() {
    const container = document.getElementById('ferias-mes-container');
    const funcionarios = Object.entries(STATE.funcionarios)
        .filter(([_, f]) => isFeriasMesAtual(f.ferias));
    
    container.innerHTML = funcionarios.length > 0
        ? funcionarios.map(([id, f]) => criarCardFuncionario(id, f)).join('')
        : '<div class="text-center" style="grid-column: 1/-1; padding: 3rem; color: var(--text-tertiary);">Nenhum funcionário de férias este mês</div>';
}

/**
 * Renderiza turnos
 */
function renderizarTurnos() {
    ['Manhã', 'Tarde', 'Noite'].forEach(turno => {
        const container = document.getElementById(`cards-${turno.toLowerCase()}`);
        const funcionarios = Object.entries(STATE.funcionarios)
            .filter(([_, f]) => f.turno === turno);
        
        const countFerias = funcionarios.filter(([_, f]) => 
            isFeriasMesAtual(f.ferias)
        ).length;
        
        // Atualizar contadores
        document.getElementById(`count-${turno.toLowerCase()}`).textContent = `${funcionarios.length} funcionários`;
        document.getElementById(`ferias-${turno.toLowerCase()}`).textContent = `${countFerias} de férias`;
        
        // Renderizar cards
        container.innerHTML = funcionarios.length > 0
            ? funcionarios.map(([id, f]) => criarCardFuncionario(id, f)).join('')
            : '<div class="text-center" style="grid-column: 1/-1; padding: 2rem; color: var(--text-tertiary);">Nenhum funcionário neste turno</div>';
    });
}

/**
 * Cria card de funcionário
 */
function criarCardFuncionario(id, funcionario) {
    const status = getStatusFerias(funcionario.ferias);
    const badge = status.badge ? `<div class="card-badge ${status.badge}">${status.text}</div>` : '';
    
    return `
        <div class="card" data-id="${id}" data-turno="${funcionario.turno}" data-funcao="${funcionario.funcao}" data-turma="${funcionario.turma}" data-ferias="${funcionario.ferias}">
            ${badge}
            <img src="${funcionario.foto}" alt="${funcionario.nome}" onerror="this.src='https://via.placeholder.com/400x200/6b7280/9ca3af?text=Sem+Foto'">
            <h3>${funcionario.nome}</h3>
            <div class="card-info">
                <div class="info-row">
                    <span class="info-label">DRT</span>
                    <span class="info-value">${funcionario.drt}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Função</span>
                    <span class="info-value">${funcionario.funcao}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Turma</span>
                    <span class="info-value">${funcionario.turma}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Férias</span>
                    <span class="ferias-status ${status.class}">${funcionario.ferias}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Telefone</span>
                    <span class="info-value">${funcionario.telefone}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Admissão</span>
                    <span class="info-value">${funcionario.admissao}</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-action btn-success" onclick="abrirWhatsApp('${funcionario.telefone}')">
                    <span>📞</span> WhatsApp
                </button>
                <button class="btn-action btn-primary" onclick="mostrarDetalhesFuncionario('${id}')">
                    <span>👁️</span> Detalhes
                </button>
                ${STATE.isAdmin ? `
                <button class="btn-action btn-secondary btn-editar" onclick="editarFuncionario('${id}')">
                    <span>✏️</span> Editar
                </button>
                ` : ''}
            </div>
        </div>
    `;
}

// =============================================
// FILTROS E BUSCA
// =============================================

/**
 * Aplica filtros
 */
function aplicarFiltros() {
    const busca = document.getElementById('searchInput').value.toLowerCase();
    const turno = document.getElementById('filter-turno').value;
    const funcao = document.getElementById('filter-funcao').value;
    const turma = document.getElementById('filter-turma').value;
    const ferias = document.getElementById('filter-ferias').value;
    
    STATE.filtros = { busca, turno, funcao, turma, ferias };
    
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
        
        card.style.display = matchBusca && matchTurno && matchFuncao && matchTurma && matchFerias ? 'block' : 'none';
    });
    
    atualizarContadoresTurnos();
}

/**
 * Aplica filtro de férias
 */
function aplicarFiltroFerias(filtro, ferias) {
    switch (filtro) {
        case 'todos': return true;
        case 'feriados': return isFeriasMesAtual(ferias);
        case 'proximos': return isProximaFerias(ferias);
        case 'atrasadas': return isFeriasAtrasada(ferias);
        case 'este-mes': return isFeriasMesAtual(ferias);
        case 'nao-informado': return ferias === 'Não informado';
        default: return true;
    }
}

/**
 * Reseta filtros
 */
function resetarFiltros() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filter-turno').value = 'todos';
    document.getElementById('filter-funcao').value = 'todos';
    document.getElementById('filter-turma').value = 'todos';
    document.getElementById('filter-ferias').value = 'todos';
    
    aplicarFiltros();
    mostrarNotificacao('Filtros resetados', 'info');
}

/**
 * Atualiza contadores dos turnos
 */
function atualizarContadoresTurnos() {
    ['manha', 'tarde', 'noite'].forEach(turno => {
        const cardsVisiveis = document.querySelectorAll(`#cards-${turno} .card:not([style*="none"])`);
        const countElement = document.getElementById(`count-${turno}`);
        if (countElement) {
            countElement.textContent = `${cardsVisiveis.length} funcionários`;
        }
    });
}

// =============================================
// ESTATÍSTICAS E CÁLCULOS
// =============================================

/**
 * Calcula estatísticas
 */
function calcularEstatisticas() {
    const funcionarios = Object.values(STATE.funcionarios);
    
    return {
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
 * Verifica se é férias do mês atual
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
 * Verifica se são próximas férias
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
 * Verifica se férias estão atrasadas
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
 * Obtém status das férias
 */
function getStatusFerias(ferias) {
    if (!ferias || ferias === 'Não informado') {
        return { class: '', badge: '', text: '' };
    }
    
    if (isFeriasMesAtual(ferias)) {
        return { class: 'status-success', badge: 'badge-success', text: 'Férias' };
    }
    if (isProximaFerias(ferias)) {
        return { class: 'status-warning', badge: 'badge-warning', text: 'Próxima' };
    }
    if (isFeriasAtrasada(ferias)) {
        return { class: 'status-danger', badge: 'badge-danger', text: 'Atrasada' };
    }
    
    return { class: '', badge: '', text: '' };
}

// =============================================
// UTILITÁRIOS
// =============================================

/**
 * Alterna tema claro/escuro
 */
function alternarTema() {
    const temaAtual = document.documentElement.getAttribute('data-theme');
    const novoTema = temaAtual === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', novoTema);
    localStorage.setItem('tema', novoTema);
    atualizarIconeTema(novoTema);
    
    mostrarNotificacao(`Tema ${novoTema === 'light' ? 'claro' : 'escuro'} ativado`, 'info');
}

/**
 * Atualiza ícone do tema
 */
function atualizarIconeTema(tema) {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.textContent = tema === 'light' ? '🌙' : '☀️';
    }
}

/**
 * Alterna tela cheia
 */
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

/**
 * Abre WhatsApp
 */
function abrirWhatsApp(telefone) {
    const numero = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/55${numero}`, '_blank');
}

/**
 * Mostra detalhes do funcionário
 */
function mostrarDetalhesFuncionario(funcionarioId) {
    const funcionario = STATE.funcionarios[funcionarioId];
    if (!funcionario) return;
    
    const status = getStatusFerias(funcionario.ferias);
    
    alert(`DETALHES DO FUNCIONÁRIO\n\n` +
          `Nome: ${funcionario.nome}\n` +
          `DRT: ${funcionario.drt}\n` +
          `Função: ${funcionario.funcao}\n` +
          `Turno: ${funcionario.turno}\n` +
          `Turma: ${funcionario.turma}\n` +
          `Férias: ${funcionario.ferias} ${status.text ? `(${status.text})` : ''}\n` +
          `Telefone: ${funcionario.telefone}\n` +
          `Admissão: ${funcionario.admissao}`);
}

/**
 * Rola para seção específica
 */
function scrollToSection(sectionId) {
    document.getElementById(sectionId)?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

/**
 * Atualiza data de atualização
 */
function atualizarDataAtualizacao() {
    const now = new Date();
    document.getElementById('last-update').textContent = 
        `Atualizado: ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR')}`;
}

/**
 * Exporta dados para CSV
 */
function exportarDados() {
    if (!STATE.isAdmin) {
        mostrarNotificacao('Acesso negado', 'error');
        return;
    }
    
    const funcionarios = Object.values(STATE.funcionarios);
    const headers = ['Nome', 'DRT', 'Função', 'Turno', 'Turma', 'Férias', 'Telefone', 'Admissão'];
    
    const csvContent = [
        headers.join(','),
        ...funcionarios.map(f => [
            `"${f.nome}"`,
            f.drt,
            `"${f.funcao}"`,
            `"${f.turno}"`,
            `"${f.turma}"`,
            `"${f.ferias}"`,
            `"${f.telefone}"`,
            `"${f.admissao}"`
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `funcionarios_wmoldes_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarNotificacao('Dados exportados com sucesso', 'success');
}

// =============================================
// NOTIFICAÇÕES
// =============================================

/**
 * Mostra notificação
 */
function mostrarNotificacao(mensagem, tipo = 'info') {
    // Implementação simples - pode ser substituída por uma lib
    const cores = {
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    console.log(`${tipo.toUpperCase()}: ${mensagem}`);
    
    // Poderia implementar um sistema de notificações toast
    if (tipo === 'error') {
        alert(`❌ ${mensagem}`);
    } else if (tipo === 'success') {
        alert(`✅ ${mensagem}`);
    } else {
        alert(`ℹ️ ${mensagem}`);
    }
}

/**
 * Mostra erro no modal
 */
function mostrarErro(mensagem) {
    // Poderia ser implementado com um sistema de erro no modal
    alert(`❌ ${mensagem}`);
}

// =============================================
// INICIALIZAÇÃO E EXPORTAÇÃO
// =============================================

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', inicializarAplicacao);

// Exportar funções globais
window.abrirModalLogin = abrirModalLogin;
window.fecharModalLogin = fecharModalLogin;
window.verificarSenhaAdmin = verificarSenhaAdmin;
window.abrirModalNovoFuncionario = abrirModalNovoFuncionario;
window.fecharModalFuncionario = fecharModalFuncionario;
window.salvarFuncionario = salvarFuncionario;
window.excluirFuncionario = excluirFuncionario;
window.sairModoAdmin = sairModoAdmin;
window.aplicarFiltros = aplicarFiltros;
window.resetarFiltros = resetarFiltros;
window.exportarDados = exportarDados;
window.abrirWhatsApp = abrirWhatsApp;
window.mostrarDetalhesFuncionario = mostrarDetalhesFuncionario;
window.scrollToSection = scrollToSection;
window.alternarTema = alternarTema;
window.toggleFullscreen = toggleFullscreen;

console.log('🔧 Sistema WMOLDES carregado');
