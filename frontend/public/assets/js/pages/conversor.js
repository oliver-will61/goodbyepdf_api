/*
    Lógica compartilhada pelas páginas de conversão.

    Cada página declara a conversão no próprio <form>, por atributos data-*:
        data-endpoint        rota da API (ex.: /json-xlsx)
        data-extensao        extensão aceita na entrada (ex.: json)
        data-extensao-saida  extensão do arquivo convertido (ex.: xlsx)

    Assim, uma nova conversão precisa só de um novo HTML, sem JS novo.
*/

import Arquivo from '../models/Arquivo.js'
import geraDownload from '../utils/geraDownload.js'

const form = document.querySelector('[data-conversor]')

if (form) {
    const { endpoint, extensao, extensaoSaida } = form.dataset

    const input = form.querySelector('input[type="file"]')
    const areaSoltar = form.querySelector('[data-area-soltar]')
    const nomeArquivo = form.querySelector('[data-nome-arquivo]')
    const botaoConverter = form.querySelector('[data-botao-converter]')
    const textoBotao = botaoConverter.querySelector('[data-texto]')
    const iconeCarregando = botaoConverter.querySelector('[data-carregando]')
    const mensagem = form.querySelector('[data-mensagem]')
    // convite para doar (opcional: a página funciona sem ele)
    const conviteDoacao = form.querySelector('[data-convite-doacao]')

    // arquivo atual: vem do input ou de um arrastar e soltar
    let arquivoSelecionado = null

    // classes de cor da caixa de mensagem para cada situação
    const ESTILOS_MENSAGEM = {
        erro: 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-900 dark:bg-primary-950/60 dark:text-primary-200',
        sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
    }

    function mostraMensagem(texto, tipo) {
        /* Exibe a mensagem de erro/sucesso abaixo do botão */
        mensagem.className = `rounded-xl border px-4 py-3 text-sm ${ESTILOS_MENSAGEM[tipo]}`
        mensagem.textContent = texto
    }

    function limpaMensagem() {
        /* Esconde a caixa de mensagem (e o convite para doar, que só acompanha o sucesso) */
        mensagem.className = 'hidden'
        mensagem.textContent = ''
        mostraConviteDoacao(false)
    }

    function mostraConviteDoacao(mostrar) {
        /* Mostra ou esconde o convite para doar abaixo da mensagem */
        conviteDoacao?.classList.toggle('hidden', !mostrar)
        conviteDoacao?.classList.toggle('flex', mostrar)
    }

    function selecionaArquivo(arquivo) {
        /* Guarda o arquivo escolhido e mostra o nome na área de upload */
        arquivoSelecionado = arquivo ?? null
        limpaMensagem()

        if (arquivoSelecionado) {
            nomeArquivo.textContent = arquivoSelecionado.name
            nomeArquivo.classList.remove('hidden')
        } else {
            nomeArquivo.classList.add('hidden')
        }
    }

    function defineCarregando(carregando) {
        /* Desabilita o botão e mostra o spinner enquanto a conversão acontece */
        botaoConverter.disabled = carregando
        form.setAttribute('aria-busy', String(carregando))
        iconeCarregando.classList.toggle('hidden', !carregando)
        textoBotao.textContent = carregando ? 'Convertendo…' : 'Converter arquivo'
    }

    // seleção pelo seletor de arquivos nativo
    input.addEventListener('change', () => selecionaArquivo(input.files[0]))

    // realce visual enquanto o usuário arrasta um arquivo sobre a área
    const CLASSES_ARRASTANDO = ['border-primary', 'bg-primary-50', 'dark:bg-primary-950/40']

    ;['dragenter', 'dragover'].forEach((tipo) => {
        areaSoltar.addEventListener(tipo, (evento) => {
            evento.preventDefault()
            areaSoltar.classList.add(...CLASSES_ARRASTANDO)
        })
    })

    ;['dragleave', 'drop'].forEach((tipo) => {
        areaSoltar.addEventListener(tipo, (evento) => {
            evento.preventDefault()
            areaSoltar.classList.remove(...CLASSES_ARRASTANDO)
        })
    })

    // arquivo solto sobre a área: usa só o primeiro
    areaSoltar.addEventListener('drop', (evento) => {
        const [arquivo] = evento.dataTransfer.files
        if (arquivo) {
            selecionaArquivo(arquivo)
        }
    })

    // envio do formulário: valida, converte e dispara o download
    form.addEventListener('submit', async (evento) => {
        evento.preventDefault()
        limpaMensagem()

        try {
            const arquivo = new Arquivo(arquivoSelecionado)
            arquivo.verificaExtensao(extensao)

            defineCarregando(true)
            const resposta = await arquivo.realizaConversao(endpoint)

            // o arquivo convertido mantém o nome original, com a nova extensão
            const nomeConvertido = `${arquivo.nomeSemExtensao}.${extensaoSaida}`
            await geraDownload(resposta, nomeConvertido)

            mostraMensagem(`Pronto! O download de "${nomeConvertido}" foi iniciado.`, 'sucesso')
            // momento em que o usuário acabou de ser ajudado: convida para apoiar o projeto
            mostraConviteDoacao(true)
        } catch (erro) {
            mostraMensagem(erro.message, 'erro')
        } finally {
            defineCarregando(false)
        }
    })
}
