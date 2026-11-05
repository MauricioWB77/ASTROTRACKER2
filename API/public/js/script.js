
const EQUIPE = 'Mauricio Wendel, Maria Eduarda e Kauã de Souza';

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


// Mostra um número como dinheiro: R$ 1.500,50
function formatarReais(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}


function criarRodape() {

    // Se a página já tem um rodapé próprio, não cria outro
    if (document.querySelector('footer')) {
        return;
    }

    const rodape = document.createElement('footer');

    const logo = document.createElement('img');
    logo.src = 'img/logo-webdev.png';
    logo.alt = 'WebDev';
    logo.width = 90;

    const texto = document.createElement('p');
    texto.textContent = '© ' + new Date().getFullYear() +
        ' WebDev. Desenvolvido por ' + EQUIPE + '.';

    const link = document.createElement('a');
    link.href = 'sobre.html';
    link.textContent = 'Sobre nós';

    rodape.append(logo, texto, link);
    document.body.append(rodape);

}


function iniciarLogin() {

    const formLogin =
        document.getElementById('formLogin');

    const mensagem =
        document.getElementById('mensagem');

    const btnLogin =
        document.getElementById('btnLogin');


    formLogin.addEventListener(
        'submit',
        async function (event) {

            event.preventDefault();


            const email =
                document.getElementById('email').value.trim();

            const senha =
                document.getElementById('senha').value;


            mensagem.style.display = 'none';


            btnLogin.disabled = true;

            btnLogin.textContent = 'Entrando...';


            try {

                const resposta = await fetch(
                    '/api/login',
                    {

                        method: 'POST',

                        headers: {
                            'Content-Type':
                                'application/json'
                        },

                        body: JSON.stringify({

                            email: email,

                            senha: senha

                        })

                    }
                );


                const dados =
                    await resposta.json();



                if (dados.sucesso) {

                    mostrarMensagem(
                        dados.mensagem,
                        'sucesso'
                    );


                    // Guarda os dados temporariamente
                    sessionStorage.setItem(
                        'usuario',
                        JSON.stringify(dados.usuario)
                    );


                    setTimeout(() => {

                        // Cada perfil vai para a sua página
                        if (dados.usuario.perfil === 'cacador') {

                            window.location.href = 'descoberta.html';

                        } else if (dados.usuario.perfil === 'geologo') {

                            window.location.href = 'laudo.html';

                        } else if (dados.usuario.perfil === 'comprador') {

                            window.location.href = 'leilao.html';

                        } else {

                            window.location.href = 'dashboard.html';

                        }

                    }, 1000);


                    return;
                }


                if (
                    dados.usuarioExiste === false
                ) {

                    const desejaCadastrar =
                        confirm(
                            'Este e-mail não está cadastrado.\n\n' +
                            'Deseja criar uma conta?'
                        );


                    if (desejaCadastrar) {

                        window.location.href =
                            `cadastro.html?email=${encodeURIComponent(email)}`;

                    }

                    return;

                }


                mostrarMensagem(
                    dados.mensagem,
                    'erro'
                );

            }

            catch (erro) {

                console.error(erro);

                mostrarMensagem(
                    'Não foi possível conectar ao servidor.',
                    'erro'
                );

            }

            finally {

                btnLogin.disabled = false;

                btnLogin.textContent = 'Entrar';

            }

        }
    );


    function mostrarMensagem(
        texto,
        tipo
    ) {

        mensagem.textContent = texto;

        mensagem.className =
            `mensagem ${tipo}`;

        mensagem.style.display = 'block';

    }

}


// =====================================================
// PÁGINA: cadastro.html
// =====================================================

function iniciarCadastro() {

    const formCadastro =
        document.getElementById('formCadastro');

    const mensagem =
        document.getElementById('mensagem');


    const parametros =
        new URLSearchParams(window.location.search);

    const emailURL =
        parametros.get('email');


    if (emailURL) {

        document.getElementById('email').value =
            emailURL;

    }


    formCadastro.addEventListener(
        'submit',
        async function (event) {

            event.preventDefault();


            const nome =
                document.getElementById('nome').value.trim();

            const email =
                document.getElementById('email').value.trim();

            const senha =
                document.getElementById('senha').value;

            const perfil =
                document.getElementById('perfil').value;

            const confirmarSenha =
                document.getElementById(
                    'confirmarSenha'
                ).value;


            // ==========================================
            // VALIDA SENHAS
            // ==========================================

            if (senha !== confirmarSenha) {

                mostrarMensagem(
                    'As senhas não são iguais.',
                    'erro'
                );

                return;

            }


            try {

                const resposta =
                    await fetch(
                        '/api/cadastro',
                        {

                            method: 'POST',

                            headers: {

                                'Content-Type':
                                    'application/json'

                            },

                            body: JSON.stringify({

                                nome: nome,

                                email: email,

                                senha: senha,

                                perfil: perfil

                            })

                        }
                    );


                const dados =
                    await resposta.json();


                if (dados.sucesso) {

                    mostrarMensagem(
                        dados.mensagem,
                        'sucesso'
                    );


                    setTimeout(() => {

                        window.location.href =
                            'login.html';

                    }, 1500);


                } else {

                    mostrarMensagem(
                        dados.mensagem,
                        'erro'
                    );

                }

            }

            catch (erro) {

                console.error(erro);

                mostrarMensagem(
                    'Erro ao conectar ao servidor.',
                    'erro'
                );

            }

        }
    );


    function mostrarMensagem(
        texto,
        tipo
    ) {

        mensagem.textContent = texto;

        mensagem.className =
            `mensagem ${tipo}`;

        mensagem.style.display = 'block';

    }

}


// =====================================================
// PÁGINA: dashboard.html
// =====================================================

function iniciarDashboard() {

    const usuario = JSON.parse(sessionStorage.getItem('usuario'));

    if (!usuario) {
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('boasVindas').textContent =
        'Olá, ' + usuario.nome + '! Você está logado.';

    document.getElementById('btnSair').addEventListener('click', () => {
        sessionStorage.removeItem('usuario');
        window.location.href = 'login.html';
    });

}


// =====================================================
// PÁGINA: descoberta.html
// =====================================================

function iniciarDescoberta() {

    // =====================================================
    // Só caçador logado pode ver esta página
    // =====================================================

    const usuario = JSON.parse(sessionStorage.getItem('usuario'));

    if (!usuario || usuario.perfil !== 'cacador') {
        window.location.href = 'login.html';
        return;
    }


    const formDescoberta = document.getElementById('formDescoberta');
    const mensagem = document.getElementById('mensagem');
    const btnEnviar = document.getElementById('btnEnviar');
    const lista = document.getElementById('lista');

    document.getElementById('boasVindas').textContent = 'Olá, ' + usuario.nome;

    document.getElementById('btnSair').addEventListener('click', () => {
        sessionStorage.removeItem('usuario');
        window.location.href = 'login.html';
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
                    link.textContent = 'Ver certificado';
                    link.href = 'certificado.html?id=' + d.certificado_id;

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

}


// =====================================================
// PÁGINA: laudo.html
// =====================================================

function iniciarLaudo() {

    // =====================================================
    // Só geólogo logado pode ver esta página
    // =====================================================

    const usuario = JSON.parse(sessionStorage.getItem('usuario'));

    if (!usuario || usuario.perfil !== 'geologo') {
        window.location.href = 'login.html';
        return;
    }


    const divPendentes = document.getElementById('pendentes');
    const divMeusLaudos = document.getElementById('meusLaudos');

    document.getElementById('boasVindas').textContent = 'Olá, ' + usuario.nome;

    document.getElementById('btnSair').addEventListener('click', () => {
        sessionStorage.removeItem('usuario');
        window.location.href = 'login.html';
    });


    // Textos amigáveis para cada status do banco
    const NOMES_STATUS = {
        pendente: 'Aguardando o outro laudo',
        aprovada: 'Aprovada (vai para o leilão)',
        retida: 'Retida para análise física',
        reprovada: 'Reprovada',
        vendida: 'Vendida em leilão'
    };




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

                // Certificado: só existe para peças aprovadas
                if (l.certificado_id) {

                    const link = criar('a', 'botao', 'Ver certificado');
                    link.href = 'certificado.html?id=' + l.certificado_id;

                    info.append(link);

                }

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

}


// =====================================================
// PÁGINA: leilao.html
// =====================================================

function iniciarLeilao() {

    // =====================================================
    // Só comprador logado pode ver esta página
    // =====================================================

    const usuario = JSON.parse(sessionStorage.getItem('usuario'));

    if (!usuario || usuario.perfil !== 'comprador') {
        window.location.href = 'login.html';
        return;
    }


    const lista = document.getElementById('lista');

    document.getElementById('boasVindas').textContent = 'Olá, ' + usuario.nome;

    document.getElementById('btnSair').addEventListener('click', () => {
        sessionStorage.removeItem('usuario');
        window.location.href = 'login.html';
    });






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

}


// =====================================================
// PÁGINA: certificado.html
// =====================================================

function iniciarCertificado() {

    // =====================================================
    // Qualquer usuário logado pode ver o certificado
    // =====================================================

    const usuario = JSON.parse(sessionStorage.getItem('usuario'));

    if (!usuario) {
        window.location.href = 'login.html';
        return;
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

}


// =====================================================
// PÁGINA: sobre.html (formulário de contato rápido)
// =====================================================

function iniciarSobre() {

    document.getElementById('contactForm').addEventListener('submit', function (e) {

        e.preventDefault();

        const nome = this.querySelector('input[type="text"]').value;

        alert('Obrigado, ' + nome + '! Seu contato foi solicitado.');

        this.reset();

    });

}

const PAGINAS = {
    'login.html': iniciarLogin,
    'cadastro.html': iniciarCadastro,
    'dashboard.html': iniciarDashboard,
    'descoberta.html': iniciarDescoberta,
    'laudo.html': iniciarLaudo,
    'leilao.html': iniciarLeilao,
    'certificado.html': iniciarCertificado,
    'sobre.html': iniciarSobre
};

const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';

criarRodape();

if (PAGINAS[paginaAtual]) {
    PAGINAS[paginaAtual]();
}
