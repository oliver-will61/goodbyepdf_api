import { ArquivoRecebido, ArquivoConvertido } from '../types/arquivos'
import { FileValidationError } from '../errors/AppError'
import { FORMATOS } from '../constants/formatos'
import { EndpointsConversor } from '../constants/endpointsConversor'
import { obtemExtensao, possuiAssinatura, trocaExtensao } from '../utils/arquivo'
import { conversorService } from './conversor.service'

/*
    Regras de negócio da conversão PDF → Word (.docx).
*/

// a análise de layout do PDF é bem mais pesada que as outras conversões:
// um PDF grande (até o limite de 10 MB) pode levar mais de 30 s
export const TIMEOUT_PDF_DOCX_MS = 120000

// garante que o arquivo é um .pdf que começa com o cabeçalho "%PDF-"
export function validaArquivoPdf(arquivo: ArquivoRecebido): void {
    if (obtemExtensao(arquivo.nome) !== FORMATOS.PDF.extensao) {
        throw new FileValidationError('INVALID_EXTENSION', FORMATOS.PDF.extensao)
    }

    if (!possuiAssinatura(arquivo.conteudo, FORMATOS.PDF.assinatura)) {
        throw new FileValidationError('INVALID_PDF')
    }
}

// valida o PDF, envia ao conversor e devolve o documento Word gerado
export async function convertePdfParaDocx(arquivo: ArquivoRecebido): Promise<ArquivoConvertido> {
    validaArquivoPdf(arquivo)

    const conteudo = await conversorService.converte(EndpointsConversor.PDF_DOCX, arquivo, TIMEOUT_PDF_DOCX_MS)

    return {
        nome: trocaExtensao(arquivo.nome, FORMATOS.DOCX.extensao),
        conteudo,
        tipoConteudo: FORMATOS.DOCX.tipoConteudo
    }
}
