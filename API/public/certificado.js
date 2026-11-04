// =====================================================
// Qualquer usuário logado pode ver o certificado
// =====================================================

const usuario = JSON.parse(sessionStorage.getItem('usuario'));

if (!usuario) {
    window.location.href = 'login.html';
}

const mensagem = document.getElementById('mensagem');

document.getElementById('boasVindas').textContent = 'Olá, ' + usuario.nome;

document.getElementById('btnSair').addEventListener('click', () => {
    sessionStorage.removeItem('usuario');
    window.location.href = 'login.html';
});

document.getElementById('btnVoltar').addEventListener('click', () => {
    window.history.back();
});


// O número do certificado vem na própria URL: certificado.html?id=3
const certificadoId = Number(
    new URLSearchParams(window.location.search).get('id')
);


function formatarData(data) {
    return new Date(data).toLocaleDateString('pt-BR');
}


async function carregarCertificado() {

    if (!certificadoId) {
        mensagem.textContent = 'Certificado não informado.';
        return;
    }

    try {

        const resposta = await fetch(
            '/api/certificados/' + certificadoId +
            '?usuario_id=' + usuario.id
        );

        const dados = await resposta.json();

        if (!dados.sucesso) {
            mensagem.textContent = dados.mensagem;
            return;
        }

        const c = dados.certificado;

        document.getElementById('numero').textContent = 'Nº ' + c.numero;
        document.getElementById('rocha').textContent = c.nome_rocha;
        document.getElementById('local').textContent = c.local_descoberta;
        document.getElementById('peso').textContent =
            Number(c.peso_kg).toLocaleString('pt-BR') + ' kg';
        document.getElementById('cacador').textContent = c.cacador;
        document.getElementById('dataRegistro').textContent = formatarData(c.data_registro);
        document.getElementById('geologos').textContent = c.geologos.join(', ');
        document.getElementById('dataEmissao').textContent = formatarData(c.data_emissao);

        // Botão que baixa o PDF
        const botaoPdf = document.getElementById('btnPdf');
        botaoPdf.href = '/api/certificados/' + certificadoId +
            '/pdf?usuario_id=' + usuario.id;

        document.getElementById('dados').hidden = false;
        botaoPdf.hidden = false;

    }

    catch (erro) {
        console.error(erro);
        mensagem.textContent = 'Não foi possível carregar o certificado.';
    }

}


carregarCertificado();
