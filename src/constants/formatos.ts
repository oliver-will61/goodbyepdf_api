// Formatos de arquivo suportados pelas conversões.

export const FORMATOS = {
    JSON: {
        extensao: 'json',
        tipoConteudo: 'application/json; charset=utf-8'
    },
    XLSX: {
        extensao: 'xlsx',
        tipoConteudo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        // assinatura dos 6 primeiros bytes de um .xlsx (arquivo ZIP no padrão OOXML)
        assinatura: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])
    }
} as const
