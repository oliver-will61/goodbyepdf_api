import { ArquivoRecebido, ArquivoConvertido } from '../types/arquivos'
import { FileValidationError } from '../errors/AppError'
import { FORMATOS } from '../constants/formatos'
import { EndpointsConversor } from '../constants/endpointsConversor'
import { obtemExtensao, ehJsonValido, trocaExtensao } from '../utils/arquivo'
import { conversorService } from './conversor.service'

/*
    Regras de negócio da conversão JSON → Excel (.xlsx).
*/

// garante que o arquivo é um .json com conteúdo JSON válido
export function validaArquivoJson(arquivo: ArquivoRecebido): void {
    if (obtemExtensao(arquivo.nome) !== FORMATOS.JSON.extensao) {
        throw new FileValidationError('INVALID_EXTENSION', FORMATOS.JSON.extensao)
    }

    if (!ehJsonValido(arquivo.conteudo)) {
        throw new FileValidationError('INVALID_JSON')
    }
}

// valida o arquivo, envia ao conversor e devolve a planilha gerada
export async function converteJsonParaXlsx(arquivo: ArquivoRecebido): Promise<ArquivoConvertido> {
    validaArquivoJson(arquivo)

    const conteudo = await conversorService.converte(EndpointsConversor.JSON_XLSX, arquivo)

    return {
        nome: trocaExtensao(arquivo.nome, FORMATOS.XLSX.extensao),
        conteudo,
        tipoConteudo: FORMATOS.XLSX.tipoConteudo
    }
}
