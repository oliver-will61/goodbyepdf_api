import { ArquivoRecebido } from '../types/arquivos'
import { FileValidationError } from '../errors/AppError'
import { FORMATOS } from '../constants/formatos'
import { obtemExtensao, possuiAssinatura } from '../utils/arquivo'

/*
    Validação de arquivos PDF recebidos.
    Fica fora dos services para poder ser reaproveitada por qualquer feature
    que receba esse formato. Confere a extensão e depois o conteúdo, e lança
    FileValidationError (400) no primeiro problema encontrado.
*/

// garante que o arquivo é um .pdf que começa com o cabeçalho "%PDF-"
export function validaArquivoPdf(arquivo: ArquivoRecebido): void {
    if (obtemExtensao(arquivo.nome) !== FORMATOS.PDF.extensao) {
        throw new FileValidationError('INVALID_EXTENSION', FORMATOS.PDF.extensao)
    }

    if (!possuiAssinatura(arquivo.conteudo, FORMATOS.PDF.assinatura)) {
        throw new FileValidationError('INVALID_PDF')
    }
}
