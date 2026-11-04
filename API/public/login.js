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


            // ==========================================
            // LOGIN OK
            // ==========================================

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


            // ==========================================
            // E-MAIL NÃO CADASTRADO
            // ==========================================

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