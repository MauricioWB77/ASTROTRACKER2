const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const PDFDocument = require('pdfkit');

const db = require('./conexao');

const app = express();


const PORT = process.env.PORT || 3000;


// Permite receber JSON
app.use(express.json());


// Permite receber dados de formulário
app.use(express.urlencoded({
    extended: true
}));


// Arquivos HTML, CSS e JS (pasta "public")
app.use(express.static(
    path.join(__dirname, 'public')
));








const pastaUploads = path.join(__dirname, 'public', 'uploads');
fs.mkdirSync(pastaUploads, { recursive: true });

const armazenamento = multer.diskStorage({

    destination: (req, file, cb) => cb(null, pastaUploads),

    // Nome único para a foto não sobrescrever outra
    filename: (req, file, cb) => {
        const extensao = path.extname(file.originalname).toLowerCase();
        const nomeUnico = Date.now() + '-' + Math.round(Math.random() * 1e6);
        cb(null, nomeUnico + extensao);
    }

});

const upload = multer({

    storage: armazenamento,

    // Máximo de 5 MB por foto
    limits: { fileSize: 5 * 1024 * 1024 },

    // Só aceita imagens JPG, PNG e WEBP
    fileFilter: (req, file, cb) => {
        const permitidos = ['image/jpeg', 'image/png', 'image/webp'];
        cb(null, permitidos.includes(file.mimetype));
    }

});

// Apaga a foto do disco quando o registro da descoberta não dá certo
function apagarFoto(arquivo) {
    if (arquivo) {
        fs.unlink(arquivo.path, () => { });
    }
}


// =====================================================
// LOGIN
// =====================================================

app.post('/api/login', async (req, res) => {

    try {

        const { email, senha } = req.body;

        if (!email || !senha) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe o e-mail e a senha.'
            });

        }


        const [usuarios] = await db.query(
            `
            SELECT
                id,
                nome,
                email,
                senha,
                ativo,
                perfil
            FROM usuarios
            WHERE email = ?
            LIMIT 1
            `,
            [email]
        );


        // Usuário não existe
        if (usuarios.length === 0) {

            return res.status(404).json({
                sucesso: false,
                usuarioExiste: false,
                mensagem: 'E-mail não cadastrado.'
            });

        }


        const usuario = usuarios[0];


        // Usuário bloqueado/inativo
        if (!usuario.ativo) {

            return res.status(403).json({
                sucesso: false,
                usuarioExiste: true,
                mensagem: 'Usuário inativo.'
            });

        }


        // Compara a senha digitada com o hash guardado no banco
        const senhaValida = await bcrypt.compare(
            senha,
            usuario.senha
        );


        if (!senhaValida) {

            return res.status(401).json({
                sucesso: false,
                usuarioExiste: true,
                mensagem: 'Senha incorreta.'
            });

        }


        // Login realizado
        return res.json({

            sucesso: true,

            mensagem: 'Login realizado com sucesso!',

            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                perfil: usuario.perfil
            }

        });

    }

    catch (erro) {

        console.error(erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro interno do servidor.'
        });

    }

});


// =====================================================
// CADASTRO 
// =====================================================

app.post('/api/cadastro', async (req, res) => {

    try {

        const { nome, email, senha, perfil } = req.body;


        // Pelo site só é possível se cadastrar como caçador ou comprador.
        // Geólogo NUNCA é criado por aqui (são cadastrados direto no banco).
        const perfilCadastro = perfil || 'cacador';

        if (!['cacador', 'comprador'].includes(perfilCadastro)) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Tipo de cadastro inválido.'
            });

        }


        // Validação
        if (!nome || !email || !senha) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Nome, e-mail e senha são obrigatórios.'
            });

        }


        // Verifica se o e-mail já existe
        const [usuarios] = await db.query(
            `
            SELECT id
            FROM usuarios
            WHERE email = ?
            LIMIT 1
            `,
            [email]
        );


        if (usuarios.length > 0) {

            return res.status(409).json({
                sucesso: false,
                mensagem: 'Este e-mail já está cadastrado.'
            });

        }


        // Criptografa a senha
        const senhaHash = await bcrypt.hash(senha, 10);


        // Insere o usuário (caçador ou comprador)
        await db.query(
            `
            INSERT INTO usuarios
            (
                nome,
                email,
                senha,
                perfil
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                nome,
                email,
                senhaHash,
                perfilCadastro
            ]
        );


        return res.status(201).json({
            sucesso: true,
            mensagem: 'Cadastro realizado com sucesso!'
        });

    }

    catch (erro) {

        console.error(erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao realizar cadastro.'
        });

    }

});


// =====================================================
// DESCOBERTA - REGISTRAR (com foto)
// =====================================================

app.post('/api/descobertas', (req, res) => {

    // O multer lê o formulário (texto + foto) antes de tudo
    upload.single('foto')(req, res, async (erroUpload) => {

        if (erroUpload) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Não foi possível enviar a foto (máximo de 5 MB).'
            });

        }


        let conexao;

        try {

            const {
                usuario_id,
                nome_rocha,
                local_descoberta,
                peso_kg,
                descricao
            } = req.body;


            // ---------- Validações ----------

            if (!usuario_id || !nome_rocha || !local_descoberta || !peso_kg) {

                apagarFoto(req.file);

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Preencha nome, local e peso da rocha.'
                });

            }

            const peso = Number(peso_kg);

            if (!(peso > 0)) {

                apagarFoto(req.file);

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'O peso precisa ser maior que zero.'
                });

            }

            if (!req.file) {

                return res.status(400).json({
                    sucesso: false,
                    mensagem: 'Envie uma foto JPG, PNG ou WEBP.'
                });

            }


            // ---------- Confere no banco se é um caçador ativo ----------

            const [usuarios] = await db.query(
                `
                SELECT id, perfil, ativo
                FROM usuarios
                WHERE id = ?
                LIMIT 1
                `,
                [usuario_id]
            );

            if (
                usuarios.length === 0 ||
                usuarios[0].perfil !== 'cacador' ||
                !usuarios[0].ativo
            ) {

                apagarFoto(req.file);

                return res.status(403).json({
                    sucesso: false,
                    mensagem: 'Apenas caçadores podem registrar descobertas.'
                });

            }


            // ---------- Grava a descoberta e a foto juntas ----------
           

            conexao = await db.getConnection();
            await conexao.beginTransaction();

            const [resultado] = await conexao.query(
                `
                INSERT INTO descobertas
                (cacador_id, nome_rocha, local_descoberta, peso_kg, descricao)
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    usuario_id,
                    nome_rocha.trim(),
                    local_descoberta.trim(),
                    peso,
                    descricao ? descricao.trim() : null
                ]
            );

            await conexao.query(
                `
                INSERT INTO fotos_descoberta (descoberta_id, caminho)
                VALUES (?, ?)
                `,
                [
                    resultado.insertId,
                    'uploads/' + req.file.filename
                ]
            );

            await conexao.commit();


            return res.status(201).json({
                sucesso: true,
                mensagem: 'Descoberta registrada! Ela aguarda a análise dos geólogos.'
            });

        }

        catch (erro) {

            if (conexao) {
                await conexao.rollback();
            }

            apagarFoto(req.file);

            console.error(erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao registrar a descoberta.'
            });

        }

        finally {

            if (conexao) {
                conexao.release();
            }

        }

    });

});


// =====================================================
// DESCOBERTA - LISTAR AS DO CAÇADOR
// =====================================================

app.get('/api/descobertas', async (req, res) => {

    try {

        const usuarioId = Number(req.query.usuario_id);

        if (!usuarioId) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Usuário não informado.'
            });

        }

        const [descobertas] = await db.query(
            `
            SELECT
                d.id,
                d.nome_rocha,
                d.local_descoberta,
                d.peso_kg,
                d.descricao,
                d.status,
                d.data_registro,
                (
                    SELECT f.caminho
                    FROM fotos_descoberta f
                    WHERE f.descoberta_id = d.id
                    ORDER BY f.id
                    LIMIT 1
                ) AS foto,
                (
                    SELECT MAX(l.valor)
                    FROM lances l
                    WHERE l.descoberta_id = d.id
                ) AS maior_lance,
                (
                    SELECT COUNT(*)
                    FROM lances l
                    WHERE l.descoberta_id = d.id
                ) AS total_lances,
                CASE WHEN d.status = 'vendida' THEN (
                    SELECT u.nome
                    FROM lances l
                    JOIN usuarios u ON u.id = l.usuario_id
                    WHERE l.descoberta_id = d.id
                    ORDER BY l.valor DESC, l.id ASC
                    LIMIT 1
                ) END AS comprador_nome,
                (
                    SELECT c.id
                    FROM certificados c
                    WHERE c.descoberta_id = d.id
                ) AS certificado_id
            FROM descobertas d
            WHERE d.cacador_id = ?
            ORDER BY d.data_registro DESC
            `,
            [usuarioId]
        );

        return res.json({
            sucesso: true,
            descobertas: descobertas
        });

    }

    catch (erro) {

        console.error(erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar as descobertas.'
        });

    }

});


// =====================================================
// LAUDO 
// =====================================================

// Confere no banco se o usuário é um geólogo ativo
async function buscarGeologoAtivo(usuarioId) {

    const [usuarios] = await db.query(
        `
        SELECT id, perfil, ativo
        FROM usuarios
        WHERE id = ?
        LIMIT 1
        `,
        [usuarioId]
    );

    if (
        usuarios.length === 0 ||
        usuarios[0].perfil !== 'geologo' ||
        !usuarios[0].ativo
    ) {
        return null;
    }

    return usuarios[0];

}


// =====================================================
// LAUDO - DESCOBERTAS QUE AINDA FALTAM PARA ESTE GEÓLOGO
// (só mostra as pendentes em que ele ainda não votou)
// =====================================================

app.get('/api/laudos/pendentes', async (req, res) => {

    try {

        const usuarioId = Number(req.query.usuario_id);

        if (!usuarioId || !(await buscarGeologoAtivo(usuarioId))) {

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Apenas geólogos podem acessar os laudos.'
            });

        }

        const [descobertas] = await db.query(
            `
            SELECT
                d.id,
                d.nome_rocha,
                d.local_descoberta,
                d.peso_kg,
                d.descricao,
                d.data_registro,
                (
                    SELECT f.caminho
                    FROM fotos_descoberta f
                    WHERE f.descoberta_id = d.id
                    ORDER BY f.id
                    LIMIT 1
                ) AS foto
            FROM descobertas d
            WHERE d.status = 'pendente'
              AND NOT EXISTS (
                    SELECT 1
                    FROM laudos l
                    WHERE l.descoberta_id = d.id
                      AND l.geologo_id = ?
              )
            ORDER BY d.data_registro ASC
            `,
            [usuarioId]
        );

        return res.json({
            sucesso: true,
            descobertas: descobertas
        });

    }

    catch (erro) {

        console.error(erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar as descobertas pendentes.'
        });

    }

});


// =====================================================
// LAUDO - HISTÓRICO DO PRÓPRIO GEÓLOGO

// =====================================================

app.get('/api/laudos/meus', async (req, res) => {

    try {

        const usuarioId = Number(req.query.usuario_id);

        if (!usuarioId || !(await buscarGeologoAtivo(usuarioId))) {

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Apenas geólogos podem acessar os laudos.'
            });

        }

        const [laudos] = await db.query(
            `
            SELECT
                l.id,
                l.voto,
                l.parecer,
                l.data_laudo,
                d.nome_rocha,
                d.status,
                (
                    SELECT c.id
                    FROM certificados c
                    WHERE c.descoberta_id = d.id
                ) AS certificado_id
            FROM laudos l
            JOIN descobertas d ON d.id = l.descoberta_id
            WHERE l.geologo_id = ?
            ORDER BY l.data_laudo DESC
            `,
            [usuarioId]
        );

        return res.json({
            sucesso: true,
            laudos: laudos
        });

    }

    catch (erro) {

        console.error(erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar seus laudos.'
        });

    }

});


// =====================================================
// LAUDO - REGISTRAR O VOTO
// Regra: os dois primeiros laudos decidem a descoberta.
//   2 aprovados   -> aprovada (vai pro leilão) + certificado
//   2 reprovados  -> reprovada
//   divergência   -> retida para análise física
// =====================================================

app.post('/api/laudos', async (req, res) => {

    let conexao;

    try {

        const {
            usuario_id,
            descoberta_id,
            voto,
            parecer
        } = req.body;


        // ---------- Validações ----------

        if (
            !usuario_id ||
            !descoberta_id ||
            !['aprovado', 'reprovado'].includes(voto)
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe a descoberta e o voto (aprovado ou reprovado).'
            });

        }

        const textoParecer = parecer ? String(parecer).trim() : '';

        if (textoParecer.length > 2000) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'O parecer pode ter no máximo 2000 caracteres.'
            });

        }

        // Só geólogo ativo pode votar (conferido no banco)
        if (!(await buscarGeologoAtivo(Number(usuario_id)))) {

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Apenas geólogos podem emitir laudos.'
            });

        }


        // ---------- Transação ----------
        // O FOR UPDATE trava a linha da descoberta: se dois geólogos
        // votarem ao mesmo tempo, um espera o outro terminar.

        conexao = await db.getConnection();
        await conexao.beginTransaction();

        const [descobertas] = await conexao.query(
            `
            SELECT id, status
            FROM descobertas
            WHERE id = ?
            FOR UPDATE
            `,
            [descoberta_id]
        );

        if (descobertas.length === 0) {

            await conexao.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Descoberta não encontrada.'
            });

        }

        if (descobertas[0].status !== 'pendente') {

            await conexao.rollback();

            return res.status(409).json({
                sucesso: false,
                mensagem: 'Esta descoberta já foi decidida pelos dois primeiros laudos.'
            });

        }


        // ---------- Grava o laudo ----------
        // (o UNIQUE do banco impede o mesmo geólogo de votar duas vezes)

        try {

            await conexao.query(
                `
                INSERT INTO laudos
                (descoberta_id, geologo_id, voto, parecer)
                VALUES (?, ?, ?, ?)
                `,
                [
                    descoberta_id,
                    usuario_id,
                    voto,
                    textoParecer || null
                ]
            );

        }

        catch (erroInsert) {

            if (erroInsert.code === 'ER_DUP_ENTRY') {

                await conexao.rollback();

                return res.status(409).json({
                    sucesso: false,
                    mensagem: 'Você já emitiu um laudo para esta descoberta.'
                });

            }

            throw erroInsert;

        }


        // ---------- Verifica se já dá pra decidir ----------

        const [laudos] = await conexao.query(
            `
            SELECT voto
            FROM laudos
            WHERE descoberta_id = ?
            `,
            [descoberta_id]
        );

        let statusFinal = 'pendente';

        if (laudos.length >= 2) {

            const aprovados = laudos.filter(
                (l) => l.voto === 'aprovado'
            ).length;

            if (aprovados === laudos.length) {
                statusFinal = 'aprovada';
            } else if (aprovados === 0) {
                statusFinal = 'reprovada';
            } else {
                statusFinal = 'retida';
            }

            await conexao.query(
                `
                UPDATE descobertas
                SET status = ?
                WHERE id = ?
                `,
                [statusFinal, descoberta_id]
            );

            // Peça aprovada: o certificado nasce junto, na mesma transação
            if (statusFinal === 'aprovada') {

                await conexao.query(
                    `
                    INSERT INTO certificados (descoberta_id)
                    VALUES (?)
                    `,
                    [descoberta_id]
                );

            }

        }

        await conexao.commit();


        // ---------- Mensagem para o geólogo ----------

        const mensagens = {
            pendente: 'Laudo registrado! Aguardando o laudo de outro geólogo.',
            aprovada: 'Laudo registrado! A descoberta foi APROVADA e o certificado foi emitido.',
            reprovada: 'Laudo registrado! A descoberta foi REPROVADA pelos dois geólogos.',
            retida: 'Laudo registrado! Os laudos divergiram: a descoberta ficou RETIDA para análise física.'
        };

        return res.status(201).json({
            sucesso: true,
            statusDescoberta: statusFinal,
            mensagem: mensagens[statusFinal]
        });

    }

    catch (erro) {

        if (conexao) {
            await conexao.rollback();
        }

        console.error(erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao registrar o laudo.'
        });

    }

    finally {

        if (conexao) {
            conexao.release();
        }

    }

});


// =====================================================
// LEILÃO 
// =====================================================

// Confere no banco se o usuário é um comprador ativo
async function buscarCompradorAtivo(usuarioId) {

    const [usuarios] = await db.query(
        `
        SELECT id, perfil, ativo
        FROM usuarios
        WHERE id = ?
        LIMIT 1
        `,
        [usuarioId]
    );

    if (
        usuarios.length === 0 ||
        usuarios[0].perfil !== 'comprador' ||
        !usuarios[0].ativo
    ) {
        return null;
    }

    return usuarios[0];

}


// Formata um valor em centavos como "R$ 1500,50"
function formatarReais(centavos) {
    return 'R$ ' + (centavos / 100).toFixed(2).replace('.', ',');
}


// =====================================================
// LEILÃO - LISTAR AS PEÇAS APROVADAS
// (os outros compradores ficam anônimos: só se sabe
//  se VOCÊ está ou não com o maior lance)
// =====================================================

app.get('/api/leilao', async (req, res) => {

    try {

        const usuarioId = Number(req.query.usuario_id);

        if (!usuarioId || !(await buscarCompradorAtivo(usuarioId))) {

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Apenas compradores podem acessar o leilão.'
            });

        }

        const [itens] = await db.query(
            `
            SELECT
                d.id,
                d.nome_rocha,
                d.local_descoberta,
                d.peso_kg,
                d.descricao,
                d.lance_inicial,
                (
                    SELECT f.caminho
                    FROM fotos_descoberta f
                    WHERE f.descoberta_id = d.id
                    ORDER BY f.id
                    LIMIT 1
                ) AS foto,
                (
                    SELECT MAX(l.valor)
                    FROM lances l
                    WHERE l.descoberta_id = d.id
                ) AS maior_lance,
                (
                    SELECT COUNT(*)
                    FROM lances l
                    WHERE l.descoberta_id = d.id
                ) AS total_lances,
                (
                    SELECT l.usuario_id
                    FROM lances l
                    WHERE l.descoberta_id = d.id
                    ORDER BY l.valor DESC, l.id ASC
                    LIMIT 1
                ) AS lider_id,
                (
                    SELECT c.id
                    FROM certificados c
                    WHERE c.descoberta_id = d.id
                ) AS certificado_id
            FROM descobertas d
            WHERE d.status = 'aprovada'
            ORDER BY d.data_registro DESC
            `
        );

        const lista = itens.map((item) => {

            const lanceInicial = Number(item.lance_inicial);

            const maior = item.maior_lance !== null
                ? Number(item.maior_lance)
                : null;

            // Primeiro lance: pelo menos o lance inicial.
            // Depois: precisa superar o maior lance (mínimo +1 centavo).
            const minimoCentavos = maior === null
                ? Math.round(lanceInicial * 100)
                : Math.round(maior * 100) + 1;

            return {
                id: item.id,
                nome_rocha: item.nome_rocha,
                local_descoberta: item.local_descoberta,
                peso_kg: Number(item.peso_kg),
                descricao: item.descricao,
                foto: item.foto,
                certificado_id: item.certificado_id,
                lance_inicial: lanceInicial,
                maior_lance: maior,
                total_lances: Number(item.total_lances),
                lance_minimo: minimoCentavos / 100,
                vencendo: item.lider_id === usuarioId
            };

        });

        return res.json({
            sucesso: true,
            itens: lista
        });

    }

    catch (erro) {

        console.error(erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao carregar o leilão.'
        });

    }

});


// =====================================================
// LEILÃO - DAR UM LANCE
// =====================================================

app.post('/api/lances', async (req, res) => {

    let conexao;

    try {

        const { usuario_id, descoberta_id, valor } = req.body;


        // ---------- Validações ----------

        if (!usuario_id || !descoberta_id) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe a peça e o valor do lance.'
            });

        }

        // Trabalha em centavos (números inteiros) pra evitar erro de arredondamento
        const valorCentavos = Math.round(Number(valor) * 100);

        if (
            !Number.isFinite(valorCentavos) ||
            valorCentavos <= 0 ||
            valorCentavos > 999999999999
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe um valor de lance válido.'
            });

        }

        // Só comprador ativo pode dar lance (conferido no banco)
        if (!(await buscarCompradorAtivo(Number(usuario_id)))) {

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Apenas compradores podem dar lances.'
            });

        }


        // ---------- Transação ----------
        // O FOR UPDATE trava a peça: se dois compradores derem lance
        // ao mesmo tempo, um espera o outro terminar.

        conexao = await db.getConnection();
        await conexao.beginTransaction();

        const [descobertas] = await conexao.query(
            `
            SELECT id, status, lance_inicial
            FROM descobertas
            WHERE id = ?
            FOR UPDATE
            `,
            [descoberta_id]
        );

        if (descobertas.length === 0) {

            await conexao.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Peça não encontrada.'
            });

        }

        if (descobertas[0].status !== 'aprovada') {

            await conexao.rollback();

            return res.status(409).json({
                sucesso: false,
                mensagem: descobertas[0].status === 'vendida'
                    ? 'Este leilão já foi encerrado.'
                    : 'Esta peça não está disponível no leilão.'
            });

        }


        // ---------- Confere o valor mínimo ----------

        const [maiores] = await conexao.query(
            `
            SELECT MAX(valor) AS maior
            FROM lances
            WHERE descoberta_id = ?
            `,
            [descoberta_id]
        );

        const maior = maiores[0].maior !== null
            ? Number(maiores[0].maior)
            : null;

        const minimoCentavos = maior === null
            ? Math.round(Number(descobertas[0].lance_inicial) * 100)
            : Math.round(maior * 100) + 1;

        if (valorCentavos < minimoCentavos) {

            await conexao.rollback();

            return res.status(409).json({
                sucesso: false,
                mensagem: 'Seu lance precisa ser de pelo menos ' +
                    formatarReais(minimoCentavos) + '.'
            });

        }


        // ---------- Grava o lance ----------

        await conexao.query(
            `
            INSERT INTO lances (descoberta_id, usuario_id, valor)
            VALUES (?, ?, ?)
            `,
            [
                descoberta_id,
                usuario_id,
                valorCentavos / 100
            ]
        );

        await conexao.commit();

        return res.status(201).json({
            sucesso: true,
            mensagem: 'Lance de ' + formatarReais(valorCentavos) +
                ' registrado! Você está com o maior lance.'
        });

    }

    catch (erro) {

        if (conexao) {
            await conexao.rollback();
        }

        console.error(erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao registrar o lance.'
        });

    }

    finally {

        if (conexao) {
            conexao.release();
        }

    }

});


// =====================================================
// LEILÃO - ENCERRAR (feito pelo caçador dono da peça)
// O maior lance vence. Sem lances, não dá pra encerrar.
// =====================================================

app.post('/api/leilao/encerrar', async (req, res) => {

    let conexao;

    try {

        const { usuario_id, descoberta_id } = req.body;

        if (!usuario_id || !descoberta_id) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Informe a peça que deseja encerrar.'
            });

        }


        conexao = await db.getConnection();
        await conexao.beginTransaction();

        // Trava a peça: ninguém dá lance enquanto ela está sendo encerrada
        const [descobertas] = await conexao.query(
            `
            SELECT d.id, d.status, d.cacador_id, u.perfil, u.ativo
            FROM descobertas d
            JOIN usuarios u ON u.id = ?
            WHERE d.id = ?
            FOR UPDATE
            `,
            [usuario_id, descoberta_id]
        );

        if (descobertas.length === 0) {

            await conexao.rollback();

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Peça ou usuário não encontrado.'
            });

        }

        const peca = descobertas[0];

        // Só o caçador dono da peça pode encerrar o leilão dela
        if (
            peca.perfil !== 'cacador' ||
            !peca.ativo ||
            peca.cacador_id !== Number(usuario_id)
        ) {

            await conexao.rollback();

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Só o caçador que descobriu a peça pode encerrar o leilão.'
            });

        }

        if (peca.status !== 'aprovada') {

            await conexao.rollback();

            return res.status(409).json({
                sucesso: false,
                mensagem: peca.status === 'vendida'
                    ? 'Este leilão já foi encerrado.'
                    : 'Esta peça não está em leilão.'
            });

        }


        // ---------- Descobre o vencedor (maior lance) ----------

        const [vencedores] = await conexao.query(
            `
            SELECT l.valor, u.nome
            FROM lances l
            JOIN usuarios u ON u.id = l.usuario_id
            WHERE l.descoberta_id = ?
            ORDER BY l.valor DESC, l.id ASC
            LIMIT 1
            `,
            [descoberta_id]
        );

        if (vencedores.length === 0) {

            await conexao.rollback();

            return res.status(409).json({
                sucesso: false,
                mensagem: 'Ainda não há lances: o leilão não pode ser encerrado.'
            });

        }

        await conexao.query(
            `
            UPDATE descobertas
            SET status = 'vendida'
            WHERE id = ?
            `,
            [descoberta_id]
        );

        await conexao.commit();

        return res.json({
            sucesso: true,
            mensagem: 'Leilão encerrado! Peça vendida para ' +
                vencedores[0].nome + ' por ' +
                formatarReais(Math.round(Number(vencedores[0].valor) * 100)) + '.'
        });

    }

    catch (erro) {

        if (conexao) {
            await conexao.rollback();
        }

        console.error(erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao encerrar o leilão.'
        });

    }

    finally {

        if (conexao) {
            conexao.release();
        }

    }

});


// =====================================================
// LEILÃO - PEÇAS QUE ESTE COMPRADOR ARREMATOU
// =====================================================

app.get('/api/leilao/minhas-compras', async (req, res) => {

    try {

        const usuarioId = Number(req.query.usuario_id);

        if (!usuarioId || !(await buscarCompradorAtivo(usuarioId))) {

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Apenas compradores podem acessar as compras.'
            });

        }

        // O vencedor é quem fez o maior lance da peça vendida
        const [compras] = await db.query(
            `
            SELECT
                d.id,
                d.nome_rocha,
                d.local_descoberta,
                d.peso_kg,
                d.descricao,
                l.valor AS valor_final,
                (
                    SELECT f.caminho
                    FROM fotos_descoberta f
                    WHERE f.descoberta_id = d.id
                    ORDER BY f.id
                    LIMIT 1
                ) AS foto,
                (
                    SELECT c.id
                    FROM certificados c
                    WHERE c.descoberta_id = d.id
                ) AS certificado_id
            FROM descobertas d
            JOIN lances l
              ON l.descoberta_id = d.id
             AND l.valor = (
                    SELECT MAX(l2.valor)
                    FROM lances l2
                    WHERE l2.descoberta_id = d.id
             )
            WHERE d.status = 'vendida'
              AND l.usuario_id = ?
            ORDER BY d.id DESC
            `,
            [usuarioId]
        );

        return res.json({
            sucesso: true,
            compras: compras.map((c) => ({
                id: c.id,
                nome_rocha: c.nome_rocha,
                local_descoberta: c.local_descoberta,
                peso_kg: Number(c.peso_kg),
                descricao: c.descricao,
                foto: c.foto,
                certificado_id: c.certificado_id,
                valor_final: Number(c.valor_final)
            }))
        });

    }

    catch (erro) {

        console.error(erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar as compras.'
        });

    }

});


// =====================================================
// CERTIFICADO DE AUTENTICIDADE - DADOS PARA A PÁGINA
// Regra simples: qualquer usuário logado e ativo pode ver.
// =====================================================

app.get('/api/certificados/:id', async (req, res) => {

    try {

        const certificadoId = Number(req.params.id);
        const usuarioId = Number(req.query.usuario_id);

        if (!certificadoId) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Certificado inválido.'
            });

        }

        if (!usuarioId) {

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Faça login para ver o certificado.'
            });

        }

        const [usuarios] = await db.query(
            `
            SELECT id, ativo
            FROM usuarios
            WHERE id = ?
            LIMIT 1
            `,
            [usuarioId]
        );

        if (usuarios.length === 0 || !usuarios[0].ativo) {

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Faça login para ver o certificado.'
            });

        }

        const [certificados] = await db.query(
            `
            SELECT
                c.id,
                c.data_emissao,
                d.id AS descoberta_id,
                d.nome_rocha,
                d.local_descoberta,
                d.peso_kg,
                d.data_registro,
                u.nome AS cacador
            FROM certificados c
            JOIN descobertas d ON d.id = c.descoberta_id
            JOIN usuarios u ON u.id = d.cacador_id
            WHERE c.id = ?
            LIMIT 1
            `,
            [certificadoId]
        );

        if (certificados.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Certificado não encontrado.'
            });

        }

        const cert = certificados[0];

        const [geologos] = await db.query(
            `
            SELECT u.nome
            FROM laudos l
            JOIN usuarios u ON u.id = l.geologo_id
            WHERE l.descoberta_id = ?
              AND l.voto = 'aprovado'
            ORDER BY l.data_laudo, l.id
            `,
            [cert.descoberta_id]
        );

        return res.json({
            sucesso: true,
            certificado: {
                id: cert.id,
                numero: 'AT-' +
                    new Date(cert.data_emissao).getFullYear() + '-' +
                    String(cert.id).padStart(4, '0'),
                nome_rocha: cert.nome_rocha,
                local_descoberta: cert.local_descoberta,
                peso_kg: Number(cert.peso_kg),
                cacador: cert.cacador,
                data_registro: cert.data_registro,
                data_emissao: cert.data_emissao,
                geologos: geologos.map((g) => g.nome)
            }
        });

    }

    catch (erro) {

        console.error(erro);

        return res.status(500).json({
            sucesso: false,
            mensagem: 'Erro ao buscar o certificado.'
        });

    }

});


// =====================================================
// CERTIFICADO DE AUTENTICIDADE - DOWNLOAD EM PDF
// Regra simples: qualquer usuário logado e ativo pode baixar.
// =====================================================

app.get('/api/certificados/:id/pdf', async (req, res) => {

    try {

        const certificadoId = Number(req.params.id);
        const usuarioId = Number(req.query.usuario_id);

        if (!certificadoId) {

            return res.status(400).json({
                sucesso: false,
                mensagem: 'Certificado inválido.'
            });

        }

        // Sem usuário informado: nem consulta o banco
        if (!usuarioId) {

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Faça login para baixar o certificado.'
            });

        }

        const [usuarios] = await db.query(
            `
            SELECT id, ativo
            FROM usuarios
            WHERE id = ?
            LIMIT 1
            `,
            [usuarioId]
        );

        if (usuarios.length === 0 || !usuarios[0].ativo) {

            return res.status(403).json({
                sucesso: false,
                mensagem: 'Faça login para baixar o certificado.'
            });

        }


        // ---------- Dados do certificado ----------

        const [certificados] = await db.query(
            `
            SELECT
                c.id,
                c.data_emissao,
                d.id AS descoberta_id,
                d.nome_rocha,
                d.local_descoberta,
                d.peso_kg,
                d.data_registro,
                u.nome AS cacador
            FROM certificados c
            JOIN descobertas d ON d.id = c.descoberta_id
            JOIN usuarios u ON u.id = d.cacador_id
            WHERE c.id = ?
            LIMIT 1
            `,
            [certificadoId]
        );

        if (certificados.length === 0) {

            return res.status(404).json({
                sucesso: false,
                mensagem: 'Certificado não encontrado.'
            });

        }

        const cert = certificados[0];

        const [geologos] = await db.query(
            `
            SELECT u.nome
            FROM laudos l
            JOIN usuarios u ON u.id = l.geologo_id
            WHERE l.descoberta_id = ?
              AND l.voto = 'aprovado'
            ORDER BY l.data_laudo, l.id
            `,
            [cert.descoberta_id]
        );


        // ---------- Monta o PDF ----------

        const numero = 'AT-' +
            new Date(cert.data_emissao).getFullYear() + '-' +
            String(cert.id).padStart(4, '0');

        const dataBR = (data) => new Date(data).toLocaleDateString('pt-BR');

        const AZUL = '#1f3f66';
        const CINZA = '#555555';

        const doc = new PDFDocument({ size: 'A4', margin: 60 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
            'Content-Disposition',
            'attachment; filename="certificado-' + numero + '.pdf"'
        );

        doc.pipe(res);

        const largura = doc.page.width;

        // Moldura
        doc.lineWidth(3).strokeColor(AZUL)
            .rect(28, 28, largura - 56, doc.page.height - 56).stroke();
        doc.lineWidth(0.8)
            .rect(36, 36, largura - 72, doc.page.height - 72).stroke();

        // Logo do produto (se o arquivo existir)
        const logoProduto = path.join(__dirname, 'public', 'img', 'logo-astrotracker.png');
        const logoEmpresa = path.join(__dirname, 'public', 'img', 'logo-webdev.png');

        if (fs.existsSync(logoProduto)) {
            doc.image(logoProduto, (largura - 300) / 2, 70, { width: 300 });
        } else {
            doc.font('Helvetica-Bold').fontSize(28).fillColor(AZUL)
                .text('ASTROTRACKER', 60, 90, { align: 'center' });
        }

        // Título
        doc.font('Helvetica-Bold').fontSize(24).fillColor(AZUL)
            .text('CERTIFICADO DE AUTENTICIDADE', 60, 200, { align: 'center' });

        doc.font('Helvetica').fontSize(12).fillColor(CINZA)
            .text('Nº ' + numero, 60, 236, { align: 'center' });

        // Texto de abertura
        doc.font('Helvetica').fontSize(12).fillColor('#222222')
            .text(
                'A WebDev, por meio da plataforma AstroTracker, certifica que o ' +
                'meteorito descrito abaixo teve sua autenticidade avaliada de forma ' +
                'independente por dois geólogos cadastrados no sistema, ambos com ' +
                'parecer favorável.',
                70, 280, { align: 'justify', width: largura - 140 }
            );

        // Dados da peça
        let y = 360;

        const linha = (rotulo, valor) => {

            doc.font('Helvetica-Bold').fontSize(11).fillColor(AZUL)
                .text(rotulo.toUpperCase(), 70, y, { width: largura - 140 });

            doc.font('Helvetica').fontSize(14).fillColor('#111111')
                .text(valor, 70, doc.y + 2, { width: largura - 140 });

            y = doc.y + 14;

        };

        linha('Meteorito', cert.nome_rocha);
        linha('Local da descoberta', cert.local_descoberta);
        linha('Peso', Number(cert.peso_kg).toLocaleString('pt-BR') + ' kg');
        linha('Descoberto por', cert.cacador);
        linha('Data do registro', dataBR(cert.data_registro));
        linha('Geólogos que aprovaram', geologos.map((g) => g.nome).join(', '));

        // Rodapé
        doc.lineWidth(0.8).strokeColor(AZUL)
            .moveTo(70, 690).lineTo(largura - 70, 690).stroke();

        doc.font('Helvetica').fontSize(11).fillColor(CINZA)
            .text('Emitido em ' + dataBR(cert.data_emissao), 70, 702, { width: 250 });

        doc.fontSize(9)
            .text(
                'Documento emitido eletronicamente pelo sistema AstroTracker.',
                70, 722, { width: 260 }
            );

        if (fs.existsSync(logoEmpresa)) {
            doc.image(logoEmpresa, largura - 70 - 110, 698, { width: 110 });
        }

        doc.fontSize(9).fillColor(CINZA)
            .text('© ' + new Date(cert.data_emissao).getFullYear() + ' WebDev',
                largura - 70 - 110, 762, { width: 110, align: 'center' });

        doc.end();

    }

    catch (erro) {

        console.error(erro);

        if (!res.headersSent) {

            return res.status(500).json({
                sucesso: false,
                mensagem: 'Erro ao gerar o certificado.'
            });

        }

    }

});


// =====================================================
// SERVIDOR
// =====================================================

app.listen(PORT, () => {

    console.log('');
    console.log('=================================');
    console.log(' AstroTracker');
    console.log('=================================');
    console.log('');
    console.log(
        `Servidor: http://localhost:${PORT}`
    );
    console.log('');

});
