
import { Request, Response } from 'express'; // ← Importe do Express
import { CallAPIPython } from '../services/CallAPIPython';
import { Arquivo } from '../models/Arquivo';
import {FileValidationError, ValidationError} from '../models/AppError'
import { ErrorMessagens, ErrorCodes } from '../constants/errorMessages';


export const jsonForXlsxController = async (req: Request, res: Response) => {
    try {    

        if (!req.file) {
            throw new FileValidationError('NO_FILE')
            
        }

        const arquivo = new Arquivo(req.file)

        // retorna True ou False
        const validaArquivo = await arquivo.validaArquivo(Arquivo.TIPOS['json'])        

        console.log("Enviando arquivo para a API do Python...");
        
        const conversaoService = new CallAPIPython("/api/json-xlsx")

        // envia o arquivo para a API de conversão
        conversaoService.enviaParaAPI(req, res)        
    }

    catch (error) {

        // erro na validação de arquivo
        if (error instanceof FileValidationError) {
            return res.status(400).json({
                success: false,
                mensagem: error.message,
                code: error.code
            })
        }

        //Erro especifico, usado quanto o arquivo não exites validação de arquvio
        if(error instanceof ValidationError) {
            return res.status(404).json({
                success: false,
                mensagem: error.message,
                code: error.code
            })
        }
        
        // erro generico
        if(error instanceof Error){
            return res.status(500).json({
                mensagem: error.message,
            })        
        }

        //erro desconhecido
        return res.status(500).json({
            mensagem: ErrorMessagens.OTHER
        })
        

    }
}
    