const form = document.querySelector("form");

form.addEventListener("submit", (e) => {
    e.preventDefault();

    // 1. Definir horário alvo
    const horaAtual = new Date().getHours();
    let horarioAlvo = (horaAtual >= 0 && horaAtual < 6) ? "02:00" :
                      (horaAtual >= 6 && horaAtual < 12) ? "08:00" :
                      (horaAtual >= 12 && horaAtual < 18) ? "14:00" : "20:00";

    // 2. Capturar dados do formulário ANTES de abrir a nova aba
    const formData = new FormData(form);
    const isOkChecked = document.getElementById("inRondaOk").checked;
    const isNOkChecked = document.getElementById("inRondaNOk").checked;
    const chillerVal = document.getElementById("chiller").value;
    const dataHoje = new Date().toLocaleDateString('pt-BR');

    // 3. Abrir a tabela
    const abaTabela = window.open("tabela.html", "_blank");

    abaTabela.onload = () => {
        const doc = abaTabela.document;

        // --- PREENCHIMENTO DOS DADOS TÉCNICOS ---
        const linhaTecnica = doc.querySelector(`tr[data-horario="${horarioAlvo}"]`);
        if (linhaTecnica) {
            formData.forEach((valor, nomeCampo) => {
                const celula = linhaTecnica.querySelector(`.${nomeCampo}`);
                if (celula) celula.innerText = valor;
            });

            const linhaNome = linhaTecnica.nextElementSibling;
            if (linhaNome) {
                const celulaNome = linhaNome.querySelector(".nome");
                if (celulaNome) celulaNome.innerText = formData.get("inNome");
            }
        }

        // --- PREENCHIMENTO DO CHILLER ---
        const campoChiller = doc.getElementById("chiller");
        if (campoChiller) campoChiller.innerText = "CH" + chillerVal;

        // --- PREENCHIMENTO DA DATA (Ajustado para id 'data-tabela') ---
        const campoData = doc.getElementById("data-tabela") || doc.getElementById("data");
        if (campoData) campoData.innerText = dataHoje;

        // --- LÓGICA DO CHECKBOX ---
        if (isOkChecked) {
            const selector = `.check-ok-${horarioAlvo.replace(':', '\\:')}`;
            const checkOk = doc.querySelector(selector);
            if (checkOk) checkOk.checked = true;
        } else if (isNOkChecked) {
            const selector = `.check-nok-${horarioAlvo.replace(':', '\\:')}`;
            const checkNOk = doc.querySelector(selector);
            if (checkNOk) checkNOk.checked = true;
        }
    };
});