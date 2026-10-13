import { Router } from 'express'
import { recebeArquivo } from '../middlewares/upload'
import { pdfDocxController } from '../controllers/pdfDocx.controller'

// conversão PDF → Word: recebe o arquivo no campo "arquivo" (multipart/form-data)
const router = Router()

router.post('/pdf-docx', recebeArquivo, pdfDocxController.converte)

export default router
