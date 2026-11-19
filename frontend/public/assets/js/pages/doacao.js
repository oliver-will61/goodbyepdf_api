/*
    Página de doação (pages/doacao.html).

    Preenche o QR Code e o "Pix copia e cola" gerados por `npm run gera:pix`
    (scripts/geraPix.ts) e cuida do botão de copiar o código.
    Enquanto o Pix não estiver configurado (PIX_COPIA_E_COLA = null),
    esconde a área do Pix e mostra um aviso no lugar.
*/

import { PIX_COPIA_E_COLA } from '../config/pix.js'

// QR Code gerado junto com o "copia e cola"
const CAMINHO_QRCODE = '/assets/img/pix-qrcode.svg'

// por quanto tempo o botão mostra "Código copiado!" antes de voltar ao texto normal
const TEMPO_CONFIRMACAO_MS = 3000

// classes de cor da caixa de mensagem para cada situação (mesmas de conversor.js)
const ESTILOS_MENSAGEM = {
    erro: 'border-primary-200 bg-primary-50 text-primary-800 dark:border-primary-900 dark:bg-primary-950/60 dark:text-primary-200',
    sucesso: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
}

const areaPix = document.querySelector('[data-pix]')
const qrcode = document.querySelector('[data-pix-qrcode]')
const campoCodigo = document.querySelector('[data-pix-codigo]')
const botaoCopiar = document.querySelector('[data-pix-copiar]')
const textoBotao = botaoCopiar?.querySelector('[data-texto]')
const avisoIndisponivel = document.querySelector('[data-pix-indisponivel]')
const mensagem = document.querySelector('[data-mensagem]')

// texto original do botão, para restaurar depois da confirmação
const TEXTO_BOTAO = textoBotao?.textContent ?? ''

// guarda o timer da confirmação, para não sobrepor cliques seguidos
let timerConfirmacao = null

function mostraMensagem(texto, tipo) {
    /* Exibe a mensagem de erro/sucesso abaixo do botão */
    mensagem.className = `w-full rounded-xl border px-4 py-3 text-sm ${ESTILOS_MENSAGEM[tipo]}`
    mensagem.textContent = texto
}

function escondeMensagem() {
    /* Esconde a caixa de mensagem */
    mensagem.className = 'hidden'
    mensagem.textContent = ''
}

async function copiaCodigo() {
    /* Copia o "copia e cola"; se o navegador não deixar, seleciona o texto para o usuário copiar */
    try {
        // a API de área de transferência só existe em HTTPS (ou localhost)
        if (!navigator.clipboard) throw new Error('Área de transferência indisponível')
        await navigator.clipboard.writeText(PIX_COPIA_E_COLA)

        escondeMensagem()
        textoBotao.textContent = 'Código copiado!'
        clearTimeout(timerConfirmacao)
        timerConfirmacao = setTimeout(() => { textoBotao.textContent = TEXTO_BOTAO }, TEMPO_CONFIRMACAO_MS)
        mostraMensagem('Código Pix copiado. Agora é só colar no app do seu banco. Obrigado pelo apoio!', 'sucesso')
    } catch {
        // seleciona o código no campo, para copiar com Ctrl+C ou segurando o dedo no celular
        campoCodigo.focus()
        campoCodigo.select()
        mostraMensagem('Não foi possível copiar automaticamente. O código está selecionado: copie-o manualmente.', 'erro')
    }
}

if (areaPix && campoCodigo && botaoCopiar) {
    if (PIX_COPIA_E_COLA) {
        // Pix configurado: carrega o QR Code e mostra o código
        qrcode.src = CAMINHO_QRCODE
        campoCodigo.value = PIX_COPIA_E_COLA
        botaoCopiar.addEventListener('click', copiaCodigo)
    } else {
        // Pix ainda não configurado: troca a área do Pix pelo aviso
        areaPix.classList.add('hidden')
        avisoIndisponivel.classList.remove('hidden')
    }
}
