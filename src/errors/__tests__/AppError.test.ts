import { AppError, FileValidationError, ConversorError } from '../AppError'
import { ErrorMessagens } from '../../constants/errorMessages'

describe('errors/AppError', () => {

    it('AppError guarda mensagem, código e status', () => {
        const erro = new AppError('falhou', 'INTERNAL_ERROR', 500)

        expect(erro).toBeInstanceOf(Error)
        expect(erro.message).toBe('falhou')
        expect(erro.code).toBe('INTERNAL_ERROR')
        expect(erro.status).toBe(500)
    })

    describe('FileValidationError', () => {
        it.each([
            ['NO_FILE', ErrorMessagens.FILE.NO_FILE],
            ['INVALID_JSON', ErrorMessagens.FILE.INVALID_JSON],
            ['INVALID_EXCEL', ErrorMessagens.FILE.INVALID_EXCEL],
            ['INVALID_PDF', ErrorMessagens.FILE.INVALID_PDF],
        ] as const)('%s → 400 com a mensagem centralizada', (codigo, mensagem) => {
            const erro = new FileValidationError(codigo)

            expect(erro).toBeInstanceOf(AppError)
            expect(erro.status).toBe(400)
            expect(erro.code).toBe(codigo)
            expect(erro.message).toBe(mensagem)
        })

        it('INVALID_EXTENSION → 400 com a extensão esperada na mensagem', () => {
            const erro = new FileValidationError('INVALID_EXTENSION', 'xlsx')

            expect(erro.status).toBe(400)
            expect(erro.message).toBe('Extensão não permitida. Use um arquivo com a extensão: .xlsx')
        })

        it('FILE_TOO_LARGE → 413 com o tamanho máximo na mensagem', () => {
            const erro = new FileValidationError('FILE_TOO_LARGE')

            expect(erro.status).toBe(413)
            expect(erro.message).toBe('Arquivo muito grande. O tamanho máximo é 10 MB.')
        })
    })

    describe('ConversorError', () => {
        it('repassa status e mensagem quando o conversor recusa o conteúdo (4xx)', () => {
            const erro = new ConversorError(422, 'JSON não é uma lista')

            expect(erro.status).toBe(422)
            expect(erro.code).toBe('CONVERSION_FAILED')
            expect(erro.message).toBe('JSON não é uma lista')
        })

        it.each([
            ['5xx do conversor', 500],
            ['sem resposta (conexão recusada ou timeout)', undefined],
        ])('vira 500 CONVERTER_UNAVAILABLE com mensagem genérica: %s', (_descricao, status) => {
            const erro = new ConversorError(status, 'detalhe técnico')

            expect(erro.status).toBe(500)
            expect(erro.code).toBe('CONVERTER_UNAVAILABLE')
            expect(erro.message).toBe(ErrorMessagens.CONVERTER_UNAVAILABLE)
            // o detalhe fica disponível para log, mas não vai para a mensagem do cliente
            expect(erro.detalhe).toBe('detalhe técnico')
        })
    })
})
