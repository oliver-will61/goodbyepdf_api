import { Router } from 'express'
import { recebeArquivo } from '../middlewares/upload'
import { pdfXlsxController } from '../controllers/pdfXlsx.controller'

// conversão PDF → Excel: recebe o arquivo no campo "arquivo" (multipart/form-data)
const router = Router()

router.post('/pdf-xlsx', recebeArquivo, pdfXlsxController.converte)

export default router
