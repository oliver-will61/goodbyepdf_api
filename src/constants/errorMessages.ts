// Mensagens e códigos de erro centralizados.
// Toda resposta de erro da API segue o formato { success: false, mensagem, code }.

export const ErrorCodes = {
    // erros de validação do arquivo enviado
    NO_FILE: 'NO_FILE',
    INVALID_EXTENSION: 'INVALID_EXTENSION',
    INVALID_JSON: 'INVALID_JSON',
    INVALID_EXCEL: 'INVALID_EXCEL',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    // erros vindos do serviço de conversão
    CONVERSION_FAILED: 'CONVERSION_FAILED',
    CONVERTER_UNAVAILABLE: 'CONVERTER_UNAVAILABLE',
    // erro inesperado no servidor
    INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const

// tipo com todos os códigos, para autocomplete e checagem em tempo de compilação
export type ErrorCode = keyof typeof ErrorCodes

export const ErrorMessagens = {
    FILE: {
        NO_FILE: 'Nenhum arquivo enviado',
        INVALID_EXTENSION: (extensaoEsperada: string) =>
            `Extensão não permitida. Use um arquivo com a extensão: .${extensaoEsperada}`,
        INVALID_JSON: 'Arquivo JSON inválido. Verifique a formatação do arquivo.',
        INVALID_EXCEL: 'Arquivo Excel não compatível ou está corrompido',
        FILE_TOO_LARGE: (tamanhoMaximoMB: number) =>
            `Arquivo muito grande. O tamanho máximo é ${tamanhoMaximoMB} MB.`
    },
    CONVERTER_UNAVAILABLE: 'Serviço de conversão indisponível. Tente novamente em instantes.',
    OTHER: 'Erro desconhecido'
}
