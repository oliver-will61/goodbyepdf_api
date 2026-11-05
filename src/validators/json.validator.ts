import { ArquivoRecebido } from '../types/arquivos'
import { FileValidationError } from '../errors/AppError'
import { FORMATOS } from '../constants/formatos'
import { obtemExtensao, ehJsonValido } from '../utils/arquivo'

/*
    Validação de arquivos JSON recebidos.
    Fica fora dos services para poder ser reaproveitada por qualquer feature
    que receba esse formato. Confere a extensão e depois o conteúdo, e lança
    FileValidationError (400) no primeiro problema encontrado.
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
