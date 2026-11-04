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
                        'index.html';

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