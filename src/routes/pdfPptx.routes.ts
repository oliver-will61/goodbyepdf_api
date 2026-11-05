import { Router } from 'express'
import { recebeArquivo } from '../middlewares/upload'
import { pdfPptxController } from '../controllers/pdfPptx.controller'

// conversão PDF → PowerPoint: recebe o arquivo no campo "arquivo" (multipart/form-data)
const router = Router()

router.post('/pdf-pptx', recebeArquivo, pdfPptxController.converte)

export default router
