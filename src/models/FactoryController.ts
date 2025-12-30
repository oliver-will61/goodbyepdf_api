import {tiposInterface} from './Arquivo'
import {FileValidationError, ValidationError} from './AppError'
import { Request, Response } from 'express'; // ← Importe do Express
import { CallAPIPython } from '../services/CallAPIPython';
import { Arquivo } from './Arquivo';
import { ErrorMessagens, ErrorCodes } from '../constants/errorMessages';


/* Fabrica Controllers */
export class FactoryController {

    /* metodo que cria as controller*/
    static createController (arquivoEsperado: tiposInterface, endPointAPI: string){

        /*Controller abstrata das rotas*/
        return new (class Controller {
            public callAPIPython: CallAPIPython;

            constructor(){
                this.callAPIPython = new CallAPIPython(endPointAPI)
            }

            /* Realiza a validação do upload e o envio para a API que é responsável pela conversão
            */
            async handleUpload(req: Request, res: Response) {
                try {    

                    if (!req.file) {
                        throw new FileValidationError('NO_FILE')
                        
                    }
                    
                    //Cria o objeto arquivo
                    const arquivo = new Arquivo(req.file)
                    
                    // valida o se o arquivo está correto
                    await arquivo.validaArquivo(arquivoEsperado)        
                    
                    //envia o arquivo validado e funcional(req) req para a API do Python
                    await this.callAPIPython.enviaParaAPI(req, res)
                    
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
        })
    } 
}
    
    