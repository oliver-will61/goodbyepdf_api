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

    // retorna true se o serviço Python responder no /health
    async verificaSaude(): Promise<boolean> {
        try {
            await axios.get(`${this.baseURL}/health`, { timeout: 3000 })
            return true
        } catch {
            return false
        }
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

            console.log("Resposta do Python: ", resposta.data)

            //return res.send(resposta.data)
            return res.send(resposta.data)

        } catch (error: any) {
            console.error('❌ Erro detalhado:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });

            const status = error.response?.status

            // a resposta vem em arraybuffer, então o corpo de erro precisa ser decodificado
            let detalhe = error.message
            if (error.response?.data) {
                const texto = Buffer.from(error.response.data).toString('utf8')
                try {
                    detalhe = JSON.parse(texto).detail ?? texto
                } catch {
                    detalhe = texto
                }
            }

            // erro no arquivo enviado (ex.: 422): repassa o status do Python para o cliente
            if (status >= 400 && status < 500) {
                return res.status(status).json({
                    success: false,
                    mensagem: detalhe
                });
            }

            return res.status(500).json({
                mensagem: "Erro ao processar arquivo no Python",
                erro: detalhe
            });
        }
    }
}