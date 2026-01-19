const _supabase = supabase.createClient('https://hnkwtzygwyelfjvutakm.supabase.co', 'sb_publishable_gKX0FdtJ2I6ax0TAFRMp5A_S1kNrBiS');

const form = document.querySelector("form");

if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const botao = form.querySelector("input[type='submit']");
        botao.disabled = true;
        botao.value = "Salvando...";

        const dataHoje = new Date().toISOString().split('T')[0];
        const horaAtual = new Date().getHours();
        
        // Regra de horários fixos baseada na hora atual
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
        } else {
            alert("Leitura registrada com sucesso!");
            form.reset();
        }

        botao.disabled = false;
        botao.value = "REGISTRAR";
    });
}