import { Router } from 'express'
import { recebeArquivo } from '../middlewares/upload'
import { jsonXlsxController } from '../controllers/jsonXlsx.controller'

// conversão JSON → Excel: recebe o arquivo no campo "arquivo" (multipart/form-data)
const router = Router()

router.post('/json-xlsx', recebeArquivo, jsonXlsxController.converte)

export default router
