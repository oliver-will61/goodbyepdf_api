import { Router } from 'express'
import { recebeArquivo } from '../middlewares/upload'
import { xlsxPdfController } from '../controllers/xlsxPdf.controller'

// conversão Excel → PDF: recebe o arquivo no campo "arquivo" (multipart/form-data)
const router = Router()

router.post('/xlsx-pdf', recebeArquivo, xlsxPdfController.converte)

export default router
