import express, { Request, Response, NextFunction } from 'express'
//import cors from 'cors'
import multer from 'multer'

import {xlsxForJsonController, jsonForXlsxController} from '../controllers/arquivosController'
import { CallAPIPython } from '../services/CallAPIPython'
import { TAMANHO_MAXIMO_UPLOAD_BYTES, TAMANHO_MAXIMO_UPLOAD_MB } from '../constants/limites'
import { ErrorMessagens, ErrorCodes } from '../constants/errorMessages'

const router = express.Router();

// const app = express();
// app.use(express.json())
// app.use(cors({
//     origin: ['https://willian-ribeiro.com', 'http://localhost:3000'],
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     credentials: true
// }))
 

//configuração do multer para tratar arquivos.
//memoryStorage mantém o arquivo só em memória (req.file.buffer): nada é gravado em disco,
//e o buffer é descartado pelo coletor de lixo ao fim da requisição
const upload = multer({
    storage: multer.memoryStorage(),
    // limite de tamanho: como o arquivo fica em memória, evita estourar a RAM do servidor.
    // O busboy (usado pelo Multer) acusa o limite ao atingir exatamente esse valor,
    // por isso o +1: um arquivo de exatamente TAMANHO_MAXIMO_UPLOAD_BYTES é aceito
    limits: {
        fileSize: TAMANHO_MAXIMO_UPLOAD_BYTES + 1
    }
});

// recebe o arquivo do campo "arquivo" e transforma o erro de tamanho do Multer
// em uma resposta 413 no mesmo formato JSON dos outros erros de validação
const recebeArquivo = (req: Request, res: Response, next: NextFunction) => {
    upload.single('arquivo')(req, res, (erro?: unknown) => {
        if (erro instanceof multer.MulterError && erro.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                mensagem: ErrorMessagens.FILE.FILE_TOO_LARGE(TAMANHO_MAXIMO_UPLOAD_MB),
                code: ErrorCodes.FILE_TOO_LARGE
            })
        }
        // outros erros seguem para o tratamento padrão do Express
        next(erro)
    })
}


router.post('/xlsx-json', recebeArquivo, async (req, res, next) => {
    xlsxForJsonController.handleUpload(req, res).catch(next)   
    
})

router.post('/json-xlsx', recebeArquivo, async (req, res, next ) => {
    jsonForXlsxController.handleUpload(req, res).catch(next)
})

// verifica se o servidor e o serviço de conversão (Python) estão no ar
router.get('/health', async (req, res) => {
    const conversorOk = await new CallAPIPython('').verificaSaude()
    res.status(conversorOk ? 200 : 503).json({
        status: conversorOk ? 'ok' : 'degradado',
        conversor: conversorOk ? 'ok' : 'indisponível'
    })
})


export default router
