import { Arquivo } from '../Arquivo';
import { Express } from 'express';

// Mock para o arquivo do Multer
const criarMockArquivo = (originalname: string, mimetype?: string): Express.Multer.File => ({
    fieldname: 'arquivo',
    originalname: originalname,
    encoding: '7bit',
    mimetype: mimetype || 'application/octet-stream',
    size: 1024,
    destination: '',
    filename: originalname,
    path: '',
    buffer: Buffer.from(''),
    stream: null as any
});

describe('Arquivo', () => {
    describe('validaArquivo', () => {
        it('deve retornar true para arquivo JSON com extensão correta', async () => {
            const mockFile = criarMockArquivo('dados.json', 'application/json');
            const arquivo = new Arquivo(mockFile);
            
            const resultado = await arquivo.validaArquivo('json');
            
            expect(resultado).toBe(true);
        });

        it('deve retornar true para arquivo XLSX com extensão correta', async () => {
            const mockFile = criarMockArquivo('planilha.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            const arquivo = new Arquivo(mockFile);
            
            const resultado = await arquivo.validaArquivo('xlsx');
            
            expect(resultado).toBe(true);
        });

        it('deve lançar erro para arquivo com extensão incorreta', async () => {
            const mockFile = criarMockArquivo('documento.pdf', 'application/pdf');
            const arquivo = new Arquivo(mockFile);
            
            await expect(arquivo.validaArquivo('json'))
                .rejects
                .toThrow('Extensão não permitida. Use um arquivo com a extensão: .json');
        });

        it('deve lançar erro para arquivo sem extensão', async () => {
            const mockFile = criarMockArquivo('arquivosemextensao', 'text/plain');
            const arquivo = new Arquivo(mockFile);
            
            await expect(arquivo.validaArquivo('json'))
                .rejects
                .toThrow('Extensão não permitida. Use um arquivo com a extensão: .json');
        });

        it('deve funcionar com extensão em maiúsculo no arquivo', async () => {
            const mockFile = criarMockArquivo('dados.JSON', 'application/json');
            const arquivo = new Arquivo(mockFile);
            
            const resultado = await arquivo.validaArquivo('json');
            
            expect(resultado).toBe(true);
        });

        it('deve lançar erro quando a extensão do arquivo não corresponde à permitida', async () => {
            const mockFile = criarMockArquivo('dados.json', 'application/json');
            const arquivo = new Arquivo(mockFile);
            
            await expect(arquivo.validaArquivo('xlsx'))
                .rejects
                .toThrow('Extensão não permitida. Use um arquivo com a extensão: .xlsx');
        });
    });
});