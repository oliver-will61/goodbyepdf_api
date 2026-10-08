import { ArquivoRecebido, ArquivoConvertido } from '../types/arquivos'
import { FileValidationError } from '../errors/AppError'
import { FORMATOS } from '../constants/formatos'
import { EndpointsConversor } from '../constants/endpointsConversor'
import { obtemExtensao, possuiAssinatura, trocaExtensao } from '../utils/arquivo'
import { conversorService } from './conversor.service'

/*
    Regras de negócio da conversão Excel (.xlsx) → JSON.
*/

// garante que o arquivo é um .xlsx com a assinatura de uma planilha OOXML
export function validaArquivoXlsx(arquivo: ArquivoRecebido): void {
    if (obtemExtensao(arquivo.nome) !== FORMATOS.XLSX.extensao) {
        throw new FileValidationError('INVALID_EXTENSION', FORMATOS.XLSX.extensao)
    }

    if (!possuiAssinatura(arquivo.conteudo, FORMATOS.XLSX.assinatura)) {
        throw new FileValidationError('INVALID_EXCEL')
    }
}

// valida a planilha, envia ao conversor e devolve o JSON gerado
export async function converteXlsxParaJson(arquivo: ArquivoRecebido): Promise<ArquivoConvertido> {
    validaArquivoXlsx(arquivo)

    const conteudo = await conversorService.converte(EndpointsConversor.XLSX_JSON, arquivo)

    return {
        nome: trocaExtensao(arquivo.nome, FORMATOS.JSON.extensao),
        conteudo,
        tipoConteudo: FORMATOS.JSON.tipoConteudo
    }
}
