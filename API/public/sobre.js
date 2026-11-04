// =====================================================
// script.js - código compartilhado por todas as páginas
// =====================================================

// >>> TROQUE pelos nomes reais da equipe <<<
const EQUIPE = 'Mauricio Wendel, Kaua de Souza e Maria Eduarda';


// Rodapé: © + empresa + equipe + link para a página "Sobre nós".
// É criado automaticamente no final de toda página que carrega este script.
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', criarRodape);
} else {
    criarRodape();
}
