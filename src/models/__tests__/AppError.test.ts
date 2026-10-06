import { AppError, ValidationError, FileValidationError } from '../AppError'
import { ErrorMessagens } from '../../constants/errorMessages'

describe('AppError', () => {

    it('guarda mensagem, código e nome', () => {
        const erro = new AppError('falhou', 'CODIGO')

        expect(erro).toBeInstanceOf(Error)
        expect(erro.message).toBe('falhou')
        expect(erro.code).toBe('CODIGO')
        expect(erro.name).toBe('AppError')
    })

    it('ValidationError herda de AppError', () => {
        const erro = new ValidationError('inválido', 'CODIGO')

        expect(erro).toBeInstanceOf(AppError)
        expect(erro.name).toBe('ValidationError')
    })

    describe('FileValidationError', () => {
        it('herda de ValidationError (o Controller depende disso para escolher o status)', () => {
            const erro = new FileValidationError('NO_FILE')

            expect(erro).toBeInstanceOf(ValidationError)
            expect(erro.name).toBe('FileValidationError')
            expect(erro.code).toBe('NO_FILE')
        })

        // códigos com mensagem própria em constants/errorMessages.ts
        it.each([
            ['NO_FILE', ErrorMessagens.FILE.NO_FILE],
            ['INVALID_JSON', ErrorMessagens.FILE.INVALID_JSON],
        ] as const)('usa a mensagem centralizada para %s', (codigo, mensagem) => {
            expect(new FileValidationError(codigo).message).toBe(mensagem)
        })

        it('monta a mensagem de INVALID_EXTENSION com a extensão esperada', () => {
            const erro = new FileValidationError('INVALID_EXTENSION', 'xlsx')

            expect(erro.message).toBe('Extensão não permitida. Use um arquivo com a extensão: .xlsx')
        })

        it('usa a mensagem genérica para INVALID_OR_CORRUPTED', () => {
            expect(new FileValidationError('INVALID_OR_CORRUPTED').message)
                .toBe(ErrorMessagens.FILE.INVALID_OR_CORRUPTED)
        })
    })
})
