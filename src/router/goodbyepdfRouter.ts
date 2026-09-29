import express from 'express'
//import cors from 'cors'
import multer from 'multer'

import {xlsxForJsonController, jsonForXlsxController} from '../controllers/arquivosController'
import { CallAPIPython } from '../services/CallAPIPython'

const router = express.Router();

// const app = express();
// app.use(express.json())
// app.use(cors({
//     origin: ['https://willian-ribeiro.com', 'http://localhost:3000'],
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     credentials: true
// }))
 

//configuração do multer para tratar arquivos
const upload = multer({
    dest: 'upload', // pasta temporaria para salvar arquivos 
    storage: multer.memoryStorage() // mantém o arquivo em buffer
    // limits: {
    //     filesize: 10 * 1024 * 1024
    // }
});


router.post('/xlsx-json', upload.single('arquivo'), async (req, res, next) => {
    xlsxForJsonController.handleUpload(req, res).catch(next)   
    
})

router.post('/json-xlsx', upload.single('arquivo'), async (req, res, next ) => {
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
