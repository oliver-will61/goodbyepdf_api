/**
 * Montagem do "Pix copia e cola" estático (BR Code), no padrão EMV do Banco Central.
 *
 * O código é uma sequência de campos TLV: ID (2 dígitos) + tamanho (2 dígitos) + valor.
 * Por ser estático e sem valor, quem doa digita o valor no app do banco.
 * O último campo (63) é um CRC16 calculado sobre todo o resto do código.
 */

/** Dados de quem recebe o Pix */
export interface DadosPix {
    /** chave Pix (de preferência a aleatória, porque o código fica público) */
    chave: string
    /** nome de quem recebe (até 25 caracteres) */
    nome: string
    /** cidade de quem recebe (até 15 caracteres) */
    cidade: string
    /** mensagem opcional mostrada no app do banco */
    descricao?: string
}

// limites de tamanho definidos pelo manual do BR Code
const TAMANHO_MAXIMO_NOME = 25
const TAMANHO_MAXIMO_CIDADE = 15
const TAMANHO_MAXIMO_CAMPO = 99

// identificador do arranjo Pix dentro do campo 26 (informações da conta)
const GUI_PIX = 'br.gov.bcb.pix'

/**
 * Remove acentos e qualquer caractere fora do ASCII imprimível,
 * já que nem todo app de banco lê caracteres especiais no BR Code.
 */
export function normalizaTexto(texto: string): string {
    return texto
        .normalize('NFD')
        // remove os acentos que o NFD separou da letra
        .replace(/[̀-ͯ]/g, '')
        // mantém só ASCII imprimível
        .replace(/[^\x20-\x7E]/g, '')
        .trim()
}

/** Monta um campo TLV: ID + tamanho com 2 dígitos + valor */
export function campo(id: string, valor: string): string {
    if (valor.length > TAMANHO_MAXIMO_CAMPO) {
        throw new Error(`O campo ${id} do Pix passou de ${TAMANHO_MAXIMO_CAMPO} caracteres`)
    }
    return id + valor.length.toString().padStart(2, '0') + valor
}

/**
 * CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF), exigido no campo 63.
 * Devolve 4 dígitos hexadecimais em maiúsculas.
 */
export function crc16(texto: string): string {
    let crc = 0xFFFF
    for (let i = 0; i < texto.length; i++) {
        // junta o próximo byte nos 8 bits mais altos
        crc ^= texto.charCodeAt(i) << 8
        for (let bit = 0; bit < 8; bit++) {
            // desloca um bit; se o bit que saiu era 1, aplica o polinômio
            crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1)
            // mantém só 16 bits
            crc &= 0xFFFF
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0')
}

/** Monta o "Pix copia e cola" estático (sem valor fixo) */
export function montaPixCopiaECola(dados: DadosPix): string {
    const chave = dados.chave.trim()
    const nome = normalizaTexto(dados.nome).toUpperCase().slice(0, TAMANHO_MAXIMO_NOME)
    const cidade = normalizaTexto(dados.cidade).toUpperCase().slice(0, TAMANHO_MAXIMO_CIDADE)
    const descricao = normalizaTexto(dados.descricao ?? '')

    if (!chave) throw new Error('A chave Pix é obrigatória')
    if (!nome) throw new Error('O nome de quem recebe o Pix é obrigatório')
    if (!cidade) throw new Error('A cidade de quem recebe o Pix é obrigatória')

    // campo 26: identificador do Pix + chave (+ descrição, se houver)
    const contaPix = campo('00', GUI_PIX)
        + campo('01', chave)
        + (descricao ? campo('02', descricao) : '')

    const semCrc = campo('00', '01')          // versão do payload
        + campo('26', contaPix)                // dados da conta Pix
        + campo('52', '0000')                  // categoria do recebedor (não informada)
        + campo('53', '986')                   // moeda: real (ISO 4217)
        + campo('58', 'BR')                    // país
        + campo('59', nome)                    // nome de quem recebe
        + campo('60', cidade)                  // cidade de quem recebe
        + campo('62', campo('05', '***'))      // txid "***": Pix estático, sem identificador
        + '6304'                               // início do campo do CRC (ID 63, tamanho 04)

    // o CRC é calculado sobre tudo, inclusive o "6304"
    return semCrc + crc16(semCrc)
}
