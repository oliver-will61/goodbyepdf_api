import { ArquivoRecebido } from '../types/arquivos'
import { FORMATOS } from '../constants/formatos'

/*
    Dados de exemplo compartilhados pelos testes.
    (Pasta fora de __tests__ para não ser tratada como arquivo de teste pelo Jest.)
*/

// conteúdo de um .xlsx válido o suficiente para passar na checagem de assinatura
export const conteudoXlsx = () => Buffer.concat([FORMATOS.XLSX.assinatura, Buffer.from('resto da planilha')])

// conteúdo JSON válido (lista de objetos, como o conversor espera)
export const conteudoJson = () => Buffer.from(JSON.stringify([{ nome: 'Ana', idade: 30 }]), 'utf8')

// monta um ArquivoRecebido, como o controller entrega aos services
export const criaArquivoRecebido = (nome: string, conteudo: Buffer, tipoConteudo = 'application/octet-stream'): ArquivoRecebido => ({
    nome,
    conteudo,
    tipoConteudo
})
