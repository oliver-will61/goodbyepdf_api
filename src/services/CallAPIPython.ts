import { Request, Response } from 'express';
import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';

export class CallAPIPython {
    private baseURL: string
    public endpoint: string

    constructor(endepoint: string) {
        this.baseURL = String(process.env.CONVERSOR_API_URL);
        this.endpoint = endepoint
    }

    async enviaParaAPI(req: Request, res: Response) {
        try {

            const formData = new FormData();
            formData.append('arquivo', 
                fs.createReadStream(req.file!.path),
                {
                    filename: req.file!.originalname,
                    contentType: req.file!.mimetype
                }
            );

            const resposta = await axios.post(
                `${this.baseURL}${this.endpoint}`,
                formData, 
                {
                    headers: {
                        ...formData.getHeaders()
                    },
                    timeout: 30000,
                    responseType: 'arraybuffer' //guardas as informações do arquivo convertido em blob para facilidar o envio ao frontend
                }
            );

            // Limpa o arquivo temporário
            fs.unlinkSync(req.file!.path);

            console.log("Resposta do Python: ", resposta.data)

            return res.send(resposta.data)

        } catch (error: any) {
            console.error('❌ Erro detalhado:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
        
            // Limpa arquivo temporário em caso de erro
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }        

            return res.status(500).json({
                mensagem: "Erro ao processar arquivo no Python",
                erro: error.response?.data || error.message 
            });   
        }
    }
}