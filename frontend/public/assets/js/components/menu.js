/*
    Menu de navegação para telas pequenas.

    O botão com data-menu-botao abre e fecha o elemento indicado
    no seu aria-controls, mantendo o aria-expanded atualizado.
*/

const botao = document.querySelector('[data-menu-botao]')
const menu = botao && document.getElementById(botao.getAttribute('aria-controls'))

if (botao && menu) {
    botao.addEventListener('click', () => {
        const aberto = botao.getAttribute('aria-expanded') === 'true'
        botao.setAttribute('aria-expanded', String(!aberto))
        menu.classList.toggle('hidden', aberto)
    })

    // fecha o menu com Esc e devolve o foco ao botão
    document.addEventListener('keydown', (evento) => {
        if (evento.key === 'Escape' && botao.getAttribute('aria-expanded') === 'true') {
            botao.setAttribute('aria-expanded', 'false')
            menu.classList.add('hidden')
            botao.focus()
        }
    })
}
