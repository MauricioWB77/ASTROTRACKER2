const db = require('./conexao');

async function testarConexao() {

    try {

        console.log('🔄 Testando conexão com MySQL...\n');

        const [resultado] = await db.query(`
            SELECT
                NOW() AS data_hora,
                DATABASE() AS banco,
                CURRENT_USER() AS usuario,
                VERSION() AS versao
        `);

        console.log('✅ CONEXÃO REALIZADA COM SUCESSO!\n');

        console.log('Banco:', resultado[0].banco);
        console.log('Usuário:', resultado[0].usuario);
        console.log('Data/Hora:', resultado[0].data_hora);
        console.log('Versão:', resultado[0].versao);

    } catch (erro) {

        console.error('\n❌ ERRO NA CONEXÃO:\n');

        console.error('Mensagem:', erro.message);

        if (erro.code) {
            console.error('Código:', erro.code);
        }

    } finally {

        await db.end();

        console.log('\n🔌 Conexão encerrada.');

    }
}
testarConexao();