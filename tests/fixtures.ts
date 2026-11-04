import { ArquivoRecebido } from '../src/types/arquivos'
import { FORMATOS } from '../src/constants/formatos'

/*
    Dados de exemplo compartilhados pelos testes.
    (Não termina em .test.ts, então o Jest não a trata como arquivo de teste.)
*/

// conteúdo de um .xlsx válido o suficiente para passar na checagem de assinatura
export const conteudoXlsx = () => Buffer.concat([FORMATOS.XLSX.assinatura, Buffer.from('resto da planilha')])

// conteúdo de um PDF válido o suficiente para passar na checagem do cabeçalho "%PDF-"
export const conteudoPdf = () => Buffer.concat([FORMATOS.PDF.assinatura, Buffer.from('1.7\n...resto do pdf')])

// conteúdo JSON válido (lista de objetos, como o conversor espera)
export const conteudoJson = () => Buffer.from(JSON.stringify([{ nome: 'Ana', idade: 30 }]), 'utf8')

// monta um ArquivoRecebido, como o controller entrega aos services
export const criaArquivoRecebido = (nome: string, conteudo: Buffer, tipoConteudo = 'application/octet-stream'): ArquivoRecebido => ({
    nome,
    conteudo,
    tipoConteudo
})
