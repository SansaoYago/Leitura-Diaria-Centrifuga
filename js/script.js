const form = document.querySelector("form");

form.addEventListener("submit", (e) => {
    e.preventDefault();

    // 1. Define o horário alvo com base na hora atual
    const horaAtual = new Date().getHours();
    let horarioAlvo = (horaAtual >= 0 && horaAtual < 6) ? "02:00" :
                      (horaAtual >= 6 && horaAtual < 12) ? "08:00" :
                      (horaAtual >= 12 && horaAtual < 18) ? "14:00" : "20:00";

    const abaTabela = window.open("tabela.html", "_blank");

    abaTabela.onload = () => {
        const doc = abaTabela.document;
        const formData = new FormData(form);

        // 2. Preenche o N° do Chiller no topo
        const campoChiller = doc.getElementById("chiller");
        if (campoChiller) campoChiller.innerText = formData.get("chiller");

        // 3. Preenche a Data
        const campoData = doc.getElementById("data");
        if (campoData) campoData.innerText = new Date().toLocaleDateString('pt-BR');

        // 4. Localiza a linha do horário correto
        const linhaTecnica = doc.querySelector(`tr[data-horario="${horarioAlvo}"]`);
        
        if (linhaTecnica) {
            // Preenche todos os campos técnicos automaticamente casando o 'name' do input com a 'classe' da TD
            formData.forEach((valor, nomeCampo) => {
                const celula = linhaTecnica.querySelector(`.${nomeCampo}`);
                if (celula) celula.innerText = valor;
            });

            // 5. Preenche o NOME do funcionário
            // O nextElementSibling pega a linha cinza logo abaixo da linha técnica
            const linhaNome = linhaTecnica.nextElementSibling; 
            if (linhaNome) {
                const celulaNome = linhaNome.querySelector(".nome");
                // No seu formulário o name é "inNome"
                const valorNome = formData.get("inNome");
                
                if (celulaNome && valorNome) {
                    celulaNome.innerText = valorNome;
                }
            }
        } else {
            console.error("Linha de horário não encontrada na tabela.");
        }
    };
});