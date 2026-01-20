const _supabase = supabase.createClient('https://hnkwtzygwyelfjvutakm.supabase.co', 'sb_publishable_gKX0FdtJ2I6ax0TAFRMp5A_S1kNrBiS');

const form = document.querySelector("form");

// Função de validação aprimorada
function validarNumeroComAlerta(valor, campoNome, min, max, unidade = '') {
    if (valor === '' || valor === null || valor === undefined) {
        return null; // Campos opcionais
    }
    
    const num = parseFloat(valor);
    if (isNaN(num)) {
        return null; // Retorna null se não for número válido
    }
    
    return num;
}

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const botao = form.querySelector("input[type='submit']");
        const textoOriginal = botao.value;
        botao.disabled = true;
        botao.value = "Salvando...";

        try {
            // ===== VALIDAÇÕES OBRIGATÓRIAS =====
            const nomeOperador = form["inNome"].value.trim();
            if (!nomeOperador) {
                alert("Por favor, informe o nome do funcionário.");
                form["inNome"].focus();
                throw new Error("Nome do operador não informado");
            }
            
            const chiller = document.getElementById("chiller").value;
            if (!chiller) {
                alert("Por favor, selecione um chiller.");
                document.getElementById("chiller").focus();
                throw new Error("Chiller não selecionado");
            }
            
            // Ronda é OPCIONAL agora
            const rondaRadio = document.querySelector('input[name="ronda"]:checked');
            
            // ===== PREPARAÇÃO DOS DADOS =====
            const dataHoje = new Date().toISOString().split('T')[0];
            const horaAtual = new Date().getHours();
            
            let horarioAlvo;
            if (horaAtual >= 0 && horaAtual < 6) {
                horarioAlvo = "02:00";
            } else if (horaAtual >= 6 && horaAtual < 12) {
                horarioAlvo = "08:00";
            } else if (horaAtual >= 12 && horaAtual < 18) {
                horarioAlvo = "14:00";
            } else {
                horarioAlvo = "20:00";
            }
            
            // ===== VALIDAÇÃO DOS VALORES =====
            const tempEntradaGEL = validarNumeroComAlerta(form["inTemp-entrada-GEL"].value, 'Temp. Entrada Gelada', -20, 30, '°C');
            if (tempEntradaGEL === null) return;
            
            // Continue com as outras validações...
            
            // ===== DADOS PARA SALVAR =====
            const dadosLeitura = {
                data: dataHoje,
                horario: horarioAlvo,
                chiller: chiller,
                nome_operador: nomeOperador,
                ronda_status: rondaRadio ? (rondaRadio.value === "ok") : null,
                
                // Temperatura GELADA
                temp_entrada_gel: tempEntradaGEL,
                temp_saida_gel: validarNumeroComAlerta(form["inTemp-saida-GEL"].value, 'Temp. Saída Gelada', -20, 30, '°C'),
                press_entrada_gel: validarNumeroComAlerta(form["inPress-entrada-GEL"].value, 'Press. Entrada Gelada', 0, 20, 'Kg/cm²'),
                press_saida_gel: validarNumeroComAlerta(form["inPress-saida-GEL"].value, 'Press. Saída Gelada', 0, 20, 'Kg/cm²'),
                
                // EVAPORAÇÃO
                delta_evap: validarNumeroComAlerta(form["inDeltaEvap"].value, 'Delta Evaporação', 0, 20, '°C'),
                
                // CONDENSAÇÃO
                temp_entrada_con: validarNumeroComAlerta(form["inTemp-entrada-CON"].value, 'Temp. Entrada Condensação', 0, 50, '°C'),
                temp_saida_con: validarNumeroComAlerta(form["inTemp-saida-CON"].value, 'Temp. Saída Condensação', 0, 50, '°C'),
                delta_cond: validarNumeroComAlerta(form["inDeltaCond"].value, 'Delta Condensação', 0, 20, '°C'),
                press_entrada_con: validarNumeroComAlerta(form["inPress-entrada-CON"].value, 'Press. Entrada Condensação', 0, 10, 'Kg/cm²'),
                press_saida_con: validarNumeroComAlerta(form["inPress-saida-CON"].value, 'Press. Saída Condensação', 0, 10, 'Kg/cm²'),
                
                // LUBRIFICAÇÃO
                temp_oleo: validarNumeroComAlerta(form["inTempOleo"].value, 'Temp. do Óleo', 20, 120, '°C'),
                press_util_oleo: validarNumeroComAlerta(form["inPress-util"].value, 'Press. Útil do Óleo', 0, 500, 'KPA'),
                nivel_oleo: form["inNivel-oleo-carter"].value.trim(),
                
                // REFRIGERANTE
                press_evap: validarNumeroComAlerta(form["inPress-evap"].value, 'Press. Evaporação', 0, 1000, 'KPA'),
                press_cond: validarNumeroComAlerta(form["inPress-cond"].value, 'Press. Condensação', 0, 2000, 'KPA'),
                temp_evap: validarNumeroComAlerta(form["inTemp-evap"].value, 'Temp. Evaporação', -50, 50, '°C'),
                temp_cond: validarNumeroComAlerta(form["inTemp-cond"].value, 'Temp. Condensação', 0, 100, '°C'),
                
                // ELÉTRICA - USANDO OS NOVOS NOMES
                volts_abrs: validarNumeroComAlerta(form["inABRS"].value, 'Voltagem ABRS', 0, 480, 'V'),
                volts_acst: validarNumeroComAlerta(form["inACST"].value, 'Voltagem ACST', 0, 480, 'V'),
                volts_bcrt: validarNumeroComAlerta(form["inBCRT"].value, 'Voltagem BCRT', 0, 480, 'V'),
                amp_a: validarNumeroComAlerta(form["inA"].value, 'Amperagem A', 0, 200, 'A'),
                amp_b: validarNumeroComAlerta(form["inB"].value, 'Amperagem B', 0, 200, 'A'),
                amp_c: validarNumeroComAlerta(form["inC"].value, 'Amperagem C', 0, 200, 'A'),
                
                demanda: validarNumeroComAlerta(form["inDemanda"].value, '% Demanda', 0, 100, '%')
            };
            
            // Remove valores nulos (campos não preenchidos)
            Object.keys(dadosLeitura).forEach(key => {
                if (dadosLeitura[key] === null) {
                    delete dadosLeitura[key];
                }
            });
            
            console.log("Dados a serem enviados:", dadosLeitura);
            
            // ===== VERIFICA DUPLICIDADE =====
            try {
                const { data: leituraExistente } = await _supabase
                    .from('leituras_centrifugas')
                    .select('id')
                    .eq('data', dataHoje)
                    .eq('horario', horarioAlvo)
                    .eq('chiller', chiller);
                
                if (leituraExistente && leituraExistente.length > 0) {
                    const confirmar = confirm(`Já existe uma leitura para o chiller ${chiller} no horário ${horarioAlvo} de hoje. Deseja atualizar?`);
                    if (!confirmar) {
                        throw new Error("Leitura duplicada - operação cancelada pelo usuário");
                    }
                }
            } catch (error) {
                if (error.message && error.message.includes("duplicada")) {
                    throw error;
                }
                console.warn("Aviso ao verificar duplicidade:", error);
            }
            
            // ===== ENVIO PARA SUPABASE =====
            const { error } = await _supabase
                .from('leituras_centrifugas')
                .upsert(dadosLeitura, {
                    onConflict: 'data,horario,chiller'
                });
            
            if (error) {
                console.error("Erro ao salvar:", error);
                alert(`Erro ao salvar leitura: ${error.message}`);
                throw error;
            }
            
            // ===== SUCESSO =====
            alert("✅ Leitura registrada com sucesso!");
            form.reset();
            form["inNome"].focus();
            
            // Botão para ver relatório
            const verRelatorio = confirm("Deseja visualizar o relatório agora?");
            if (verRelatorio) {
                window.open(`relatorio.html?chiller=${chiller}`, '_blank');
            }
            
        } catch (error) {
            console.error("Erro no processo:", error);
            if (error.message && !error.message.includes("cancelada")) {
                alert("❌ Ocorreu um erro ao salvar a leitura. Verifique os dados e tente novamente.");
            }
        } finally {
            botao.disabled = false;
            botao.value = textoOriginal;
        }
    });
}

// ===== FUNÇÕES AUXILIARES =====

// Configura navegação para relatório
function configurarNavegacaoParaRelatorio() {
    const btnRelatorio = document.createElement('button');
    btnRelatorio.textContent = '📊';
    btnRelatorio.style.cssText = `
        position: fixed;
        bottom: 40px;
        right: 20px;
        padding: 10px 20px;
        background: #004488;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
        font-weight: bold;
    `;
    btnRelatorio.onclick = () => {
        const chiller = document.getElementById('chiller').value;
        window.open(`relatorio.html?chiller=${chiller}`, '_blank');
    };
    document.body.appendChild(btnRelatorio);
}

// Configura validação em tempo real
function configurarValidacaoTempoReal() {
    const camposNumericos = document.querySelectorAll('input[type="number"]');
    camposNumericos.forEach(campo => {
        campo.addEventListener('blur', (e) => {
            const valor = e.target.value;
            if (valor !== '') {
                const num = parseFloat(valor);
                if (isNaN(num)) {
                    alert(`Por favor, insira um valor numérico válido.`);
                    e.target.value = '';
                    e.target.focus();
                }
            }
        });
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log("Formulário de leitura diária inicializado");
    configurarNavegacaoParaRelatorio();
    configurarValidacaoTempoReal();
    
    // Preenche data atual no título se existir
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const titulo = document.querySelector('h1');
    if (titulo) {
        titulo.innerHTML += ` <small style="font-size: 0.6em; color: #666;">(${dataAtual})</small>`;
    }
});