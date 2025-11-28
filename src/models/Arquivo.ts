import { Express } from 'express';

export class Arquivo {

    public upload: Express.Multer.File 
    public extensaoPermitida

    constructor (upload: Express.Multer.File) {
        this.upload = upload
        this.extensaoPermitida = {
            JSON: 'json',
            XLSX: 'xlsx'
        }
    }

    async validaArquivo(extensaoPermitidas: string) {

        const extensaoArquivo = this.upload.originalname.split('.').pop()?.toLowerCase();
        console.log(extensaoArquivo);

        if(extensaoArquivo != extensaoPermitidas) {
            throw new Error (`Extensão não permitida. Use um arquivo com a extensão: .${extensaoPermitidas}`)
        }

        return true
    }
 }