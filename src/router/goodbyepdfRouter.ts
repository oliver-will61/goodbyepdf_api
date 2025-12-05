import express from 'express'
//import cors from 'cors'
import multer from 'multer'

import {xlsxForJsonController} from '../controllers/xlsxForJsonController'
import {jsonForXlsxController} from '../controllers/jsonForXlsxController'

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
    console.log('arquivo recebido na rota /xlsx');
    xlsxForJsonController(req, res).catch(next)   
    
})

router.post('/json-xlsx', upload.single('arquivo'), async (req, res, next ) => {
    jsonForXlsxController(req, res).catch(next)
})


export default router
