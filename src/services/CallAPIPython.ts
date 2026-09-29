import { Request, Response } from 'express';
import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv'

dotenv.config()

export class CallAPIPython {
    private baseURL: string
    public endpoint: string

    constructor(endepoint: string) {
        this.baseURL = String(process.env.CONVERSOR_API_URL);
        this.endpoint = endepoint
    }

    async enviaParaAPI(req: Request, res: Response) {

        console.log( `Enviando para a API do Python em ${this.baseURL}${this.endpoint}`);

        try {
            
            if (!req.file || !req.file.buffer) {
                throw new Error('Arquivo não encontrado ou sem buffer');
            }

            const formData = new FormData();

            formData.append('arquivo', 
                req.file.buffer,
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
                    responseType: 'arraybuffer' //guardas as informações do arquivo convertido em  um arraybuffer para facilidar o envio ao frontend
                }
            );

            // Limpa o arquivo temporário
            // fs.unlinkSync(req.file!.path);

            console.log("Resposta do Python: ", resposta.data)

            //return res.send(resposta.data)
            return res.send(resposta.data)

        } catch (error: any) {
            console.error('❌ Erro detalhado:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
        
            // // Limpa arquivo temporário em caso de erro
            // if (req.file && fs.existsSync(req.file.path)) {
            //     fs.unlinkSync(req.file.path);
            // }        

            return res.status(500).json({
                mensagem: "Erro ao processar arquivo no Python",
                erro: error.response?.data || error.message 
            });   
        }
    }
}