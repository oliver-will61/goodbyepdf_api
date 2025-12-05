import { error, log } from 'console';
import { Express } from 'express';
import XLSX from 'xlsx'

interface arquivoEsperadoDicionario {
    extensao: string,
    assinatura?: number[]
}

export class Arquivo {

    public arquivo: Express.Multer.File 
    public tipoArquivos

    constructor (arquivo: Express.Multer.File) {
        this.arquivo = arquivo
        this.tipoArquivos = {
            json: {
                extensao: 'json'
            },
            excel: {
                extensao:'xlsx',
                assinatura: [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00],
            }
        }
    }



    async validaArquivo(arquivoEsperado: arquivoEsperadoDicionario) {

        console.log('Validando o arquivo...')

        const extensaoArquivoEsperado = arquivoEsperado.extensao

        // verifica extensão
        const extensaoArquivo = this.arquivo.originalname.split('.').pop()?.toLowerCase();

        if(extensaoArquivo != extensaoArquivoEsperado) {
            throw new Error (`Extensão não permitida. Use um arquivo com a extensão: .${extensaoArquivoEsperado}`)
        }

        //captura a asinnatura do arquivo
        const assinatura = this.arquivo.buffer.slice(0,6);
        console.log("Assinatura: ", assinatura);
        

        //verifica o conteudo
        if(arquivoEsperado === this.tipoArquivos.json) {

            try {
                const conteudo = this.arquivo.buffer.toString('utf8');
                JSON.parse(conteudo)
                console.log("Arquivo validado com sucesso");
                return true
            } catch  {
                throw new Error ('Arquivo JSON inválido')
            }

        }

        if(arquivoEsperado === this.tipoArquivos.excel) {
             
            console.log(this.arquivo.buffer);

            //compara assinatura do arquivoEsperado com a assinaura padrão do Execel
            
            for (let i =0; i < assinatura.length; i++) {
                if(assinatura[i] != this.tipoArquivos.excel.assinatura[i]){
                    throw new Error ('Arquivo não compativel ou está corrompido')
                }
            }            

            console.log("Arquivo validado com sucesso");
            return true
        }

        throw new Error ('Arquivo corrompido ou inválido')
    }
 }