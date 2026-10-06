import {ErrorMessagens, ErrorCodes} from '../constants/errorMessages'
import { FileValidationError } from './AppError'

export interface tiposInterface {
    extensao: string,
    assinaturaPermitida?: Buffer
}

export class Arquivo {

    public arquivo: Express.Multer.File   
    public arquivoEsperado: tiposInterface 
    private assinatura: Buffer
    

    static TIPOS = {
        json: {
            extensao: 'json'
        },
        excel: {
            extensao:'xlsx',
            assinaturaPermitida: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]),
        }
    }
    
    constructor (arquivo: Express.Multer.File, arquivoEsperado: tiposInterface) {
        this.arquivo = arquivo
        this.arquivoEsperado = arquivoEsperado
        // precisa vir depois de this.arquivo: inicializadores de campo rodam antes do constructor
        this.assinatura = this.capturaAssinatura()
    }

    capturaAssinatura(): Buffer {
        console.log('Capturando a assinatura...')
        //captura a asinnatura do arquivo
        const assinatura =  this.arquivo.buffer.slice(0,6);
        console.log("Assinatura: ", assinatura);
        return assinatura
    }

    validaExtensão() {

        
        const extensaoArquivoEsperado = this.arquivoEsperado.extensao

        // verifica extensão
        const extensaoArquivo = this.arquivo.originalname.split('.').pop()?.toLowerCase();

        if(extensaoArquivo != extensaoArquivoEsperado) {
            throw new FileValidationError ("INVALID_EXTENSION", extensaoArquivoEsperado)
        }
    }
    
    validaJson(){
    
        try {

            this.validaExtensão()
            const conteudo = this.arquivo.buffer.toString('utf8');
            JSON.parse(conteudo)
            console.log("Arquivo validado com sucesso");
            return
        } catch  {
            throw new FileValidationError ("INVALID_JSON")
        }
    }

    validaExcel(){

        this.validaExtensão()

        //compara a assinatura do arquivo com a assinatura padrão do Excel.
        //equals exige o mesmo tamanho, então arquivos menores que a assinatura
        //(inclusive vazios) também são recusados
        if (!this.assinatura.equals(Arquivo.TIPOS.excel.assinaturaPermitida)) {
            throw new FileValidationError('INVALID_EXCEL')
        }

        console.log("Arquivo validado com sucesso");
        return
    }
 }