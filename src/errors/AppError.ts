import { ErrorCode, ErrorMessagens } from '../constants/errorMessages'
import { TAMANHO_MAXIMO_UPLOAD_MB } from '../constants/limites'

/*
    Hierarquia de erros da aplicação.
    Cada erro já carrega o status HTTP, então o middleware de erros
    (middlewares/trataErros.ts) só precisa repassá-lo na resposta.
*/

// erro base: mensagem para o cliente, código estável e status HTTP
export class AppError extends Error {
    public readonly code: ErrorCode
    public readonly status: number

    constructor(message: string, code: ErrorCode, status: number) {
        super(message)
        this.name = 'AppError'
        this.code = code
        this.status = status
    }
}

// códigos de erro que se referem ao arquivo enviado pelo cliente
export type CodigoErroArquivo = 'NO_FILE' | 'INVALID_EXTENSION' | 'INVALID_JSON' | 'INVALID_EXCEL' | 'FILE_TOO_LARGE'

// erro no arquivo enviado: 400, ou 413 quando passa do tamanho máximo
export class FileValidationError extends AppError {
    /*
        args:
            code: código do erro de arquivo
            extensaoEsperada: usada na mensagem de INVALID_EXTENSION
    */
    constructor(code: CodigoErroArquivo, extensaoEsperada = '') {
        super(
            FileValidationError.mensagemPara(code, extensaoEsperada),
            code,
            code === 'FILE_TOO_LARGE' ? 413 : 400
        )
        this.name = 'FileValidationError'
    }

    // monta a mensagem centralizada em constants/errorMessages.ts para cada código
    private static mensagemPara(code: CodigoErroArquivo, extensaoEsperada: string): string {
        switch (code) {
            case 'INVALID_EXTENSION':
                return ErrorMessagens.FILE.INVALID_EXTENSION(extensaoEsperada)
            case 'FILE_TOO_LARGE':
                return ErrorMessagens.FILE.FILE_TOO_LARGE(TAMANHO_MAXIMO_UPLOAD_MB)
            default:
                return ErrorMessagens.FILE[code]
        }
    }
}

/*
    Falha no serviço de conversão (Python).
    - status 4xx: o conversor recusou o conteúdo (ex.: 422 do Pandas); o status e a
      mensagem dele são repassados ao cliente (CONVERSION_FAILED).
    - qualquer outro caso (5xx, timeout, conexão recusada): 500 com mensagem genérica
      (CONVERTER_UNAVAILABLE); o detalhe técnico fica só no log do servidor.
*/
export class ConversorError extends AppError {
    public readonly detalhe: string

    constructor(statusConversor: number | undefined, detalhe: string) {
        const recusouConteudo = statusConversor !== undefined && statusConversor >= 400 && statusConversor < 500

        super(
            recusouConteudo ? detalhe : ErrorMessagens.CONVERTER_UNAVAILABLE,
            recusouConteudo ? 'CONVERSION_FAILED' : 'CONVERTER_UNAVAILABLE',
            recusouConteudo ? statusConversor : 500
        )
        this.name = 'ConversorError'
        this.detalhe = detalhe
    }
}
