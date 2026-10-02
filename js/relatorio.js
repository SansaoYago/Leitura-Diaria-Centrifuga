import { buscarLeiturasFirestore } from './firebase-service.js';

// Variáveis globais
let chillerAtual = "1.1";
let dataAtual = new Date();

// Função principal
async function carregarRelatorio() {
    console.log("🚀 Iniciando busca de dados...");
    console.log(`📌 Chiller atual antes de verificar: ${chillerAtual}`);

    try {
        // Verifica parâmetro na URL
        const params = new URLSearchParams(window.location.search);
        const chillerParam = params.get('chiller');
        
        console.log(`🔍 Verificando URL...`);
        console.log(`   - Parâmetro chiller na URL: ${chillerParam}`);
        console.log(`   - chillerAtual: ${chillerAtual}`);
        
        if (chillerParam) {
            chillerAtual = chillerParam;
            console.log(`✅ Usando chiller da URL: ${chillerAtual}`);
        } else {
            // Se não encontrar na URL, tenta localStorage
            const chillerLocal = localStorage.getItem('chillerAtual');
            console.log(`   - localStorage chillerAtual: ${chillerLocal}`);
            
            if (chillerLocal) {
                chillerAtual = chillerLocal;
                console.log(`✅ Usando chiller do localStorage: ${chillerAtual}`);
                
                // Atualiza a URL com o valor do localStorage
                const novaParams = new URLSearchParams(window.location.search);
                novaParams.set('chiller', chillerAtual);
                const novaURL = window.location.pathname + '?' + novaParams.toString();
                window.history.replaceState({ chiller: chillerAtual }, '', novaURL);
                console.log(`✅ URL atualizada com localStorage: ${novaURL}`);
            } else {
                console.log(`⚠️ Sem chiller na URL ou localStorage, usando padrão: ${chillerAtual}`);
            }
        }
        
        // Atualiza o seletor se existir
        const seletor = document.getElementById('seletor-chiller');
        if (seletor) {
            seletor.value = chillerAtual;
            console.log(`✅ Seletor atualizado para: ${chillerAtual}`);
        }
        
        document.getElementById("chiller").innerText = chillerAtual;
        console.log(`✅ Display de chiller atualizado: ${chillerAtual}`);

        // Formata data
        const ano = dataAtual.getFullYear();
        const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
        const dia = String(dataAtual.getDate()).padStart(2, '0');
        const dataBusca = `${ano}-${mes}-${dia}`;

        // Sincroniza seletor de data no painel de controle
        const inputData = document.getElementById("seletor-data");
        if (inputData && inputData.value !== dataBusca) {
            inputData.value = dataBusca;
        }

        // Atualiza data na tabela
        document.getElementById("data-tabela").innerText = dataAtual.toLocaleDateString('pt-BR');

        console.log(`🔍 Buscando: Data=${dataBusca} | Chiller=${chillerAtual}`);

        // Consulta Firebase Firestore com fallback local
        let dadosCarregados = [];
        try {
            dadosCarregados = await buscarLeiturasFirestore(dataBusca, chillerAtual);
            console.log(`🔥 Firestore retornou ${dadosCarregados.length} registros para Chiller ${chillerAtual}`);
        } catch (errDb) {
            console.warn("⚠️ Firebase indisponível ou offline no momento:", errDb);
        }

        // Mescla com registros locais do localStorage
        try {
            const locais = JSON.parse(localStorage.getItem('leituras_centrifugas_local') || '[]');
            const locaisFiltrados = locais.filter(item => item.data === dataBusca && item.chiller === chillerAtual);
            
            locaisFiltrados.forEach(itemLocal => {
                const index = dadosCarregados.findIndex(d => d.horario === itemLocal.horario);
                if (index >= 0) {
                    dadosCarregados[index] = { ...dadosCarregados[index], ...itemLocal };
                } else {
                    dadosCarregados.push(itemLocal);
                }
            });
            dadosCarregados.sort((a, b) => (a.horario || '').localeCompare(b.horario || ''));
        } catch (e) {
            console.warn("Aviso ao ler localStorage:", e);
        }

        console.log(`✅ ${dadosCarregados?.length || 0} registros encontrados para Chiller ${chillerAtual}`);

        if (dadosCarregados && dadosCarregados.length > 0) {
            processarRelatorio(dadosCarregados);
        } else {
            limparTabela();
            mostrarAviso(`Nenhum dado encontrado para o chiller ${chillerAtual} no dia ${dataAtual.toLocaleDateString('pt-BR')}.`);
        }

    } catch (error) {
        console.error("💥 Erro ao carregar relatório:", error);
        mostrarErro("Erro inesperado ao carregar relatório.");
    }
}

// Processa os dados
function processarRelatorio(dados) {
    limparTabela();

    let totalDemanda = 0;
    let totalEvap = 0;
    let totalCond = 0;
    let contadorValidos = 0;
    const operadoresPorTurno = { manha: new Set(), tarde: new Set() };

    dados.forEach(leitura => {
        const horario = leitura.horario;

        // ENCONTRA A LINHA CORRETA (a que tem data-horario)
        const linha = document.querySelector(`tr[data-horario="${horario}"]`);

        if (!linha) {
            console.warn(`Linha não encontrada para horário: ${horario}`);
            return;
        }

        console.log(`📝 Preenchendo linha ${horario}`);

        // FUNÇÃO AUXILIAR ATUALIZADA
        const preencher = (classe, valor, formato = null) => {
            // Encontra o elemento na PRÓPRIA LINHA (não nos rowspan)
            const el = linha.querySelector(classe);
            if (!el) {
                console.warn(`Elemento não encontrado: ${classe} no horário ${horario}`);
                return;
            }

            let valorExibicao = "-";

            if (valor !== null && valor !== undefined && valor !== "") {
                const valorNum = parseFloat(valor);

                if (!isNaN(valorNum)) {
                    // Formatação
                    if (formato === 'decimal2') valorExibicao = valorNum.toFixed(2);
                    else if (formato === 'decimal1') valorExibicao = valorNum.toFixed(1);
                    else if (formato === 'decimal0') valorExibicao = Math.round(valorNum);
                    else valorExibicao = valorNum.toString();
                } else {
                    valorExibicao = valor; // Para campos de texto
                }
            }

            el.innerText = valorExibicao;
            console.log(`✅ ${classe}: ${valorExibicao}`);
        };

        // ===== PREENCHIMENTO DOS CAMPOS =====
        // GELADA
        preencher(".inTemp-entrada-GEL", leitura.temp_entrada_gel, 'decimal1');
        preencher(".inTemp-saida-GEL", leitura.temp_saida_gel, 'decimal1');
        preencher(".inPress-entrada-GEL", leitura.press_entrada_gel, 'decimal2');
        preencher(".inPress-saida-GEL", leitura.press_saida_gel, 'decimal2');

        // EVAPORAÇÃO
        preencher(".inDeltaEvap", leitura.delta_evap, 'decimal1');

        // CONDENSAÇÃO
        preencher(".inTemp-entrada-CON", leitura.temp_entrada_con, 'decimal1');
        preencher(".inTemp-saida-CON", leitura.temp_saida_con, 'decimal1');
        preencher(".inDeltaCond", leitura.delta_cond, 'decimal1');
        preencher(".inPress-entrada-CON", leitura.press_entrada_con, 'decimal2');
        preencher(".inPress-saida-CON", leitura.press_saida_con, 'decimal2');

        // LUBRIFICAÇÃO
        preencher(".inTempOleo", leitura.temp_oleo, 'decimal1');
        preencher(".inPress-util", leitura.press_util_oleo, 'decimal0');
        preencher(".inNivel-oleo-carter", leitura.nivel_oleo);

        // REFRIGERANTE
        preencher(".inPress-evap", leitura.press_evap, 'decimal0');
        preencher(".inPress-cond", leitura.press_cond, 'decimal0');
        preencher(".inTemp-evap", leitura.temp_evap, 'decimal1');
        preencher(".inTemp-cond", leitura.temp_cond, 'decimal1');

        // ELÉTRICA
        preencher(".inABRS", leitura.volts_abrs, 'decimal0');
        preencher(".inACST", leitura.volts_acst, 'decimal0');
        preencher(".inBCRT", leitura.volts_bcrt, 'decimal0');
        preencher(".inA", leitura.amp_a, 'decimal1');
        preencher(".inB", leitura.amp_b, 'decimal1');
        preencher(".inC", leitura.amp_c, 'decimal1');
        preencher(".inDemanda", leitura.demanda, 'decimal2');

        // ===== NOME DO OPERADOR (na linha seguinte) =====
        const linhaNome = linha.nextElementSibling;
        if (linhaNome && linhaNome.querySelector(".nome")) {
            const nomeCell = linhaNome.querySelector(".nome");
            nomeCell.innerText = leitura.nome_operador || "-";
            console.log(`✅ Nome operador ${horario}: ${nomeCell.innerText}`);

            if (leitura.nome_operador) {
                const hora = parseInt(horario.split(':')[0]);
                const turno = hora < 12 ? 'manha' : 'tarde';
                operadoresPorTurno[turno].add(leitura.nome_operador);
            }
        }

        // ===== RONDA (CHECKBOXES) =====
        // Formata para 4 dígitos com zero à esquerda (ex: 0200, 0800, 1400, 2000)
        const partesHorario = (horario || '').split(':');
        const horarioSemDoisPontos = (partesHorario[0] || '').padStart(2, '0') + (partesHorario[1] || '00').padStart(2, '0');

        // Tenta os 3 formatos possíveis:
        let checkboxOk = document.querySelector(`.check-ok-${horarioSemDoisPontos}`); // .check-ok-0200
        let checkboxNok = document.querySelector(`.check-nok-${horarioSemDoisPontos}`); // .check-nok-0200

        // Se não encontrou, tenta com dois pontos escapados
        if (!checkboxOk || !checkboxNok) {
            const horarioEscapado = '\\3A ' + horario.replace(':', ''); // Formato CSS escape
            checkboxOk = checkboxOk || document.querySelector(`.check-ok-${horarioEscapado}`);
            checkboxNok = checkboxNok || document.querySelector(`.check-nok-${horarioEscapado}`);
        }

        // Se ainda não encontrou, tenta buscar por data attributes
        if (!checkboxOk || !checkboxNok) {
            checkboxOk = checkboxOk || document.querySelector(`input[data-horario="${horario}"][data-tipo="ok"]`);
            checkboxNok = checkboxNok || document.querySelector(`input[data-horario="${horario}"][data-tipo="nok"]`);
        }

        console.log(`🔍 Procurando checkboxes para ${horario}:`);
        console.log(`   .check-ok-${horarioSemDoisPontos}:`, checkboxOk);
        console.log(`   .check-nok-${horarioSemDoisPontos}:`, checkboxNok);

        if (leitura.ronda_status !== undefined && leitura.ronda_status !== null) {
            // Converte para booleano
            const isRondaOk = leitura.ronda_status === true ||
                leitura.ronda_status === "true" ||
                leitura.ronda_status === "ok" ||
                leitura.ronda_status === "1";

            console.log(`✅ Ronda ${horario}: status=${leitura.ronda_status}, isOk=${isRondaOk}`);

            if (checkboxOk) {
                checkboxOk.checked = isRondaOk;
                console.log(`   Checkbox OK marcado: ${isRondaOk}`);
            }
            if (checkboxNok) {
                checkboxNok.checked = !isRondaOk;
                console.log(`   Checkbox NOK marcado: ${!isRondaOk}`);
            }
        } else {
            console.warn(`⚠️ Ronda ${horario}: status indefinido`);
        }

        // ===== ACUMULA PARA MÉDIAS =====
        if (leitura.demanda) {
            totalDemanda += parseFloat(leitura.demanda);
            totalEvap += leitura.delta_evap ? parseFloat(leitura.delta_evap) : 0;
            totalCond += leitura.delta_cond ? parseFloat(leitura.delta_cond) : 0;
            contadorValidos++;
        }
    });

    // ===== CALCULA MÉDIAS =====
    if (contadorValidos > 0) {
        const mediaEvap = (totalEvap / contadorValidos).toFixed(2);
        const mediaCond = (totalCond / contadorValidos).toFixed(2);

        let mediaDemanda = "0.00";
        if (contadorValidos > 0) {
            const mediaBase = totalDemanda / contadorValidos;
            mediaDemanda = (mediaBase * 7).toFixed(2);
        }

        document.getElementById("avg-demanda").innerText = mediaDemanda;
        document.getElementById("avg-evap").innerText = mediaEvap;
        document.getElementById("avg-cond").innerText = mediaCond;

        console.log(`📊 Médias calculadas: Demanda=${mediaDemanda}%, Evap=${mediaEvap}, Cond=${mediaCond}`);
    } else {
        console.warn("⚠️ Nenhum dado válido para calcular médias");
    }

    // ===== OPERADORES POR TURNO =====
    const turno1 = operadoresPorTurno.manha.size > 0 ?
        Array.from(operadoresPorTurno.manha).join(', ') : "-";
    const turno2 = operadoresPorTurno.tarde.size > 0 ?
        Array.from(operadoresPorTurno.tarde).join(', ') : "-";

    document.getElementById("op-turno1").innerText = turno1;
    document.getElementById("op-turno2").innerText = turno2;

    console.log(`👥 Operadores: Manhã=${turno1}, Tarde=${turno2}`);
}

// Limpa tabela
function limparTabela() {
    document.querySelectorAll("tbody td[class^='in']").forEach(c => {
        c.innerText = "-";
        c.style.backgroundColor = '';
        c.title = '';
    });

    document.querySelectorAll(".nome").forEach(c => c.innerText = "-");
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

    document.getElementById("avg-demanda").innerText = "0.00";
    document.getElementById("avg-evap").innerText = "0.00";
    document.getElementById("avg-cond").innerText = "0.00";
    document.getElementById("op-turno1").innerText = "-";
    document.getElementById("op-turno2").innerText = "-";
}

// ===== FUNÇÕES DE NAVEGAÇÃO & CONTROLES =====

function formatarDataISO(data = new Date()) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

function criarNavegacao() {
    // Remove painel anterior se houver
    const painelAntigo = document.querySelector('.painel-topo');
    if (painelAntigo) {
        painelAntigo.remove();
    }

    const chillers = ['1.1', '1.2', '1.3', '2.1', '2.2', 'C1'];
    const dataISO = formatarDataISO(dataAtual);

    const painel = document.createElement('div');
    painel.className = 'painel-topo no-print';

    painel.innerHTML = `
        <div class="grupo-controles">
            <div class="campo-item">
                <label for="seletor-chiller">Chiller:</label>
                <select id="seletor-chiller">
                    ${chillers.map(ch =>
                        `<option value="${ch}" ${ch === chillerAtual ? 'selected' : ''}>CH ${ch}</option>`
                    ).join('')}
                </select>
            </div>
            
            <div class="campo-item">
                <label for="seletor-data">📅 Data:</label>
                <input type="date" id="seletor-data" value="${dataISO}">
                <button type="button" id="btn-hoje" class="btn-ctrl btn-ctrl-hoje" title="Ir para data de hoje">
                    Hoje
                </button>
            </div>
        </div>

        <div class="grupo-botoes">
            <button type="button" id="btn-imprimir-topo" class="btn-ctrl btn-ctrl-pdf" title="Gerar PDF ou Imprimir em Formato A4 Paisagem">
                📄 Gerar PDF / Imprimir
            </button>
            <button type="button" id="btn-atualizar" class="btn-ctrl btn-ctrl-atualizar" title="Recarregar relatório">
                🔄 Atualizar
            </button>
            <button type="button" onclick="window.location.href='index.html'" class="btn-ctrl btn-ctrl-novo" title="Preencher nova leitura">
                📝 Nova Leitura
            </button>
        </div>
    `;

    document.querySelector('main').prepend(painel);
    
    // Listeners dos controles
    const seletorChiller = document.getElementById('seletor-chiller');
    if (seletorChiller) {
        seletorChiller.addEventListener('change', mudarChiller);
    }

    const seletorData = document.getElementById('seletor-data');
    if (seletorData) {
        seletorData.addEventListener('change', (e) => {
            if (!e.target.value) return;
            const partes = e.target.value.split('-');
            if (partes.length === 3) {
                const ano = parseInt(partes[0], 10);
                const mes = parseInt(partes[1], 10) - 1;
                const dia = parseInt(partes[2], 10);
                // Define data no meio-dia local para evitar qualquer desvio de timezone
                dataAtual = new Date(ano, mes, dia, 12, 0, 0);
                console.log(`📅 Data selecionada no calendário: ${dataAtual.toLocaleDateString('pt-BR')}`);
                carregarRelatorio();
            }
        });
    }

    const btnHoje = document.getElementById('btn-hoje');
    if (btnHoje) {
        btnHoje.addEventListener('click', () => {
            dataAtual = new Date();
            const inputData = document.getElementById('seletor-data');
            if (inputData) inputData.value = formatarDataISO(dataAtual);
            carregarRelatorio();
        });
    }

    const btnAtualizar = document.getElementById('btn-atualizar');
    if (btnAtualizar) {
        btnAtualizar.addEventListener('click', atualizarComEmergencia);
    }

    const btnImprimir = document.getElementById('btn-imprimir-topo');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', executarImpressao);
    }
}

// ===== FUNÇÃO DE EMERGÊNCIA - ATUALIZAR =====
function atualizarComEmergencia() {
    console.log("🚨 BOTÃO ATUALIZAR ACIONADO - MODO EMERGÊNCIA");
    
    // Passo 1: Lê o chiller selecionado no dropdown
    const seletor = document.getElementById('seletor-chiller');
    if (!seletor) {
        console.error("❌ Seletor de chiller não encontrado!");
        mostrarErro("Erro: Seletor de chiller não disponível");
        return;
    }
    
    const chillerSelecionado = seletor.value;
    console.log(`✅ Chiller selecionado no dropdown: ${chillerSelecionado}`);
    
    // Passo 2: Força o chiller atual
    chillerAtual = chillerSelecionado;
    
    // Passo 3: Atualiza a URL
    const params = new URLSearchParams(window.location.search);
    params.set('chiller', chillerAtual);
    const novaURL = window.location.pathname + '?' + params.toString();
    window.history.replaceState({ chiller: chillerAtual }, '', novaURL);
    console.log(`✅ URL atualizada: ${novaURL}`);
    
    // Passo 4: Atualiza localStorage
    localStorage.setItem('chillerAtual', chillerAtual);
    console.log(`✅ localStorage atualizado: chillerAtual=${chillerAtual}`);
    
    // Passo 5: Atualiza o display do chiller na tabela
    document.getElementById("chiller").innerText = chillerAtual;
    console.log(`✅ Display do chiller atualizado: ${chillerAtual}`);
    
    // Passo 6: Efeito visual no botão
    const btnAtualizar = document.getElementById('btn-atualizar');
    const corOriginal = btnAtualizar.style.background;
    btnAtualizar.style.background = '#ff6b6b';
    setTimeout(() => {
        btnAtualizar.style.background = corOriginal;
    }, 500);
    
    console.log(`🔄 Iniciando carregamento do relatório...`);
    
    // Passo 7: Carrega o relatório
    carregarRelatorio();
}

function mudarChiller() {
    const seletor = document.getElementById('seletor-chiller');
    if (seletor) {
        chillerAtual = seletor.value;
        console.log(`✨ Chiller mudado para: ${chillerAtual}`);
        
        document.getElementById("chiller").innerText = chillerAtual;
        
        // Atualiza a URL com o novo chiller
        const params = new URLSearchParams(window.location.search);
        params.set('chiller', chillerAtual);
        const novaURL = window.location.pathname + '?' + params.toString();
        window.history.pushState({ chiller: chillerAtual }, '', novaURL);
        console.log(`✅ URL atualizada: ${novaURL}`);
        
        // Salva em localStorage como backup
        localStorage.setItem('chillerAtual', chillerAtual);
        console.log(`✅ localStorage atualizado: ${chillerAtual}`);
        
        carregarRelatorio();
    }
}

function mudarData(dias) {
    dataAtual.setDate(dataAtual.getDate() + dias);
    document.getElementById("data-exibicao").textContent = dataAtual.toLocaleDateString('pt-BR');
    carregarRelatorio();
}

function hoje() {
    dataAtual = new Date();
    document.getElementById("data-exibicao").textContent = dataAtual.toLocaleDateString('pt-BR');
    carregarRelatorio();
}

// Mensagens
function mostrarErro(mensagem) {
    const erroDiv = document.createElement('div');
    erroDiv.style.cssText = `
        background: #dc3545;
        color: white;
        padding: 15px;
        margin: 10px 0;
        border-radius: 5px;
        text-align: center;
        font-weight: bold;
    `;
    erroDiv.textContent = mensagem;

    const container = document.querySelector('.contain') || document.querySelector('main');
    container.prepend(erroDiv);

    setTimeout(() => erroDiv.remove(), 5000);
}

function mostrarAviso(mensagem) {
    console.warn(mensagem);
}

// Função centralizada para executar a impressão em formato A4 Paisagem
function executarImpressao() {
    let header = document.querySelector('.print-header');
    if (!header) {
        header = document.createElement('div');
        header.className = 'print-header';
        document.body.prepend(header);
    }
    header.innerHTML = `
        <h2>RELATÓRIO DIÁRIO - CH${chillerAtual}</h2>
        <p>Data: ${dataAtual.toLocaleDateString('pt-BR')} | Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
    `;

    window.print();
}

// Configura botões de impressão
function configurarImpressao() {
    const btnTopo = document.getElementById('btn-imprimir-topo');
    if (btnTopo) {
        btnTopo.onclick = executarImpressao;
    }
    const btnPrint = document.querySelector('.btn-print');
    if (btnPrint) {
        btnPrint.onclick = executarImpressao;
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log("📊 Relatório inicializado");
    criarNavegacao();
    configurarImpressao();
    carregarRelatorio();

    // Atualização automática a cada 5 minutos (opcional)
    // setInterval(carregarRelatorio, 300000);
});

// Clique direto no chiller na tabela para abrir seletor
document.addEventListener('click', (e) => {
    if (e.target.id === 'chiller') {
        const seletor = document.getElementById('seletor-chiller');
        if (seletor) {
            seletor.focus();
            seletor.click();
        }
    }
});

// Listener para botões de navegação do navegador
window.addEventListener('popstate', (e) => {
    if (e.state && e.state.chiller) {
        chillerAtual = e.state.chiller;
        const seletor = document.getElementById('seletor-chiller');
        if (seletor) {
            seletor.value = chillerAtual;
        }
        document.getElementById("chiller").innerText = chillerAtual;
        carregarRelatorio();
    }
});

// Exporta funções para o escopo global (botões com onclick no HTML)
window.mudarData = mudarData;
window.hoje = hoje;
window.atualizarComEmergencia = atualizarComEmergencia;
window.mudarChiller = mudarChiller;
window.carregarRelatorio = carregarRelatorio;
window.executarImpressao = executarImpressao;

