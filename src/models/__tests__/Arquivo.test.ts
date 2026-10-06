import { Arquivo } from '../Arquivo'
import { FileValidationError } from '../AppError'
import { ErrorMessagens } from '../../constants/errorMessages'

// assinatura dos 6 primeiros bytes de um .xlsx (ZIP/OOXML)
const ASSINATURA_XLSX = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])

// cria um arquivo no formato que o Multer entrega (memoryStorage)
const criaArquivoMulter = (originalname: string, buffer: Buffer): Express.Multer.File => ({
    fieldname: 'arquivo',
    originalname,
    encoding: '7bit',
    mimetype: 'application/octet-stream',
    size: buffer.length,
    destination: '',
    filename: originalname,
    path: '',
    buffer,
    stream: null as any
})

// conteúdos de exemplo
const bufferJsonValido = () => Buffer.from(JSON.stringify([{ nome: 'Ana', idade: 30 }]), 'utf8')
const bufferExcelValido = () => Buffer.concat([ASSINATURA_XLSX, Buffer.from('resto do arquivo')])

// executa a validação e devolve o erro lançado (ou falha o teste se nada for lançado)
const capturaErro = (validacao: () => void): FileValidationError => {
    try {
        validacao()
    } catch (erro) {
        return erro as FileValidationError
    }
    throw new Error('Era esperado que a validação lançasse um erro')
}

describe('Arquivo', () => {

    // a classe usa console.log para depuração; silencia para não poluir a saída dos testes
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
        jest.restoreAllMocks()
    })

    describe('constructor', () => {
        it('captura os 6 primeiros bytes do arquivo como assinatura', () => {
            const arquivo = new Arquivo(criaArquivoMulter('planilha.xlsx', bufferExcelValido()), Arquivo.TIPOS.excel)

            expect(arquivo.capturaAssinatura()).toEqual(ASSINATURA_XLSX)
        })
    })

    describe('validaExtensão', () => {
        it('aceita a extensão esperada', () => {
            const arquivo = new Arquivo(criaArquivoMulter('dados.json', bufferJsonValido()), Arquivo.TIPOS.json)

            expect(() => arquivo.validaExtensão()).not.toThrow()
        })

        it('ignora maiúsculas e minúsculas na extensão', () => {
            const arquivo = new Arquivo(criaArquivoMulter('DADOS.JSON', bufferJsonValido()), Arquivo.TIPOS.json)

            expect(() => arquivo.validaExtensão()).not.toThrow()
        })

        it('lança INVALID_EXTENSION com a extensão esperada na mensagem', () => {
            const arquivo = new Arquivo(criaArquivoMulter('documento.pdf', Buffer.from('pdf')), Arquivo.TIPOS.excel)

            const erro = capturaErro(() => arquivo.validaExtensão())

            expect(erro).toBeInstanceOf(FileValidationError)
            expect(erro.code).toBe('INVALID_EXTENSION')
            expect(erro.message).toBe(ErrorMessagens.FILE.INVALID_EXTENSION('xlsx'))
        })

        it('lança INVALID_EXTENSION para arquivo sem extensão', () => {
            const arquivo = new Arquivo(criaArquivoMulter('arquivosemextensao', Buffer.from('x')), Arquivo.TIPOS.json)

            const erro = capturaErro(() => arquivo.validaExtensão())

            expect(erro.code).toBe('INVALID_EXTENSION')
        })
    })

    describe('validaJson', () => {
        it('aceita um JSON válido', () => {
            const arquivo = new Arquivo(criaArquivoMulter('dados.json', bufferJsonValido()), Arquivo.TIPOS.json)

            expect(() => arquivo.validaJson()).not.toThrow()
        })

        it('lança INVALID_JSON para JSON malformado', () => {
            const arquivo = new Arquivo(criaArquivoMulter('dados.json', Buffer.from('{ nome: "Ana"')), Arquivo.TIPOS.json)

            const erro = capturaErro(() => arquivo.validaJson())

            expect(erro).toBeInstanceOf(FileValidationError)
            expect(erro.code).toBe('INVALID_JSON')
            expect(erro.message).toBe(ErrorMessagens.FILE.INVALID_JSON)
        })

        it('lança INVALID_JSON quando a extensão está errada (comportamento documentado no README)', () => {
            // validaJson envolve a checagem de extensão no mesmo try/catch
            const arquivo = new Arquivo(criaArquivoMulter('dados.txt', bufferJsonValido()), Arquivo.TIPOS.json)

            const erro = capturaErro(() => arquivo.validaJson())

            expect(erro.code).toBe('INVALID_JSON')
        })
    })

    describe('validaExcel', () => {
        it('aceita um arquivo com a assinatura de .xlsx', () => {
            const arquivo = new Arquivo(criaArquivoMulter('planilha.xlsx', bufferExcelValido()), Arquivo.TIPOS.excel)

            expect(() => arquivo.validaExcel()).not.toThrow()
        })

        it('lança INVALID_EXCEL quando a assinatura não bate', () => {
            const arquivo = new Arquivo(criaArquivoMulter('planilha.xlsx', Buffer.from('não é excel')), Arquivo.TIPOS.excel)

            const erro = capturaErro(() => arquivo.validaExcel())

            expect(erro).toBeInstanceOf(FileValidationError)
            expect(erro.code).toBe('INVALID_EXCEL')
        })

        // arquivos menores que a assinatura não podem ser .xlsx válidos
        it.each([
            ['vazio', Buffer.alloc(0)],
            ['só o início da assinatura', ASSINATURA_XLSX.subarray(0, 4)],
        ])('lança INVALID_EXCEL para arquivo %s', (_descricao, buffer) => {
            const arquivo = new Arquivo(criaArquivoMulter('planilha.xlsx', buffer), Arquivo.TIPOS.excel)

            const erro = capturaErro(() => arquivo.validaExcel())

            expect(erro.code).toBe('INVALID_EXCEL')
        })

        it('lança INVALID_EXTENSION antes de olhar o conteúdo', () => {
            const arquivo = new Arquivo(criaArquivoMulter('planilha.xls', bufferExcelValido()), Arquivo.TIPOS.excel)

            const erro = capturaErro(() => arquivo.validaExcel())

            expect(erro.code).toBe('INVALID_EXTENSION')
            expect(erro.message).toContain('.xlsx')
        })
    })
})
