import { ArquivoRecebido, ArquivoConvertido } from '../types/arquivos'
import { FORMATOS } from '../constants/formatos'
import { EndpointsConversor } from '../constants/endpointsConversor'
import { trocaExtensao } from '../utils/arquivo'
import { conversorService } from './conversor.service'
// validação do PDF (extensão + cabeçalho "%PDF-"), compartilhada com a conversão para Word
import { validaArquivoPdf } from '../validators/pdf.validator'

/*
    Regras de negócio da conversão PDF → PowerPoint (.pptx).
    Cada página do PDF vira um slide (a página é renderizada como imagem no Python).
*/

// renderizar todas as páginas de um PDF grande (até o limite de 10 MB) pode demorar
export const TIMEOUT_PDF_PPTX_MS = 120000

// valida o PDF, envia ao conversor e devolve a apresentação gerada
export async function convertePdfParaPptx(arquivo: ArquivoRecebido): Promise<ArquivoConvertido> {
    validaArquivoPdf(arquivo)

    const conteudo = await conversorService.converte(EndpointsConversor.PDF_PPTX, arquivo, TIMEOUT_PDF_PPTX_MS)

    return {
        nome: trocaExtensao(arquivo.nome, FORMATOS.PPTX.extensao),
        conteudo,
        tipoConteudo: FORMATOS.PPTX.tipoConteudo
    }
}
