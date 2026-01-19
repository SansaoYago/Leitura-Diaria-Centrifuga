const _supabase = supabase.createClient('https://hnkwtzygwyelfjvutakm.supabase.co', 'sb_publishable_gKX0FdtJ2I6ax0TAFRMp5A_S1kNrBiS');

// Variáveis globais
let chillerAtual = "1.1";
let dataAtual = new Date();

// Função principal
async function carregarRelatorio() {
    console.log("🚀 Iniciando busca de dados...");

    try {
        // Formata data
        const ano = dataAtual.getFullYear();
        const mes = String(dataAtual.getMonth() + 1).padStart(2, '0');
        const dia = String(dataAtual.getDate()).padStart(2, '0');
        const dataBusca = `${ano}-${mes}-${dia}`;
        
        // Atualiza data na tabela
        document.getElementById("data-tabela").innerText = dataAtual.toLocaleDateString('pt-BR');
        
        // Verifica parâmetro na URL
        const params = new URLSearchParams(window.location.search);
        const chillerParam = params.get('chiller');
        if (chillerParam) {
            chillerAtual = chillerParam;
            document.getElementById("chiller").innerText = chillerParam;
        }

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

        console.log(`✅ ${data?.length || 0} registros encontrados`);

        if (data && data.length > 0) {
            processarRelatorio(data);
        } else {
            limparTabela();
            mostrarAviso("Nenhum dado encontrado para o dia de hoje.");
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
        const linha = document.querySelector(`tr[data-horario="${horario}"]`);
        
        if (!linha) return;
        
        console.log(`📝 Preenchendo linha ${horario}`);
        
        // Função auxiliar
        const preencher = (classe, valor, formato = null, min = null, max = null) => {
            const el = linha.querySelector(classe);
            if (!el) return;
            
            let valorExibicao = "-";
            let valorNum = null;
            
            // Tenta obter valor (compatibilidade com colunas antigas e novas)
            let valorReal = valor;
            if (valor === undefined || valor === null) {
                // Tenta encontrar em outras propriedades
                const campo = classe.replace('.', '');
                if (campo.includes('ABRS')) valorReal = leitura.volts_abrs || leitura.v_abrs;
                else if (campo.includes('ACST')) valorReal = leitura.volts_acst || leitura.v_acst;
                else if (campo.includes('BCRT')) valorReal = leitura.volts_bcrt || leitura.v_bcrt;
                else if (campo === 'inA') valorReal = leitura.amp_a || leitura.a_a;
                else if (campo === 'inB') valorReal = leitura.amp_b || leitura.a_b;
                else if (campo === 'inC') valorReal = leitura.amp_c || leitura.a_c;
            }
            
            if (valorReal !== null && valorReal !== undefined && valorReal !== "") {
                valorNum = parseFloat(valorReal);
                
                if (!isNaN(valorNum)) {
                    // Formata
                    if (formato === 'decimal2') valorExibicao = valorNum.toFixed(2);
                    else if (formato === 'decimal1') valorExibicao = valorNum.toFixed(1);
                    else if (formato === 'decimal0') valorExibicao = Math.round(valorNum);
                    else valorExibicao = valorNum.toString();
                    
                    // Destaque se fora da faixa
                    if (min !== null && valorNum < min) {
                        el.style.backgroundColor = '#ffcccc';
                        el.title = `Baixo (min: ${min})`;
                    } else if (max !== null && valorNum > max) {
                        el.style.backgroundColor = '#ffcccc';
                        el.title = `Alto (max: ${max})`;
                    } else {
                        el.style.backgroundColor = '';
                        el.title = '';
                    }
                } else {
                    valorExibicao = valorReal;
                }
            }
            
            el.innerText = valorExibicao;
        };

        // Preenche todos os campos
        preencher(".inTemp-entrada-GEL", leitura.temp_entrada_gel, 'decimal1', 5, 15);
        preencher(".inTemp-saida-GEL", leitura.temp_saida_gel, 'decimal1', 7, 20);
        preencher(".inPress-entrada-GEL", leitura.press_entrada_gel, 'decimal2', 2, 8);
        preencher(".inPress-saida-GEL", leitura.press_saida_gel, 'decimal2', 1, 7);
        preencher(".inDeltaEvap", leitura.delta_evap, 'decimal1', 1, 10);
        preencher(".inTemp-entrada-CON", leitura.temp_entrada_con, 'decimal1', 20, 40);
        preencher(".inTemp-saida-CON", leitura.temp_saida_con, 'decimal1', 25, 45);
        preencher(".inDeltaCond", leitura.delta_cond, 'decimal1', 1, 10);
        preencher(".inPress-entrada-CON", leitura.press_entrada_con, 'decimal2', 0, 5);
        preencher(".inPress-saida-CON", leitura.press_saida_con, 'decimal2', 0, 5);
        preencher(".inTempOleo", leitura.temp_oleo, 'decimal1', 40, 80);
        preencher(".inPress-util", leitura.press_util_oleo, 'decimal0', 100, 300);
        preencher(".inNivel-oleo-carter", leitura.nivel_oleo);
        preencher(".inPress-evap", leitura.press_evap, 'decimal0', 100, 600);
        preencher(".inPress-cond", leitura.press_cond, 'decimal0', 200, 1000);
        preencher(".inTemp-evap", leitura.temp_evap, 'decimal1', -10, 15);
        preencher(".inTemp-cond", leitura.temp_cond, 'decimal1', 20, 60);
        preencher(".inABRS", leitura.volts_abrs || leitura.v_abrs, 'decimal0', 380, 420);
        preencher(".inACST", leitura.volts_acst || leitura.v_acst, 'decimal0', 380, 420);
        preencher(".inBCRT", leitura.volts_bcrt || leitura.v_bcrt, 'decimal0', 380, 420);
        preencher(".inA", leitura.amp_a || leitura.a_a, 'decimal1', 0, 150);
        preencher(".inB", leitura.amp_b || leitura.a_b, 'decimal1', 0, 150);
        preencher(".inC", leitura.amp_c || leitura.a_c, 'decimal1', 0, 150);
        preencher(".inDemanda", leitura.demanda, 'decimal2', 0, 100);

        // Nome do operador
        const proximaLinha = linha.nextElementSibling;
        if (proximaLinha) {
            const nomeCell = proximaLinha.querySelector(".nome");
            if (nomeCell) {
                nomeCell.innerText = leitura.nome_operador || "-";
                
                if (leitura.nome_operador) {
                    const hora = parseInt(horario.split(':')[0]);
                    const turno = hora < 12 ? 'manha' : 'tarde';
                    operadoresPorTurno[turno].add(leitura.nome_operador);
                }
            }
        }
        
        // Ronda
        const rondaValue = leitura.ronda_status;
        const isRondaOk = rondaValue === true || rondaValue === "true" || rondaValue === "ok" || rondaValue === "1";
        
        const checkboxOk = document.querySelector(`.check-ok-${horario}`);
        const checkboxNok = document.querySelector(`.check-nok-${horario}`);
        
        if (checkboxOk) checkboxOk.checked = isRondaOk;
        if (checkboxNok) checkboxNok.checked = !isRondaOk;
        
        // Acumula para médias
        if (leitura.demanda) {
            totalDemanda += parseFloat(leitura.demanda);
            totalEvap += leitura.delta_evap ? parseFloat(leitura.delta_evap) : 0;
            totalCond += leitura.delta_cond ? parseFloat(leitura.delta_cond) : 0;
            contadorValidos++;
        }
    });

    // Calcula médias
    if (contadorValidos > 0) {
        document.getElementById("avg-demanda").innerText = (totalDemanda / contadorValidos).toFixed(2);
        document.getElementById("avg-evap").innerText = (totalEvap / contadorValidos).toFixed(2);
        document.getElementById("avg-cond").innerText = (totalCond / contadorValidos).toFixed(2);
    }

    // Operadores por turno
    document.getElementById("op-turno1").innerText = 
        operadoresPorTurno.manha.size > 0 ? 
        Array.from(operadoresPorTurno.manha).join(', ') : "-";
    
    document.getElementById("op-turno2").innerText = 
        operadoresPorTurno.tarde.size > 0 ? 
        Array.from(operadoresPorTurno.tarde).join(', ') : "-";
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
                <button onclick="carregarRelatorio()" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    🔄 Atualizar
                </button>
                <button onclick="window.location.href='index.html'" style="margin-left: 10px; padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    📝 Nova Leitura
                </button>
            </div>
        </div>
    `;
    
    document.querySelector('main').prepend(navegacao);
}

function mudarChiller() {
    const seletor = document.getElementById('seletor-chiller');
    if (seletor) {
        chillerAtual = seletor.value;
        document.getElementById("chiller").innerText = chillerAtual;
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

// Event listeners para navegação
document.addEventListener('click', (e) => {
    if (e.target.id === 'seletor-chiller') {
        mudarChiller();
    }
});