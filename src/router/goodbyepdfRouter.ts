import express from 'express'
//import cors from 'cors'
import multer from 'multer'

import {xlsxForJsonController} from '../controllers/xlsxForJsonController'

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
});


router.post('/xlsx-json', upload.single('arquivo'), async (req, res, next) => {
    xlsxForJsonController(req, res).catch(next)   
})


export default router
