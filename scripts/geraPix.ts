/**
 * Gera o QR Code e o "copia e cola" do Pix usados na página de doação.
 *
 * Uso: preencha PIX_CHAVE, PIX_NOME e PIX_CIDADE no .env e rode `npm run gera:pix`.
 * Os arquivos gerados vão para o repositório (o servidor não gera nada em tempo de execução):
 *   - frontend/public/assets/img/pix-qrcode.svg
 *   - frontend/public/assets/js/config/pix.js
 */
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import QRCode from 'qrcode'
import { montaPixCopiaECola } from './pix'

// pasta pública do frontend, a partir da raiz do projeto
const PASTA_PUBLICA = join(__dirname, '..', 'frontend', 'public', 'assets')

async function main(): Promise<void> {
    const { PIX_CHAVE, PIX_NOME, PIX_CIDADE, PIX_DESCRICAO } = process.env

    if (!PIX_CHAVE || !PIX_NOME || !PIX_CIDADE) {
        throw new Error('Defina PIX_CHAVE, PIX_NOME e PIX_CIDADE no .env (veja o .env.example)')
    }

    const copiaECola = montaPixCopiaECola({
        chave: PIX_CHAVE,
        nome: PIX_NOME,
        cidade: PIX_CIDADE,
        // só passa a descrição se ela existir (exactOptionalPropertyTypes)
        ...(PIX_DESCRICAO ? { descricao: PIX_DESCRICAO } : {}),
    })

    // QR Code em SVG, escuro sobre branco (o branco mantém o QR legível no modo escuro)
    const svg = await QRCode.toString(copiaECola, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 2,
        color: { dark: '#18181b', light: '#ffffff' },
    })
    writeFileSync(join(PASTA_PUBLICA, 'img', 'pix-qrcode.svg'), svg)

    // módulo lido por assets/js/pages/doacao.js
    const modulo = '// gerado por `npm run gera:pix` (scripts/geraPix.ts): não edite à mão\n'
        + `export const PIX_COPIA_E_COLA = ${JSON.stringify(copiaECola)}\n`
    writeFileSync(join(PASTA_PUBLICA, 'js', 'config', 'pix.js'), modulo)

    console.log('Pix gerado:')
    console.log(copiaECola)
}

main().catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro)
    process.exit(1)
})
