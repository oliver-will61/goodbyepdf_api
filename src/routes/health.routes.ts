import { Router } from 'express'
import { healthController } from '../controllers/health.controller'

// checagem de saúde da API e do serviço de conversão
const router = Router()

router.get('/health', healthController.verifica)

export default router
