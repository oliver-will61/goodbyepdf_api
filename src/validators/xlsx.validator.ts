import { ArquivoRecebido } from '../types/arquivos'
import { FileValidationError } from '../errors/AppError'
import { FORMATOS } from '../constants/formatos'
import { obtemExtensao, possuiAssinatura } from '../utils/arquivo'

/*
    Validação de arquivos Excel (.xlsx) recebidos.
    Fica fora dos services para poder ser reaproveitada por qualquer feature
    que receba esse formato. Confere a extensão e depois o conteúdo, e lança
    FileValidationError (400) no primeiro problema encontrado.
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
