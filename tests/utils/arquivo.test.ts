import { obtemExtensao, trocaExtensao, possuiAssinatura, ehJsonValido } from '../../src/utils/arquivo'

describe('utils/arquivo', () => {

    describe('obtemExtensao', () => {
        it.each([
            ['dados.json', 'json'],
            ['PLANILHA.XLSX', 'xlsx'],          // sempre em minúsculas
            ['relatorio.final.xlsx', 'xlsx'],   // considera só o último ponto
            ['semextensao', ''],
            ['.env', ''],                       // arquivo oculto não tem extensão
            ['terminaComPonto.', ''],
        ])('"%s" → "%s"', (nome, esperado) => {
            expect(obtemExtensao(nome)).toBe(esperado)
        })
    })

    describe('trocaExtensao', () => {
        it.each([
            ['dados.json', 'xlsx', 'dados.xlsx'],
            ['relatorio.final.xlsx', 'json', 'relatorio.final.json'],
            ['semextensao', 'json', 'semextensao.json'],
        ])('"%s" + "%s" → "%s"', (nome, extensao, esperado) => {
            expect(trocaExtensao(nome, extensao)).toBe(esperado)
        })
    })

    describe('possuiAssinatura', () => {
        const assinatura = Buffer.from([0x50, 0x4b, 0x03])

        it('retorna true quando o conteúdo começa com a assinatura', () => {
            expect(possuiAssinatura(Buffer.from([0x50, 0x4b, 0x03, 0xff]), assinatura)).toBe(true)
        })

        it('retorna false quando os bytes iniciais são diferentes', () => {
            expect(possuiAssinatura(Buffer.from('abcdef'), assinatura)).toBe(false)
        })

        it.each([
            ['vazio', Buffer.alloc(0)],
            ['menor que a assinatura', Buffer.from([0x50, 0x4b])],
        ])('retorna false para conteúdo %s', (_descricao, conteudo) => {
            expect(possuiAssinatura(conteudo, assinatura)).toBe(false)
        })
    })

    describe('ehJsonValido', () => {
        it.each([
            ['lista de objetos', '[{"a":1}]'],
            ['objeto', '{"a":1}'],
            ['texto com acentos', '[{"nome":"João"}]'],
        ])('aceita %s', (_descricao, texto) => {
            expect(ehJsonValido(Buffer.from(texto, 'utf8'))).toBe(true)
        })

        it.each([
            ['JSON malformado', '{ nome: "Ana"'],
            ['conteúdo vazio', ''],
        ])('recusa %s', (_descricao, texto) => {
            expect(ehJsonValido(Buffer.from(texto, 'utf8'))).toBe(false)
        })
    })
})
