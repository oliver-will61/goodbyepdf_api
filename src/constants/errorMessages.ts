export const ErrorMessagens = {
    FILE: {
        NO_FILE: "Nenhum arquivo enviado",
        INVALID_EXTENSION: (extensaoEsperada?: string) => 
            `Extensão não permitida. Use um arquivo com a extensão: .${extensaoEsperada}`,
        INVALID_JSON: "Arquivo JSON inválido. Verifique a formatação do arquivo.",
        INVALID_EXCEL: "Arquivo Excel não compatível ou está corrompido",
        INVALID_OR_CORRUPTED:  'Arquivo inválido ou corrompido' 
    },
    OTHER: "Erro desconhecido"
}

export const ErrorCodes = {
    NO_FILE: "NO_FILE",
    INVALID_EXTENSION:"INVALID_EXTENSION",
    INVALID_JSON: "INVALID_JSON",
    INVALID_EXCEL:"INVALID_EXCEL",
    INVALID_OR_CORRUPTED: "INVALID_OR_CORRUPTED"
}

//tipo para autocomplete
export type ErroCode = keyof typeof ErrorCodes;