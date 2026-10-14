import { Router } from 'express'
import { recebeArquivo } from '../middlewares/upload'
import { xlsxJsonController } from '../controllers/xlsxJson.controller'

// conversão Excel → JSON: recebe o arquivo no campo "arquivo" (multipart/form-data)
const router = Router()

router.post('/xlsx-json', recebeArquivo, xlsxJsonController.converte)

export default router
