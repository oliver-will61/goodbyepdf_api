// Limites aplicados aos uploads.
// Os arquivos ficam em memória (Multer memoryStorage), então o limite de tamanho
// protege a RAM do servidor contra arquivos muito grandes.

// tamanho máximo de um arquivo enviado, em megabytes (usado nas mensagens de erro)
export const TAMANHO_MAXIMO_UPLOAD_MB = 10

// o mesmo limite em bytes, no formato que o Multer espera
export const TAMANHO_MAXIMO_UPLOAD_BYTES = TAMANHO_MAXIMO_UPLOAD_MB * 1024 * 1024
