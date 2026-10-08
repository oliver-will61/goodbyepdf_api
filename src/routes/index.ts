import { Router } from 'express'
import jsonXlsxRoutes from './jsonXlsx.routes'
import xlsxJsonRoutes from './xlsxJson.routes'
import healthRoutes from './health.routes'

// reúne as rotas de todas as features; uma conversão nova só precisa ser registrada aqui
const routes = Router()

routes.use(jsonXlsxRoutes)
routes.use(xlsxJsonRoutes)
routes.use(healthRoutes)

export default routes
