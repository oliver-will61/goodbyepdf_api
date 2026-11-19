import { campo, crc16, montaPixCopiaECola, normalizaTexto } from '../../scripts/pix'

// dados de exemplo (chave aleatória fictícia)
const DADOS = {
    chave: '123e4567-e12b-12d1-a456-426655440000',
    nome: 'Fulano de Tal',
    cidade: 'São Paulo',
}

/** Lê os campos TLV de primeiro nível de um BR Code, para conferir cada um */
function leCampos(codigo: string): Record<string, string> {
    const campos: Record<string, string> = {}
    let i = 0
    while (i < codigo.length) {
        const id = codigo.slice(i, i + 2)
        const tamanho = Number(codigo.slice(i + 2, i + 4))
        campos[id] = codigo.slice(i + 4, i + 4 + tamanho)
        i += 4 + tamanho
    }
    return campos
}

describe('crc16', () => {

    it('confere com o valor de referência do CRC16-CCITT (0xFFFF)', () => {
        // "123456789" é a entrada padrão de checagem do algoritmo
        expect(crc16('123456789')).toBe('29B1')
    })

    it('completa com zeros à esquerda até 4 dígitos', () => {
        expect(crc16('')).toBe('FFFF')
        expect(crc16('a')).toMatch(/^[0-9A-F]{4}$/)
    })
})

describe('campo', () => {

    it('monta ID + tamanho com 2 dígitos + valor', () => {
        expect(campo('58', 'BR')).toBe('5802BR')
        expect(campo('05', '***')).toBe('0503***')
    })

    it('recusa valores com mais de 99 caracteres', () => {
        expect(() => campo('01', 'x'.repeat(100))).toThrow()
    })
})

describe('normalizaTexto', () => {

    it('remove acentos e caracteres fora do ASCII', () => {
        expect(normalizaTexto('  São João — Ação ')).toBe('Sao Joao  Acao')
    })
})

describe('montaPixCopiaECola', () => {

    it('gera o código completo esperado para os dados de exemplo', () => {
        // conferido com outra implementação do CRC (binascii.crc_hqx do Python)
        expect(montaPixCopiaECola(DADOS)).toBe(
            '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000'
            + '5204000053039865802BR5913FULANO DE TAL6009SAO PAULO62070503***63046B87'
        )
    })

    it('monta os campos obrigatórios do Pix estático', () => {
        const campos = leCampos(montaPixCopiaECola(DADOS))

        expect(campos['00']).toBe('01')
        expect(campos['26']).toBe('0014br.gov.bcb.pix0136' + DADOS.chave)
        expect(campos['52']).toBe('0000')
        expect(campos['53']).toBe('986')
        expect(campos['58']).toBe('BR')
        expect(campos['59']).toBe('FULANO DE TAL')
        expect(campos['60']).toBe('SAO PAULO')
        expect(campos['62']).toBe('0503***')
        // sem valor fixo: quem doa escolhe o valor no app
        expect(campos['54']).toBeUndefined()
    })

    it('termina com o CRC calculado sobre todo o resto do código', () => {
        const codigo = montaPixCopiaECola(DADOS)

        expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)))
    })

    it('corta o nome em 25 e a cidade em 15 caracteres', () => {
        const campos = leCampos(montaPixCopiaECola({
            ...DADOS,
            nome: 'Nome Muito Comprido Demais Para o Pix',
            cidade: 'Cidade Com Nome Muito Longo',
        }))

        expect(campos['59']).toBe('NOME MUITO COMPRIDO DEMAI')
        expect(campos['60']).toBe('CIDADE COM NOME')
    })

    it('inclui a descrição no campo 26 quando informada', () => {
        const campos = leCampos(montaPixCopiaECola({ ...DADOS, descricao: 'Doação' }))

        expect(campos['26']).toBe('0014br.gov.bcb.pix0136' + DADOS.chave + '0206Doacao')
    })

    it('recusa chave, nome ou cidade vazios', () => {
        expect(() => montaPixCopiaECola({ ...DADOS, chave: '  ' })).toThrow('chave Pix')
        expect(() => montaPixCopiaECola({ ...DADOS, nome: '' })).toThrow('nome')
        expect(() => montaPixCopiaECola({ ...DADOS, cidade: '' })).toThrow('cidade')
    })
})
