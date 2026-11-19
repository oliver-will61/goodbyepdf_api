/*
    Filtros das ferramentas da página inicial.

    Os botões [data-filtro] do topo escolhem qual seção [data-grupo] de
    ferramentas fica visível: "todas" mostra todas; os demais mostram só a
    seção cujo data-grupo é igual ao data-filtro do botão.
    Sem JS, todas as seções continuam visíveis (o HTML já vem assim).
    O clique não rola a página: a posição da rolagem fica onde está.
*/

const botoes = [...document.querySelectorAll('[data-filtro]')]
const secoes = [...document.querySelectorAll('[data-grupo]')]

// valor de data-filtro que mostra todas as seções
const TODAS = 'todas'

// mostra só as seções do filtro escolhido e marca o botão ativo (aria-pressed, usado pelo .btn-filtro)
function aplicaFiltro(filtro) {
    secoes.forEach((secao) => {
        secao.classList.toggle('hidden', filtro !== TODAS && secao.dataset.grupo !== filtro)
    })
    botoes.forEach((botao) => {
        botao.setAttribute('aria-pressed', String(botao.dataset.filtro === filtro))
    })
}

botoes.forEach((botao) => {
    botao.addEventListener('click', () => {
        // só filtra: a posição da rolagem não muda
        aplicaFiltro(botao.dataset.filtro)
    })
})
