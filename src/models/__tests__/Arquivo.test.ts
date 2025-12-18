import { Arquivo } from '../Arquivo';
import {FileValidationError} from '../AppError'

// Mock para o arquivo do Multer
const criarMockArquivo = (originalname: string, bufferContent?: Buffer, mimetype?: string): Express.Multer.File => ({
    fieldname: 'arquivo',
    originalname: originalname,
    encoding: '7bit',
    mimetype: mimetype || 'application/octet-stream',
    size: 1024,
    destination: '',
    filename: originalname,
    path: '',
    buffer: bufferContent || Buffer.from(''),
    stream: null as any
});

const criarBufferValido = (): Buffer => {
    const assinaturaExecel = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);
    const conteudoRestante = Buffer.from('Conteudo do execel');
    return Buffer.concat([assinaturaExecel, conteudoRestante])
}

const criarBufferJsonValido = (): Buffer => {
    const jsonValido = JSON.stringify({nome: "Teste", valor: 123});
    return Buffer.from(jsonValido, 'utf8')
}

describe('Arquivo', () => {
    describe('validaArquivo - extensão', () => {
        it('deve retornar true para arquivo JSON com extensão correta', async () => {
            const mockFile = criarMockArquivo('dados.json', criarBufferJsonValido(), 'application/json');
            const arquivo = new Arquivo(mockFile);
            
            const resultado = await arquivo.validaArquivo(Arquivo.TIPOS['json']);
            
            expect(resultado).toBe(true);
        });

        it('deve retornar true para arquivo XLSX com extensão correta', async () => {
            const mockFile = criarMockArquivo('planilha.xlsx', criarBufferValido(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            const arquivo = new Arquivo(mockFile);
            
            const resultado = await arquivo.validaArquivo(Arquivo.TIPOS['excel']);
            
            expect(resultado).toBe(true);
        });

        it('deve lançar erro para arquivo com extensão incorreta', async () => {
            const mockFile = criarMockArquivo('documento.pdf', Buffer.from(''), 'application/pdf');
            const arquivo = new Arquivo(mockFile);
            
            await expect(arquivo.validaArquivo(Arquivo.TIPOS['json']))
                .rejects
                .toThrow(FileValidationError);
        });

        it('deve lançar erro para arquivo sem extensão', async () => {
            const mockFile = criarMockArquivo('arquivosemextensao', Buffer.from(''),'text/plain');
            const arquivo = new Arquivo(mockFile);
            
            await expect(arquivo.validaArquivo(Arquivo.TIPOS['json']))
                .rejects
                .toThrow(FileValidationError);
        });

        it('deve funcionar com extensão em maiúsculo no arquivo', async () => {
            const mockFile = criarMockArquivo('dados.JSON', criarBufferJsonValido(), 'application/json');
            const arquivo = new Arquivo(mockFile);
            
            const resultado = await arquivo.validaArquivo(Arquivo.TIPOS['json']);
            
            expect(resultado).toBe(true);
        });

        it('deve lançar erro quando a extensão do arquivo não corresponde à permitida', async () => {
            const mockFile = criarMockArquivo('dados.json', criarBufferValido(), 'application/json');
            const arquivo = new Arquivo(mockFile);
            
            await expect(arquivo.validaArquivo(Arquivo.TIPOS['excel']))
                .rejects
                .toThrow(FileValidationError);
        });
    });

    describe('validaArquivo - Conteúdo', () => {

        //testes positivos
        it('deve aceitar JSON válido', async () => {
        
            const mockFile = criarMockArquivo('dados.json', criarBufferJsonValido(), 'application/json');
            const arquivo = new Arquivo(mockFile);
            
            const resultado = await arquivo.validaArquivo(Arquivo.TIPOS['json']);
            expect(resultado).toBe(true);
        });


        it('deve aceitar Excel com assinatura válida', async () => {
            const mockFile = criarMockArquivo('planilha.xlsx', criarBufferValido(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            const arquivo = new Arquivo(mockFile);
            
            const resultado = await arquivo.validaArquivo(Arquivo.TIPOS['excel']);
            expect(resultado).toBe(true);
        });

        // testes negativos

         it('deve lançar erro para JSON inválido', async () => {
            const jsonInvalido = Buffer.from('{ nome: "Teste"', 'utf8');
            const mockFile = criarMockArquivo('dados.json', jsonInvalido, 'application/json');
            const arquivo = new Arquivo(mockFile);
            
            await expect(arquivo.validaArquivo(Arquivo.TIPOS['json']))
                .rejects
                .toThrow(FileValidationError);
        });

        it('deve lançar erro para Excel com assinatura inválida', async () => {
            const bufferInvalido = Buffer.from('não é excel');
            const mockFile = criarMockArquivo('planilha.xlsx', bufferInvalido);
            const arquivo = new Arquivo(mockFile);
            
            await expect(arquivo.validaArquivo(Arquivo.TIPOS['excel']))
                .rejects
                .toThrow(FileValidationError);
        });

        it('deve lançar erro para tipo desconhecido', async () => {
            const mockFile = criarMockArquivo('arquivo.txt', Buffer.from('texto'));
            const arquivo = new Arquivo(mockFile);
            
            const tipoDesconhecido = { extensao: 'txt' };
            await expect(arquivo.validaArquivo(tipoDesconhecido))
                .rejects
                .toThrow(FileValidationError);
        });

    })
});