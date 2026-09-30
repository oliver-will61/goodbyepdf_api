/*
    Alternância entre modo claro e escuro.

    A classe "dark" no <html> ativa as variantes dark: do Tailwind.
    A escolha do usuário fica salva no localStorage; sem escolha salva,
    segue a preferência do sistema operacional.

    Obs.: um script inline no <head> de cada página aplica o tema antes
    da renderização, evitando o "piscar" do tema claro ao carregar.
*/

const CHAVE_TEMA = 'tema'

function salvaTema(tema) {
    // localStorage pode estar bloqueado (aba anônima, cookies desativados)
    try {
        localStorage.setItem(CHAVE_TEMA, tema)
    } catch {
        // sem persistência: o tema vale só até recarregar a página
    }
}

function aplicaTema(escuro) {
    // liga/desliga a classe e atualiza o estado acessível dos botões
    document.documentElement.classList.toggle('dark', escuro)
    document.querySelectorAll('[data-alterna-tema]').forEach((botao) => {
        botao.setAttribute('aria-pressed', String(escuro))
        botao.setAttribute('aria-label', escuro ? 'Ativar modo claro' : 'Ativar modo escuro')
    })
}

// estado inicial dos botões, de acordo com o tema já aplicado no <head>
aplicaTema(document.documentElement.classList.contains('dark'))

// cada botão com data-alterna-tema inverte o tema atual
document.querySelectorAll('[data-alterna-tema]').forEach((botao) => {
    botao.addEventListener('click', () => {
        const escuro = !document.documentElement.classList.contains('dark')
        aplicaTema(escuro)
        salvaTema(escuro ? 'escuro' : 'claro')
    })
})
