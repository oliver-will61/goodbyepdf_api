/*
    Submenus suspensos do cabeçalho (telas grandes).

    Cada grupo é um <li data-submenu> com um botão [data-submenu-botao] e um painel.
    O painel aparece pelo CSS em dois casos:
      - mouse por cima do grupo (group-hover:, funciona mesmo sem JS);
      - atributo data-aberto no <li> (group-data-[aberto]:), controlado aqui.

    Este script cuida de quem não usa mouse: clique/toque no botão, teclado
    (Tab abre o grupo em foco, Esc fecha) e mantém o aria-expanded em dia.
*/

const grupos = [...document.querySelectorAll('[data-submenu]')]

// abre ou fecha um grupo, atualizando o atributo usado pelo CSS e o aria-expanded
function alterna(grupo, abrir) {
    grupo.toggleAttribute('data-aberto', abrir)
    grupo.querySelector('[data-submenu-botao]').setAttribute('aria-expanded', String(abrir))
}

// fecha todos os grupos, menos o indicado (só um submenu aberto por vez)
function fechaOutros(excecao) {
    grupos.forEach((grupo) => {
        if (grupo !== excecao) alterna(grupo, false)
    })
}

grupos.forEach((grupo) => {
    const botao = grupo.querySelector('[data-submenu-botao]')

    // mouse: abre ao entrar e fecha ao sair (toque é ignorado, para não brigar com o clique)
    grupo.addEventListener('pointerenter', (evento) => {
        if (evento.pointerType !== 'mouse') return
        fechaOutros(grupo)
        alterna(grupo, true)
    })
    grupo.addEventListener('pointerleave', (evento) => {
        if (evento.pointerType === 'mouse') alterna(grupo, false)
    })

    // clique ou toque no botão: alterna o painel
    botao.addEventListener('click', () => {
        const abrir = !grupo.hasAttribute('data-aberto')
        fechaOutros(grupo)
        alterna(grupo, abrir)
    })

    // teclado: abre quando o foco (visível, ou seja, via Tab) entra no grupo
    grupo.addEventListener('focusin', (evento) => {
        if (!evento.target.matches(':focus-visible')) return
        fechaOutros(grupo)
        alterna(grupo, true)
    })

    // fecha quando o foco sai do grupo
    grupo.addEventListener('focusout', (evento) => {
        if (!grupo.contains(evento.relatedTarget)) alterna(grupo, false)
    })

    // Esc fecha o grupo e devolve o foco ao botão
    grupo.addEventListener('keydown', (evento) => {
        if (evento.key !== 'Escape' || !grupo.hasAttribute('data-aberto')) return
        alterna(grupo, false)
        // o foco volta ao botão sem reabrir o painel: o focusin só abre se o foco vier de fora
        if (document.activeElement !== botao) {
            botao.addEventListener('focusin', (e) => e.stopPropagation(), { once: true })
            botao.focus()
        }
    })
})

// clique fora de qualquer grupo fecha os submenus
document.addEventListener('click', (evento) => {
    if (!grupos.some((grupo) => grupo.contains(evento.target))) fechaOutros(null)
})
