import { ArquivoRecebido, ArquivoConvertido } from '../types/arquivos'
import { FORMATOS } from '../constants/formatos'
import { EndpointsConversor } from '../constants/endpointsConversor'
import { trocaExtensao } from '../utils/arquivo'
import { conversorService } from './conversor.service'
// validação do PDF (extensão + cabeçalho "%PDF-"), compartilhada com as conversões para Word e PowerPoint
import { validaArquivoPdf } from '../validators/pdf.validator'

/*
    Regras de negócio da conversão PDF → Excel (.xlsx).
    Cada tabela do PDF vira uma aba da planilha (sem tabelas, cada página vira uma aba com o texto).
*/

// detectar as tabelas de todas as páginas de um PDF grande (até o limite de 10 MB) pode demorar
export const TIMEOUT_PDF_XLSX_MS = 120000

// valida o PDF, envia ao conversor e devolve a planilha gerada
export async function convertePdfParaXlsx(arquivo: ArquivoRecebido): Promise<ArquivoConvertido> {
    validaArquivoPdf(arquivo)

    const conteudo = await conversorService.converte(EndpointsConversor.PDF_XLSX, arquivo, TIMEOUT_PDF_XLSX_MS)

    return {
        nome: trocaExtensao(arquivo.nome, FORMATOS.XLSX.extensao),
        conteudo,
        tipoConteudo: FORMATOS.XLSX.tipoConteudo
    }
}
