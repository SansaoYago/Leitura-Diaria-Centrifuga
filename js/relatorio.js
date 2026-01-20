const _supabase = supabase.createClient('https://hnkwtzygwyelfjvutakm.supabase.co', 'sb_publishable_gKX0FdtJ2I6ax0TAFRMp5A_S1kNrBiS');

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

        // Atualiza data na tabela
        document.getElementById("data-tabela").innerText = dataAtual.toLocaleDateString('pt-BR');

        console.log(`🔍 Buscando: Data=${dataBusca} | Chiller=${chillerAtual}`);

        // Consulta Supabase
        const { data, error } = await _supabase
            .from('leituras_centrifugas')
            .select('*')
            .eq('data', dataBusca)
            .eq('chiller', chillerAtual)
            .order('horario', { ascending: true });

        if (error) {
            console.error("❌ Erro Supabase:", error);
            mostrarErro("Erro ao buscar dados: " + error.message);
            return;
        }

        console.log(`✅ ${data?.length || 0} registros encontrados para Chiller ${chillerAtual}`);

        if (data && data.length > 0) {
            processarRelatorio(data);
        } else {
            limparTabela();
            mostrarAviso(`Nenhum dado encontrado para o chiller ${chillerAtual} no dia de hoje.`);
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
        // CORREÇÃO: Remova os dois pontos do horário para encontrar a classe
        const horarioSemDoisPontos = horario.replace(':', ''); // "0200"

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

// ===== FUNÇÕES DE NAVEGAÇÃO =====

function criarNavegacao() {
    const chillers = ['1.1', '1.2', '1.3', '2.1', '2.2', 'C1'];

    const navegacao = document.createElement('div');
    navegacao.style.cssText = `
        background: #f5f5f5;
        padding: 15px;
        margin-bottom: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    `;

    navegacao.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
            <div>
                <label style="font-weight: bold; margin-right: 10px;">Chiller:</label>
                <select id="seletor-chiller" style="padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
                    ${chillers.map(ch =>
        `<option value="${ch}" ${ch === chillerAtual ? 'selected' : ''}>CH${ch}</option>`
    ).join('')}
                </select>
            </div>
            
            <div style="margin-left: 20px;">
                <label style="font-weight: bold; margin-right: 10px;">Data:</label>
                <button onclick="mudarData(-1)" style="padding: 8px 15px; border: 1px solid #ccc; background: white; cursor: pointer;">◀</button>
                <span id="data-exibicao" style="margin: 0 15px; font-weight: bold; min-width: 120px; display: inline-block;">
                    ${dataAtual.toLocaleDateString('pt-BR')}
                </span>
                <button onclick="mudarData(1)" style="padding: 8px 15px; border: 1px solid #ccc; background: white; cursor: pointer;">▶</button>
                <button onclick="hoje()" style="margin-left: 10px; padding: 8px 15px; background: #004488; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Hoje
                </button>
            </div>
            
            <div style="margin-left: auto;">
                <button id="btn-atualizar" onclick="atualizarComEmergencia()" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    🔄 Atualizar
                </button>
                <button onclick="window.location.href='index.html'" style="margin-left: 10px; padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    📝 Nova Leitura
                </button>
            </div>
        </div>
    `;

    document.querySelector('main').prepend(navegacao);
    
    // Adiciona o event listener após criar o seletor
    const seletor = document.getElementById('seletor-chiller');
    if (seletor) {
        seletor.addEventListener('change', mudarChiller);
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

// Configura impressão
function configurarImpressao() {
    const btnPrint = document.querySelector('.btn-print');
    if (btnPrint) {
        btnPrint.onclick = () => {
            // Adiciona cabeçalho para impressão
            const header = document.createElement('div');
            header.className = 'print-header';
            header.style.cssText = `
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #000;
                display: none;
            `;
            header.innerHTML = `
                <h2>RELATÓRIO DIÁRIO - CH${chillerAtual}</h2>
                <p>Data: ${dataAtual.toLocaleDateString('pt-BR')} | Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
            `;

            document.body.prepend(header);

            // CSS específico para impressão
            const style = document.createElement('style');
            style.textContent = `
                @media print {
                    .print-header { display: block !important; }
                    .btn-print, nav, footer { display: none !important; }
                    body { background: white !important; }
                    table { width: 100%; border-collapse: collapse; }
                    td, th { border: 1px solid #000 !important; padding: 5px !important; }
                    .text-vertical { writing-mode: vertical-rl; }
                }
            `;
            document.head.appendChild(style);

            window.print();

            // Limpa após impressão
            setTimeout(() => {
                header.remove();
                style.remove();
            }, 100);
        };
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