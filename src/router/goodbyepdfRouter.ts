import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'

import {xlsxForJsonController} from '../controllers/xlsxForJsonController'

const router = express.Router();
const app = express();

app.use(express.json())

app.use(cors({
    origin: ['https://willian-ribeiro.com', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))
 

//configuração do multer para tratar arquivos
const upload = multer({
    dest: 'upload', // pasta temporaria para salvar arquivos 
});


router.post('/xlsx-json', upload.single('arquivo'), async (req, res, next) => {
    xlsxForJsonController(req, res).catch(next)   
})


router.get('/xlsx-json', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/html/xlsx/xlsxForJson.html'))
})


//pages

//index
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/html/index.html'))
})

export default router
