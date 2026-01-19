const _supabase = supabase.createClient('https://hnkwtzygwyelfjvutakm.supabase.co', 'sb_publishable_gKX0FdtJ2I6ax0TAFRMp5A_S1kNrBiS');

async function carregarRelatorio() {
    const dataTabela = document.getElementById("data-tabela");
    const chillerEl = document.getElementById("chiller");
    if (dataTabela) dataTabela.innerText = new Date().toLocaleDateString('pt-BR');

    const chillerAtual = chillerEl ? (chillerEl.value || chillerEl.innerText) : "1.1";
    const dataHoje = new Date().toISOString().split('T')[0];

    const { data, error } = await _supabase
        .from('leituras_centrifugas')
        .select('*')
        .eq('data', dataHoje)
        .eq('chiller', chillerAtual);

    if (data) processarRelatorio(data);
}

function processarRelatorio(dados) {
    document.querySelectorAll("tbody td[class^='in']").forEach(c => c.innerText = "-");
    document.querySelectorAll(".nome").forEach(n => n.innerText = "");
    document.querySelectorAll("input[type='checkbox']").forEach(ck => ck.checked = false);

    dados.forEach(leitura => {
        const linha = document.querySelector(`tr[data-horario="${leitura.horario}"]`);
        if (linha) {
            const preencher = (classe, valor) => {
                const el = linha.querySelector(classe);
                if (el) el.innerText = (valor !== null && valor !== undefined) ? valor : "-";
            };

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

            const proximaLinha = linha.nextElementSibling;
            if (proximaLinha && proximaLinha.querySelector(".nome")) {
                proximaLinha.querySelector(".nome").innerText = leitura.nome_operador;
            }

            const status = (leitura.ronda_status === true || leitura.ronda_status === "true");
            const ckOk = document.querySelector(`.check-ok-${leitura.horario}`);
            const ckNok = document.querySelector(`.check-nok-${leitura.horario}`);
            if (ckOk && ckNok) {
                ckOk.checked = status;
                ckNok.checked = !status;
            }
        }
    });

    const total = dados.length;
    if (total > 0) {
        const avg = (campo) => dados.reduce((acc, c) => acc + (c[campo] || 0), 0) / total;
        const spans = document.querySelectorAll("tfoot span");
        if (spans.length >= 3) {
            spans[0].innerText = avg('demanda').toFixed(2) + "%";
            spans[1].innerText = avg('delta_evap').toFixed(2);
            spans[2].innerText = avg('delta_cond').toFixed(2);
        }
    }
}

carregarRelatorio();