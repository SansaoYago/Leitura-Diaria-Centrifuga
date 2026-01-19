const _supabase = supabase.createClient('https://hnkwtzygwyelfjvutakm.supabase.co', 'sb_publishable_gKX0FdtJ2I6ax0TAFRMp5A_S1kNrBiS');

async function carregarRelatorio() {
    const dataTabela = document.getElementById("data-tabela");
    const chillerEl = document.getElementById("chiller");
    
    // Define a data de hoje no topo da tabela
    if (dataTabela) dataTabela.innerText = new Date().toLocaleDateString('pt-BR');

    // Pega o número do chiller do HTML (ex: "1.1")
    const chillerAtual = chillerEl ? (chillerEl.innerText || chillerEl.value) : "1.1";
    const dataHoje = new Date().toISOString().split('T')[0];

    const { data, error } = await _supabase
        .from('leituras_centrifugas')
        .select('*')
        .eq('data', dataHoje)
        .eq('chiller', chillerAtual);

    if (error) {
        console.error("Erro ao buscar dados:", error.message);
        return;
    }

    if (data) processarRelatorio(data);
}

function processarRelatorio(dados) {
    // 1. Limpa a tabela antes de preencher para não acumular lixo visual
    document.querySelectorAll("tbody td[class^='in']").forEach(c => c.innerText = "-");
    document.querySelectorAll(".nome").forEach(n => n.innerText = "");
    document.querySelectorAll("input[type='checkbox']").forEach(ck => ck.checked = false);

    dados.forEach(leitura => {
        // Localiza a linha correta pelo horário (02:00, 08:00, etc)
        const linha = document.querySelector(`tr[data-horario="${leitura.horario}"]`);
        
        if (linha) {
            const preencher = (classe, valor) => {
                const el = linha.querySelector(classe);
                if (el) el.innerText = (valor !== null && valor !== undefined) ? valor : "-";
            };

            // Preenchimento de todos os campos técnicos
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

            // Preenche o nome do operador na linha de assinatura (logo abaixo da linha de dados)
            const proximaLinha = linha.nextElementSibling;
            if (proximaLinha && proximaLinha.querySelector(".nome")) {
                proximaLinha.querySelector(".nome").innerText = leitura.nome_operador;
            }

            // Marca os checkboxes da Ronda nas Torres
            const status = (leitura.ronda_status === true || leitura.ronda_status === "true");
            const ckOk = document.querySelector(`.check-ok-${leitura.horario}`);
            const ckNok = document.querySelector(`.check-nok-${leitura.horario}`);
            if (ckOk && ckNok) {
                ckOk.checked = status;
                ckNok.checked = !status;
            }
        }
    });

    // 2. Cálculo das Médias para o Rodapé (Canto inferior)
    const total = dados.length;
    if (total > 0) {
        const avg = (campo) => (dados.reduce((acc, c) => acc + (c[campo] || 0), 0) / total).toFixed(2);
        
        // Atribui os valores às IDs correspondentes no HTML
        const elDemanda = document.getElementById("avg-demanda");
        const elEvap = document.getElementById("avg-evap");
        const elCond = document.getElementById("avg-cond");

        if (elDemanda) elDemanda.innerText = avg('demanda') + "%";
        if (elEvap) elEvap.innerText = avg('delta_evap');
        if (elCond) elCond.innerText = avg('delta_cond');
    }
}

// Inicia a execução
carregarRelatorio();