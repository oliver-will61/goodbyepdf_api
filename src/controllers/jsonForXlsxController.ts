
import { Request, Response } from 'express'; // ← Importe do Express
import { CallAPIPython } from '../services/CallAPIPython';
import { Arquivo } from '../models/Arquivo';


export const jsonForXlsxController = async (req: Request, res: Response) => {
    try {    

        if (!req.file) {
            return res.status(400).json({
                mensagem: "Nenhum arquivo enviado"
            })
        }

        const arquivo = new Arquivo(req.file)

        const validaArquivo = await arquivo.validaArquivo(arquivo.tipoArquivos['json'])        

        console.log("Enviando arquivo para a API do Python...");

        console.log(req.file);
        
        const conversaoService = new CallAPIPython("/api/json-xlsx")

        // envia o arquivo para a API de conversão
        conversaoService.enviaParaAPI(req, res)        
    }

    catch (error) {
        console.error("Erro no arquivo", error)

        return res.status(500).json({
            mensagem:"Erro no servidor",
            error: error 
        })
    }
}
    