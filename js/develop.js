// Configuração inicial do Supabase
const _supabase = supabase.createClient('https://hnkwtzygwyelfjvutakm.supabase.co', 'sb_publishable_gKX0FdtJ2I6ax0TAFRMp5A_S1kNrBiS');

const form = document.querySelector("form");
const dataTabela = document.getElementById("data-tabela");

// --- EVENTO DE SUBMIT (SÓ RODA SE O FORMULÁRIO EXISTIR) ---
if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        // No seu HTML é um <input type="submit">, não um <button>
        const botao = form.querySelector("input[type='submit']");
        botao.disabled = true;
        botao.value = "Salvando...";

        const dataHoje = new Date().toISOString().split('T')[0];
        const horaAtual = new Date().getHours();
        let horarioAlvo = (horaAtual >= 0 && horaAtual < 6) ? "02:00" :
            (horaAtual >= 6 && horaAtual < 12) ? "08:00" :
                (horaAtual >= 12 && horaAtual < 18) ? "14:00" : "20:00";

        const dadosLeitura = {
            data: dataHoje,
            horario: horarioAlvo,
            chiller: document.getElementById("chiller").value,
            nome_operador: form["inNome"].value,
            ronda_status: document.querySelector('input[name="ronda"]:checked')?.value === "ok",
            temp_entrada_gel: parseFloat(form["inTemp-entrada-GEL"].value) || 0,
            temp_saida_gel: parseFloat(form["inTemp-saida-GEL"].value) || 0,
            press_entrada_gel: parseFloat(form["inPress-entrada-GEL"].value) || 0,
            press_saida_gel: parseFloat(form["inPress-saida-GEL"].value) || 0,
            delta_evap: parseFloat(form["inDeltaEvap"].value) || 0,
            temp_entrada_con: parseFloat(form["inTemp-entrada-CON"].value) || 0,
            temp_saida_con: parseFloat(form["inTemp-saida-CON"].value) || 0,
            delta_cond: parseFloat(form["inDeltaCond"].value) || 0,
            press_entrada_con: parseFloat(form["inPress-entrada-CON"].value) || 0,
            press_saida_con: parseFloat(form["inPress-saida-CON"].value) || 0,
            temp_oleo: parseFloat(form["inTempOleo"].value) || 0,
            press_util_oleo: parseFloat(form["inPress-util"].value) || 0,
            nivel_oleo: form["inNivel-oleo-carter"].value,
            press_evap: parseFloat(form["inPress-evap"].value) || 0,
            press_cond: parseFloat(form["inPress-cond"].value) || 0,
            temp_evap: parseFloat(form["inTemp-evap"].value) || 0,
            temp_cond: parseFloat(form["inTemp-cond"].value) || 0,
            v_abrs: parseFloat(form["inABRS"].value) || 0,
            v_acst: parseFloat(form["inACST"].value) || 0,
            v_bcrt: parseFloat(form["inBCRT"].value) || 0,
            a_a: parseFloat(form["inA"].value) || 0,
            a_b: parseFloat(form["inB"].value) || 0,
            a_c: parseFloat(form["inC"].value) || 0,
            demanda: parseFloat(form["inDemanda"].value) || 0
        };

        const { error } = await _supabase
            .from('leituras_centrifugas')
            .upsert(dadosLeitura);

        if (error) {
            alert("Erro ao salvar: " + error.message);
            botao.disabled = false;
            botao.value = "REGISTRAR";
            return;
        }

        alert("Leitura registrada com sucesso!");
        form.reset();

        // Se a tabela estiver na mesma página, atualiza
        if (dataTabela) carregarDadosIniciais();

        botao.disabled = false;
        botao.value = "REGISTRAR";
    });
}

// --- FUNÇÃO DE ANÁLISE ---
function processarRelatorio(dados) {
    if (!dataTabela) return;

    // Limpa dados anteriores
    const celulas = document.querySelectorAll("tbody td[class^='in']");
    celulas.forEach(c => c.innerText = "-");
    const nomesOperadores = document.querySelectorAll(".nome");
    nomesOperadores.forEach(n => n.innerText = "");
    
    // Desmarca todos os checkboxes de ronda antes de preencher
    const todosChecks = document.querySelectorAll("input[type='checkbox']");
    todosChecks.forEach(check => check.checked = false);

    if (!dados || dados.length === 0) {
        atualizarRodape(0, 0, 0);
        return;
    }

    dados.forEach(leitura => {
        const linha = document.querySelector(`tr[data-horario="${leitura.horario}"]`);
        
        if (linha) {
            const preencher = (classe, valor) => {
                const el = linha.querySelector(classe);
                if (el) el.innerText = valor !== null && valor !== undefined ? valor : "-";
            };

            // Preenchimento dos campos técnicos
            preencher(".inTemp-entrada-GEL", leitura.temp_entrada_gel);
            preencher(".inTemp-saida-GEL", leitura.temp_saida_gel);
            preencher(".inPress-entrada-GEL", leitura.press_entrada_gel);
            preencher(".inPress-saida-GEL", leitura.press_saida_gel);
            preencher(".inDeltaEvap", leitura.delta_evap);
            preencher(".inTemp-entrada-CON", leitura.temp_entrada_con);
            preencher(".inTemp-saida-CON", leitura.temp_saida_con);
            preencher(".inDeltaCond", leitura.delta_cond);
            preencher(".inPress-entrada-CON", leitura.press_entrada_con);
            preencher(".inPress-saida-CON", leitura.press_saida_con);
            preencher(".inTempOleo", leitura.temp_oleo);
            preencher(".inPress-util", leitura.press_util_oleo);
            preencher(".inNivel-oleo-carter", leitura.nivel_oleo);
            preencher(".inPress-evap", leitura.press_evap);
            preencher(".inPress-cond", leitura.press_cond);
            preencher(".inTemp-evap", leitura.temp_evap);
            preencher(".inTemp-cond", leitura.temp_cond);
            preencher(".inABRS", leitura.v_abrs);
            preencher(".inACST", leitura.v_acst);
            preencher(".inBCRT", leitura.v_bcrt);
            preencher(".inA", leitura.a_a);
            preencher(".inB", leitura.a_b);
            preencher(".inC", leitura.a_c);
            preencher(".inDemanda", leitura.demanda + "%");

            // Nome do Operador
            const proximaLinha = linha.nextElementSibling;
            if (proximaLinha && proximaLinha.querySelector(".nome")) {
                proximaLinha.querySelector(".nome").innerText = leitura.nome_operador;
            }

            // --- Lógica da Ronda (Checkboxes) ---
            const statusRonda = leitura.ronda_status; // Espera true ou false
            const checkOk = document.querySelector(`.check-ok-${leitura.horario}`);
            const checkNok = document.querySelector(`.check-nok-${leitura.horario}`);

            if (statusRonda === true && checkOk) checkOk.checked = true;
            if (statusRonda === false && checkNok) checkNok.checked = true;
        }
    });

    // Cálculos de rodapé
    const total = dados.length;
    const somaEvap = dados.reduce((acc, curr) => acc + (curr.delta_evap || 0), 0);
    const somaCond = dados.reduce((acc, curr) => acc + (curr.delta_cond || 0), 0);
    const somaDemanda = dados.reduce((acc, curr) => acc + (curr.demanda || 0), 0);

    atualizarRodape(somaDemanda / total, somaEvap / total, somaCond / total);
}

function atualizarRodape(dem, evap, cond) {
    const spans = document.querySelectorAll("tfoot span");
    if (spans.length >= 3) {
        spans[0].innerText = (dem || 0).toFixed(2) + "%";
        spans[1].innerText = (evap || 0).toFixed(2);
        spans[2].innerText = (cond || 0).toFixed(2);
    }
}

// --- INICIALIZAÇÃO ---
async function carregarDadosIniciais() {
    const chillerEl = document.getElementById("chiller");
    if (!chillerEl) return;

    if (dataTabela) dataTabela.innerText = new Date().toLocaleDateString('pt-BR');

    const dataHoje = new Date().toISOString().split('T')[0];
    const chillerAtual = chillerEl.value || chillerEl.innerText;

    const { data, error } = await _supabase
        .from('leituras_centrifugas')
        .select('*')
        .eq('data', dataHoje)
        .eq('chiller', chillerAtual);

    if (data) processarRelatorio(data);
}

// Só adiciona o listener se o chiller for um select (página de form)
const chillerEl = document.getElementById("chiller");
if (chillerEl && chillerEl.tagName === "SELECT") {
    chillerEl.addEventListener("change", carregarDadosIniciais);
}

carregarDadosIniciais();