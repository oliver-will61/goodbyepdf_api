import { ArquivoRecebido, ArquivoConvertido } from '../types/arquivos'
import { FORMATOS } from '../constants/formatos'
import { EndpointsConversor } from '../constants/endpointsConversor'
import { trocaExtensao } from '../utils/arquivo'
import { conversorService } from './conversor.service'
// validação do .xlsx (extensão + assinatura ZIP), compartilhada com a conversão para JSON
import { validaArquivoXlsx } from '../validators/xlsx.validator'

/*
    Regras de negócio da conversão Excel (.xlsx) → PDF.
    Todas as abas da planilha vão para o PDF (a conversão é feita pelo LibreOffice no Python).
*/

// o LibreOffice precisa iniciar a cada conversão e planilhas grandes geram muitas páginas
export const TIMEOUT_XLSX_PDF_MS = 120000

// valida a planilha, envia ao conversor e devolve o PDF gerado
export async function converteXlsxParaPdf(arquivo: ArquivoRecebido): Promise<ArquivoConvertido> {
    validaArquivoXlsx(arquivo)

    const conteudo = await conversorService.converte(EndpointsConversor.XLSX_PDF, arquivo, TIMEOUT_XLSX_PDF_MS)

    return {
        nome: trocaExtensao(arquivo.nome, FORMATOS.PDF.extensao),
        conteudo,
        tipoConteudo: FORMATOS.PDF.tipoConteudo
    }
}
