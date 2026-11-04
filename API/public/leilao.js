// =====================================================
// Só comprador logado pode ver esta página
// =====================================================

const usuario = JSON.parse(sessionStorage.getItem('usuario'));

if (!usuario || usuario.perfil !== 'comprador') {
    window.location.href = 'login.html';
}


const lista = document.getElementById('lista');

document.getElementById('boasVindas').textContent = 'Olá, ' + usuario.nome;

document.getElementById('btnSair').addEventListener('click', () => {
    sessionStorage.removeItem('usuario');
    window.location.href = 'login.html';
});


// Mostra um número como dinheiro: R$ 1.500,50
function formatarReais(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}


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
// CARREGAR AS PEÇAS DO LEILÃO
// =====================================================

async function carregarLeilao() {

    try {

        const resposta = await fetch(
            '/api/leilao?usuario_id=' + usuario.id
        );

        const dados = await resposta.json();

        lista.innerHTML = '';

        if (!dados.sucesso) {
            lista.textContent = dados.mensagem;
            return;
        }

        if (dados.itens.length === 0) {
            lista.textContent = 'Nenhuma peça disponível no leilão no momento.';
            return;
        }

        dados.itens.forEach((item) => {
            lista.append(montarCartao(item));
        });

    }

    catch (erro) {
        console.error(erro);
        lista.textContent = 'Não foi possível carregar o leilão.';
    }

}


function montarCartao(item) {

    const cartao = criar('div', 'cartao');

    const imagem = document.createElement('img');
    imagem.src = item.foto || '';
    imagem.alt = 'Foto de ' + item.nome_rocha;

    const info = criar('div');

    info.append(
        criar('h3', '', item.nome_rocha),
        criar('p', '', 'Local: ' + item.local_descoberta),
        criar('p', '', 'Peso: ' + item.peso_kg + ' kg'),
        criar('p', '', 'Descrição: ' + (item.descricao || 'sem descrição'))
    );

    // Certificado de autenticidade (o comprador confere antes de dar lance)
    if (item.certificado_id) {

        const link = criar('a', 'botao', 'Ver certificado de autenticidade');
        link.href = 'certificado.html?id=' + item.certificado_id;

        info.append(link);

    }


    // ---------- Situação do leilão ----------

    if (item.maior_lance === null) {

        info.append(
            criar('p', 'lance', 'Lance inicial: ' + formatarReais(item.lance_inicial)),
            criar('p', '', 'Ainda sem lances.')
        );

    } else {

        info.append(
            criar('p', 'lance', 'Maior lance: ' + formatarReais(item.maior_lance)),
            criar('p', '', 'Total de lances: ' + item.total_lances)
        );

    }

    if (item.vencendo) {
        info.append(
            criar('span', 'status aprovada', 'Você está com o maior lance')
        );
    }


    // ---------- Formulário do lance ----------

    const form = criar('form', 'form-lance');

    const rotulo = criar('label', '', 'Seu lance (R$)');

    const campo = document.createElement('input');
    campo.type = 'number';
    campo.step = '0.01';
    campo.min = item.lance_minimo;
    campo.placeholder = 'Mínimo: ' + formatarReais(item.lance_minimo);
    campo.required = true;

    const botao = criar('button', 'botao', 'Dar lance');
    botao.type = 'submit';

    const aviso = criar('div', 'mensagem-card');

    form.append(rotulo, campo, botao, aviso);

    form.addEventListener('submit', (evento) => {
        evento.preventDefault();
        darLance(item.id, campo, botao, aviso);
    });

    info.append(form);
    cartao.append(imagem, info);

    return cartao;

}


// =====================================================
// ENVIAR O LANCE
// =====================================================

async function darLance(descobertaId, campo, botao, aviso) {

    botao.disabled = true;
    aviso.textContent = '';

    try {

        const resposta = await fetch('/api/lances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: usuario.id,
                descoberta_id: descobertaId,
                valor: campo.value
            })
        });

        const dados = await resposta.json();

        if (dados.sucesso) {
            alert(dados.mensagem);
            carregarLeilao();
            carregarCompras();
            return;
        }

        // Lance baixo demais (por exemplo, outro comprador cobriu o seu):
        // avisa e atualiza a lista com os valores novos
        if (resposta.status === 409) {
            alert(dados.mensagem);
            carregarLeilao();
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


// =====================================================
// MINHAS COMPRAS (leilões encerrados em que este comprador venceu)
// =====================================================

const divCompras = document.getElementById('compras');

async function carregarCompras() {

    try {

        const resposta = await fetch(
            '/api/leilao/minhas-compras?usuario_id=' + usuario.id
        );

        const dados = await resposta.json();

        divCompras.innerHTML = '';

        if (!dados.sucesso) {
            divCompras.textContent = dados.mensagem;
            return;
        }

        if (dados.compras.length === 0) {
            divCompras.textContent = 'Você ainda não arrematou nenhuma peça.';
            return;
        }

        dados.compras.forEach((c) => {

            const cartao = criar('div', 'cartao');

            const imagem = document.createElement('img');
            imagem.src = c.foto || '';
            imagem.alt = 'Foto de ' + c.nome_rocha;

            const info = criar('div');

            info.append(
                criar('h3', '', c.nome_rocha),
                criar('p', '', 'Local: ' + c.local_descoberta),
                criar('p', '', 'Peso: ' + c.peso_kg + ' kg'),
                criar('p', '', 'Descrição: ' + (c.descricao || 'sem descrição')),
                criar('span', 'status vendida',
                    'Você arrematou esta peça por ' + formatarReais(c.valor_final))
            );

            if (c.certificado_id) {

                const link = criar('a', 'botao', 'Ver e baixar certificado de autenticidade');
                link.href = 'certificado.html?id=' + c.certificado_id;

                info.append(link);

            }

            cartao.append(imagem, info);
            divCompras.append(cartao);

        });

    }

    catch (erro) {
        console.error(erro);
        divCompras.textContent = 'Não foi possível carregar as compras.';
    }

}


carregarLeilao();
carregarCompras();
