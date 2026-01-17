const form = document.querySelector("form")
const tabela = document.querySelector("table")
const coletaDados = []

form.addEventListener("submit", (e) => {
    e.preventDefault();

    // 1. Captura os valores que você quer levar
    const valorChiller = form.chiller.value;
    const valorTempGEL = document.getElementById("inTemp-entrada-GEL").value;

    // 2. Abre a página da tabela (certifique-se que o nome do arquivo está correto)
    const abaTabela = window.open("tabela.html", "_blank");

    // 3. O SEGREDO: Esperar a nova página carregar para "carimbar" os dados
    abaTabela.onload = () => {
        // 1. Cria um objeto com todos os dados do formulário de uma vez
        const formData = new FormData(form);
        // Dentro do onload, antes ou depois do loop:
        const campoData = abaTabela.document.getElementById("data");
        if (campoData) {
            campoData.innerText = new Date().toLocaleDateString('pt-BR');
        }

        // 2. Percorre cada campo capturado
        formData.forEach((valor, id) => {
            // Procura na nova aba um elemento que tenha o mesmo ID do campo
            const celula = abaTabela.document.getElementById(id);

            // Se encontrar, carimba o valor!
            if (celula) {
                celula.innerText = valor;
            }
        });

        alert("Relatório preenchido automaticamente!");
    };
});
