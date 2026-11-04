// =====================================================
// Só caçador logado pode ver esta página
// =====================================================

const usuario = JSON.parse(sessionStorage.getItem('usuario'));

if (!usuario || usuario.perfil !== 'cacador') {
    window.location.href = 'index.html';
}


const formDescoberta = document.getElementById('formDescoberta');
const mensagem = document.getElementById('mensagem');
const btnEnviar = document.getElementById('btnEnviar');
const lista = document.getElementById('lista');

document.getElementById('boasVindas').textContent = 'Olá, ' + usuario.nome;

document.getElementById('btnSair').addEventListener('click', () => {
    sessionStorage.removeItem('usuario');
    window.location.href = 'index.html';
});


function mostrarMensagem(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.className = tipo;
}


// Textos amigáveis para cada status do banco
const NOMES_STATUS = {
    pendente: 'Aguardando laudos',
    aprovada: 'Aprovada (em leilão)',
    retida: 'Retida para análise física',
    reprovada: 'Reprovada',
    vendida: 'Vendida'
};


// Mostra um número como dinheiro: R$ 1.500,50
function formatarReais(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}


// =====================================================
// LISTAR AS DESCOBERTAS DO CAÇADOR
// =====================================================

async function carregarDescobertas() {

    try {

        const resposta = await fetch(
            '/api/descobertas?usuario_id=' + usuario.id
        );

        const dados = await resposta.json();

        lista.innerHTML = '';

        if (!dados.sucesso) {
            lista.textContent = dados.mensagem;
            return;
        }

        if (dados.descobertas.length === 0) {
            lista.textContent = 'Você ainda não registrou nenhuma descoberta.';
            return;
        }

        dados.descobertas.forEach((d) => {

            // Monta o cartão com textContent (evita injetar HTML do usuário)
            const cartao = document.createElement('div');
            cartao.className = 'cartao';

            const imagem = document.createElement('img');
            imagem.src = d.foto || '';
            imagem.alt = 'Foto de ' + d.nome_rocha;

            const info = document.createElement('div');

            const titulo = document.createElement('h3');
            titulo.textContent = d.nome_rocha;

            const local = document.createElement('p');
            local.textContent = 'Local: ' + d.local_descoberta;

            const peso = document.createElement('p');
            peso.textContent = 'Peso: ' + Number(d.peso_kg) + ' kg';

            const descricao = document.createElement('p');
            descricao.textContent = 'Descrição: ' + (d.descricao || 'sem descrição');

            const data = document.createElement('p');
            data.textContent = 'Registrada em: ' +
                new Date(d.data_registro).toLocaleDateString('pt-BR');

            const status = document.createElement('span');
            status.className = 'status ' + d.status;
            status.textContent = NOMES_STATUS[d.status] || d.status;

            info.append(titulo, local, peso, descricao, data, status);

            // ---------- Leilão (peça aprovada) ----------
            if (d.status === 'aprovada') {

                const lance = document.createElement('p');

                lance.textContent = d.maior_lance === null
                    ? 'Leilão aberto: ainda sem lances.'
                    : 'Maior lance: ' + formatarReais(d.maior_lance) +
                      ' (' + d.total_lances + ' lance(s))';

                const aviso = document.createElement('div');
                aviso.className = 'mensagem-card';

                const botaoEncerrar = document.createElement('button');
                botaoEncerrar.type = 'button';
                botaoEncerrar.className = 'botao';
                botaoEncerrar.textContent = 'Encerrar leilão';

                botaoEncerrar.addEventListener('click', () => {
                    encerrarLeilao(d.id, botaoEncerrar, aviso);
                });

                info.append(lance, botaoEncerrar, aviso);

            }

            // ---------- Peça vendida ----------
            if (d.status === 'vendida') {

                const venda = document.createElement('p');
                venda.textContent = 'Vendida para ' + d.comprador_nome +
                    ' por ' + formatarReais(d.maior_lance) + '.';

                info.append(venda);

            }

            // ---------- Certificado de autenticidade ----------
            if (d.certificado_id) {

                const link = document.createElement('a');
                link.className = 'botao';
                link.textContent = 'Baixar certificado (PDF)';
                link.href = '/api/certificados/' + d.certificado_id +
                    '/pdf?usuario_id=' + usuario.id;

                info.append(link);

            }
            cartao.append(imagem, info);
            lista.append(cartao);

        });

    }

    catch (erro) {
        console.error(erro);
        lista.textContent = 'Não foi possível carregar as descobertas.';
    }

}


// =====================================================
// REGISTRAR NOVA DESCOBERTA (com foto)
// =====================================================

formDescoberta.addEventListener('submit', async (evento) => {

    evento.preventDefault();

    btnEnviar.disabled = true;
    mostrarMensagem('', '');

    // FormData monta o envio com os textos + o arquivo da foto
    const formulario = new FormData();

    formulario.append('usuario_id', usuario.id);
    formulario.append('nome_rocha', document.getElementById('nome_rocha').value);
    formulario.append('local_descoberta', document.getElementById('local_descoberta').value);
    formulario.append('peso_kg', document.getElementById('peso_kg').value);
    formulario.append('descricao', document.getElementById('descricao').value);
    formulario.append('foto', document.getElementById('foto').files[0]);

    try {

        // Atenção: não colocar o header Content-Type aqui,
        // o navegador define sozinho quando é um envio com arquivo.
        const resposta = await fetch('/api/descobertas', {
            method: 'POST',
            body: formulario
        });

        const dados = await resposta.json();

        if (dados.sucesso) {
            mostrarMensagem(dados.mensagem, 'sucesso');
            formDescoberta.reset();
            carregarDescobertas();
        } else {
            mostrarMensagem(dados.mensagem, 'erro');
        }

    }

    catch (erro) {
        console.error(erro);
        mostrarMensagem('Não foi possível conectar ao servidor.', 'erro');
    }

    finally {
        btnEnviar.disabled = false;
    }

});


// =====================================================
// ENCERRAR O LEILÃO DE UMA PEÇA (o maior lance vence)
// =====================================================

async function encerrarLeilao(descobertaId, botao, aviso) {

    const confirmou = confirm(
        'Encerrar o leilão desta peça?\n\n' +
        'O comprador com o maior lance fica com a peça e novos lances não serão aceitos.'
    );

    if (!confirmou) {
        return;
    }

    botao.disabled = true;
    aviso.textContent = '';

    try {

        const resposta = await fetch('/api/leilao/encerrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: usuario.id,
                descoberta_id: descobertaId
            })
        });

        const dados = await resposta.json();

        if (dados.sucesso) {
            alert(dados.mensagem);
            carregarDescobertas();
            return;
        }

        aviso.textContent = dados.mensagem;
        aviso.className = 'mensagem-card erro';

    }

    catch (erro) {
        console.error(erro);
        aviso.textContent = 'Não foi possível conectar ao servidor.';
        aviso.className = 'mensagem-card erro';
    }

    finally {
        botao.disabled = false;
    }

}


carregarDescobertas();