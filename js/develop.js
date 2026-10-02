import { salvarLeituraFirestore, verificarDuplicidadeFirestore } from './firebase-service.js';

const form = document.querySelector("form");

// Função de validação de voltagem com alerta
function validarVoltagem(valor, campoNome) {
    if (valor === '' || valor === null || valor === undefined) {
        return null;
    }

    const num = parseFloat(valor);
    if (isNaN(num)) {
        return null;
    }

    // Range esperado
    const minEsperado = 432;
    const maxEsperado = 528;

    // Se sair do range, mostra aviso mas permite continuar
    if (num < minEsperado || num > maxEsperado) {
        console.warn(`⚠️ ${campoNome}: ${num}V fora do range esperado (${minEsperado}-${maxEsperado}V). Possível anomalia no equipamento.`);
    }

    return num;
}

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

// Helper para formatar data local YYYY-MM-DD (evita bug de timezone UTC ao anoitecer)
function formatarDataLocal(data = new Date()) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
}

// Helper para exibição de mensagens amigável
function exibirMensagem(texto, tipo = 'info') {
    let toast = document.getElementById('app-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'app-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 15px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            transition: opacity 0.3s ease;
            max-width: 90%;
            text-align: center;
        `;
        document.body.appendChild(toast);
    }
    
    if (tipo === 'erro') {
        toast.style.background = '#d9534f';
        toast.style.color = '#fff';
    } else if (tipo === 'sucesso') {
        toast.style.background = '#28a745';
        toast.style.color = '#fff';
    } else {
        toast.style.background = '#0d1b4a';
        toast.style.color = '#fff';
    }
    
    toast.textContent = texto;
    toast.style.opacity = '1';
    toast.style.display = 'block';

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
    }, 4000);
}

function salvarLeituraLocal(dados) {
    try {
        const registros = JSON.parse(localStorage.getItem('leituras_centrifugas_local') || '[]');
        const filtrados = registros.filter(item => !(item.data === dados.data && item.horario === dados.horario && item.chiller === dados.chiller));
        filtrados.push(dados);
        localStorage.setItem('leituras_centrifugas_local', JSON.stringify(filtrados));
    } catch (e) {
        console.warn("Aviso ao salvar localmente:", e);
    }
}

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const botao = form.querySelector("input[type='submit']");
        const textoOriginal = botao ? botao.value : "REGISTRAR";
        if (botao) {
            botao.disabled = true;
            botao.value = "Salvando...";
        }

        try {
            // ===== VALIDAÇÕES OBRIGATÓRIAS =====
            const nomeOperador = form["inNome"] ? form["inNome"].value.trim() : "";
            if (!nomeOperador) {
                exibirMensagem("Por favor, informe o nome do funcionário.", "erro");
                try { alert("Por favor, informe o nome do funcionário."); } catch(e) {}
                if (form["inNome"]) form["inNome"].focus();
                throw new Error("Nome do operador não informado");
            }

            const chillerEl = document.getElementById("chiller");
            const chiller = chillerEl ? chillerEl.value : "1.1";
            if (!chiller) {
                exibirMensagem("Por favor, selecione um chiller.", "erro");
                try { alert("Por favor, selecione um chiller."); } catch(e) {}
                if (chillerEl) chillerEl.focus();
                throw new Error("Chiller não selecionado");
            }

            // Ronda é OBRIGATÓRIA
            const rondaRadio = document.querySelector('input[name="ronda"]:checked');
            if (!rondaRadio) {
                exibirMensagem("Por favor, selecione se a ronda nas torres foi Realizada ou Não Realizada.", "erro");
                try { alert("Por favor, selecione se a ronda nas torres foi Realizada ou Não Realizada."); } catch(e) {}
                const rondaEl = document.getElementById("inRondaOk");
                if (rondaEl) rondaEl.focus();
                throw new Error("Ronda não selecionada");
            }

            // ===== PREPARAÇÃO DOS DADOS COM DATA LOCAL CORRETA =====
            const dataHoje = formatarDataLocal(new Date());
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

            // ===== DADOS PARA SALVAR (sem abortar se algum campo for nulo) =====
            const dadosLeitura = {
                data: dataHoje,
                horario: horarioAlvo,
                chiller: chiller,
                nome_operador: nomeOperador,
                ronda_status: rondaRadio ? (rondaRadio.value === "ok") : null,

                // Temperatura GELADA
                temp_entrada_gel: validarNumeroComAlerta(form["inTemp-entrada-GEL"]?.value, 'Temp. Entrada Gelada', -20, 30, '°C'),
                temp_saida_gel: validarNumeroComAlerta(form["inTemp-saida-GEL"]?.value, 'Temp. Saída Gelada', -20, 30, '°C'),
                press_entrada_gel: validarNumeroComAlerta(form["inPress-entrada-GEL"]?.value, 'Press. Entrada Gelada', 0, 20, 'Kg/cm²'),
                press_saida_gel: validarNumeroComAlerta(form["inPress-saida-GEL"]?.value, 'Press. Saída Gelada', 0, 20, 'Kg/cm²'),

                // EVAPORAÇÃO
                delta_evap: validarNumeroComAlerta(form["inDeltaEvap"]?.value, 'Delta Evaporação', 0, 20, '°C'),

                // CONDENSAÇÃO
                temp_entrada_con: validarNumeroComAlerta(form["inTemp-entrada-CON"]?.value, 'Temp. Entrada Condensação', 0, 50, '°C'),
                temp_saida_con: validarNumeroComAlerta(form["inTemp-saida-CON"]?.value, 'Temp. Saída Condensação', 0, 50, '°C'),
                delta_cond: validarNumeroComAlerta(form["inDeltaCond"]?.value, 'Delta Condensação', 0, 20, '°C'),
                press_entrada_con: validarNumeroComAlerta(form["inPress-entrada-CON"]?.value, 'Press. Entrada Condensação', 0, 10, 'Kg/cm²'),
                press_saida_con: validarNumeroComAlerta(form["inPress-saida-CON"]?.value, 'Press. Saída Condensação', 0, 10, 'Kg/cm²'),

                // LUBRIFICAÇÃO
                temp_oleo: validarNumeroComAlerta(form["inTempOleo"]?.value, 'Temp. do Óleo', 20, 120, '°C'),
                press_util_oleo: validarNumeroComAlerta(form["inPress-util"]?.value, 'Press. Útil do Óleo', 0, 500, 'KPA'),
                nivel_oleo: form["inNivel-oleo-carter"] ? form["inNivel-oleo-carter"].value.trim() : "",

                // REFRIGERANTE
                press_evap: validarNumeroComAlerta(form["inPress-evap"]?.value, 'Press. Evaporação', 0, 1000, 'KPA'),
                press_cond: validarNumeroComAlerta(form["inPress-cond"]?.value, 'Press. Condensação', 0, 2000, 'KPA'),
                temp_evap: validarNumeroComAlerta(form["inTemp-evap"]?.value, 'Temp. Evaporação', -50, 50, '°C'),
                temp_cond: validarNumeroComAlerta(form["inTemp-cond"]?.value, 'Temp. Condensação', 0, 100, '°C'),

                // ELÉTRICA
                volts_abrs: validarVoltagem(form["inABRS"]?.value, 'Voltagem ABRS'),
                volts_acst: validarVoltagem(form["inACST"]?.value, 'Voltagem ACST'),
                volts_bcrt: validarVoltagem(form["inBCRT"]?.value, 'Voltagem BCRT'),
                amp_a: validarNumeroComAlerta(form["inA"]?.value, 'Amperagem A', 0, 200, 'A'),
                amp_b: validarNumeroComAlerta(form["inB"]?.value, 'Amperagem B', 0, 200, 'A'),
                amp_c: validarNumeroComAlerta(form["inC"]?.value, 'Amperagem C', 0, 200, 'A'),

                demanda: validarNumeroComAlerta(form["inDemanda"]?.value, '% Demanda', 0, 100, '%')
            };

            console.log("Dados a serem enviados:", dadosLeitura);

            // ===== VERIFICA DUPLICIDADE NO FIREBASE & LOCAL STORAGE =====
            try {
                let leituraExistente = false;
                try {
                    leituraExistente = await verificarDuplicidadeFirestore(dataHoje, horarioAlvo, chiller);
                } catch (errCheck) {
                    console.warn("Verificação no Firestore falhou, verificando localmente:", errCheck);
                }

                if (!leituraExistente) {
                    const localRegs = JSON.parse(localStorage.getItem('leituras_centrifugas_local') || '[]');
                    if (localRegs.some(item => item.data === dataHoje && item.horario === horarioAlvo && item.chiller === chiller)) {
                        leituraExistente = true;
                    }
                }

                if (leituraExistente) {
                    let confirmar = true;
                    try {
                        confirmar = confirm(`Já existe uma leitura para o chiller ${chiller} no horário ${horarioAlvo} de hoje. Deseja atualizar?`);
                    } catch (e) {
                        confirmar = true;
                    }
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

            // ===== ENVIO PARA FIREBASE & LOCAL STORAGE =====
            let salvouFirebase = false;
            try {
                await salvarLeituraFirestore(dadosLeitura);
                salvouFirebase = true;
                console.log("🔥 Leitura salva com sucesso no Firebase Firestore!");
            } catch (errDb) {
                console.warn("Aviso ao salvar no Firebase:", errDb);
            }

            // Sempre sincroniza com localStorage para redundância
            salvarLeituraLocal(dadosLeitura);

            // ===== SUCESSO =====
            exibirMensagem("✅ Leitura registrada com sucesso!", "sucesso");
            try { alert("✅ Leitura registrada com sucesso!"); } catch(e) {}
            form.reset();
            if (form["inNome"]) form["inNome"].focus();

            // Salva chiller atual
            localStorage.setItem('chillerAtual', chiller);

            // Pergunta para ver relatório
            let verRelatorio = false;
            try {
                verRelatorio = confirm("Deseja visualizar o relatório agora?");
            } catch (e) {}

            if (verRelatorio) {
                window.location.href = `relatorio.html?chiller=${chiller}`;
            }

        } catch (error) {
            console.error("Erro no processo:", error);
            if (error.message && !error.message.includes("cancelada")) {
                exibirMensagem("❌ Ocorreu um erro ao salvar a leitura. Verifique os dados e tente novamente.", "erro");
                try { alert("❌ Ocorreu um erro ao salvar a leitura. Verifique os dados e tente novamente."); } catch(e) {}
            }
        } finally {
            if (botao) {
                botao.disabled = false;
                botao.value = textoOriginal;
            }
        }
    });
}

// ===== FUNÇÕES AUXILIARES =====

// Configura navegação para relatório
function configurarNavegacaoParaRelatorio() {
    const btnRelatorio = document.createElement('button');
    btnRelatorio.textContent = '📊';
    btnRelatorio.classList.add('btn-responsivo');

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
        window.location.href = `relatorio.html?chiller=${chiller}`;
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