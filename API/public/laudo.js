// =====================================================
// Só geólogo logado pode ver esta página
// =====================================================

const usuario = JSON.parse(sessionStorage.getItem('usuario'));

if (!usuario || usuario.perfil !== 'geologo') {
    window.location.href = 'index.html';
}


const divPendentes = document.getElementById('pendentes');
const divMeusLaudos = document.getElementById('meusLaudos');

document.getElementById('boasVindas').textContent = 'Olá, ' + usuario.nome;

document.getElementById('btnSair').addEventListener('click', () => {
    sessionStorage.removeItem('usuario');
    window.location.href = 'index.html';
});


// Textos amigáveis para cada status do banco
const NOMES_STATUS = {
    pendente: 'Aguardando o outro laudo',
    aprovada: 'Aprovada (vai para o leilão)',
    retida: 'Retida para análise física',
    reprovada: 'Reprovada',
    vendida: 'Vendida em leilão'
};


// Cria um elemento já com classe e texto (textContent evita injetar HTML)
function criar(tag, classe, texto) {

    const elemento = document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    if (texto !== undefined) {
        elemento.textContent = texto;
    }

    return elemento;

}


// =====================================================
// DESCOBERTAS AGUARDANDO O LAUDO DESTE GEÓLOGO
// =====================================================

async function carregarPendentes() {

    try {

        const resposta = await fetch(
            '/api/laudos/pendentes?usuario_id=' + usuario.id
        );

        const dados = await resposta.json();

        divPendentes.innerHTML = '';

        if (!dados.sucesso) {
            divPendentes.textContent = dados.mensagem;
            return;
        }

        if (dados.descobertas.length === 0) {
            divPendentes.textContent = 'Nenhuma descoberta aguardando o seu laudo.';
            return;
        }

        dados.descobertas.forEach((d) => {
            divPendentes.append(montarCartaoPendente(d));
        });

    }

    catch (erro) {
        console.error(erro);
        divPendentes.textContent = 'Não foi possível carregar as descobertas.';
    }

}


function montarCartaoPendente(d) {

    const cartao = criar('div', 'cartao');

    const imagem = document.createElement('img');
    imagem.src = d.foto || '';
    imagem.alt = 'Foto de ' + d.nome_rocha;

    const info = criar('div');

    info.append(
        criar('h3', '', d.nome_rocha),
        criar('p', '', 'Local: ' + d.local_descoberta),
        criar('p', '', 'Peso: ' + Number(d.peso_kg) + ' kg'),
        criar('p', '', 'Descrição: ' + (d.descricao || 'sem descrição')),
        criar('p', '', 'Registrada em: ' +
            new Date(d.data_registro).toLocaleDateString('pt-BR'))
    );


    // ---------- Formulário do voto ----------

    const form = criar('form', 'form-laudo');

    const opcoes = criar('div', 'opcoes-voto');

    // Os dois botões de escolha (o "name" é único por cartão)
    [
        { valor: 'aprovado', texto: 'Aprovar autenticidade' },
        { valor: 'reprovado', texto: 'Reprovar' }
    ].forEach((opcao) => {

        const rotulo = criar('label');

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'voto-' + d.id;
        radio.value = opcao.valor;
        radio.required = true;

        rotulo.append(radio, ' ' + opcao.texto);
        opcoes.append(rotulo);

    });

    const parecer = document.createElement('textarea');
    parecer.rows = 3;
    parecer.maxLength = 2000;
    parecer.placeholder = 'Parecer técnico (opcional)';

    const botao = criar('button', 'botao', 'Enviar laudo');
    botao.type = 'submit';

    const aviso = criar('div', 'mensagem-card');

    form.append(opcoes, parecer, botao, aviso);

    form.addEventListener('submit', (evento) => {
        evento.preventDefault();
        enviarLaudo(d.id, form, parecer, botao, aviso);
    });

    info.append(form);
    cartao.append(imagem, info);

    return cartao;

}


// =====================================================
// ENVIAR O LAUDO
// =====================================================

async function enviarLaudo(descobertaId, form, parecer, botao, aviso) {

    const escolhido = form.querySelector('input[type="radio"]:checked');

    if (!escolhido) {
        aviso.textContent = 'Escolha aprovar ou reprovar.';
        aviso.className = 'mensagem-card erro';
        return;
    }

    botao.disabled = true;
    aviso.textContent = '';

    try {

        const resposta = await fetch('/api/laudos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: usuario.id,
                descoberta_id: descobertaId,
                voto: escolhido.value,
                parecer: parecer.value
            })
        });

        const dados = await resposta.json();

        if (dados.sucesso) {

            alert(dados.mensagem);

            carregarPendentes();
            carregarMeusLaudos();

            return;

        }

        aviso.textContent = dados.mensagem;
        aviso.className = 'mensagem-card erro';

        // Se a peça já foi decidida ou o voto já existe, atualiza as listas
        if (resposta.status === 409) {
            carregarPendentes();
            carregarMeusLaudos();
        }

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


// =====================================================
// HISTÓRICO DOS LAUDOS DESTE GEÓLOGO
// =====================================================

async function carregarMeusLaudos() {

    try {

        const resposta = await fetch(
            '/api/laudos/meus?usuario_id=' + usuario.id
        );

        const dados = await resposta.json();

        divMeusLaudos.innerHTML = '';

        if (!dados.sucesso) {
            divMeusLaudos.textContent = dados.mensagem;
            return;
        }

        if (dados.laudos.length === 0) {
            divMeusLaudos.textContent = 'Você ainda não emitiu nenhum laudo.';
            return;
        }

                dados.laudos.forEach((l) => {

            const cartao = criar('div', 'cartao');
            const info = criar('div');

            info.append(
                criar('h3', '', l.nome_rocha),
                criar('p', '', 'Seu voto: ' +
                    (l.voto === 'aprovado' ? 'aprovou' : 'reprovou')),
                criar('p', '', 'Parecer: ' + (l.parecer || 'sem parecer')),
                criar('p', '', 'Data: ' +
                    new Date(l.data_laudo).toLocaleDateString('pt-BR')),
                criar('span', 'status ' + l.status,
                    NOMES_STATUS[l.status] || l.status)
            );

            // ===== COLE AQUI o bloco do certificado =====
            if (l.certificado_id) {

                const link = criar('a', 'botao', 'Baixar certificado (PDF)');
                link.href = '/api/certificados/' + l.certificado_id +
                    '/pdf?usuario_id=' + usuario.id;

                info.append(link);

            }
            // ============================================

            cartao.append(info);
            divMeusLaudos.append(cartao);

        });

    }

    catch (erro) {
        console.error(erro);
        divMeusLaudos.textContent = 'Não foi possível carregar seus laudos.';
    }

}


carregarPendentes();
carregarMeusLaudos();