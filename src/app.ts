import express from 'express'
import cors from 'cors'
import routes from './routes'
import { trataErros } from './middlewares/trataErros'

const app = express()

app.use(express.json())

app.use(cors({
    origin: 'https://willian-ribeiro.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))

// serve as páginas estáticas do frontend
app.use(express.static('frontend/public'))

// registra as rotas da API
app.use('/', routes)

// tratamento central de erros: precisa vir depois das rotas
app.use(trataErros)

export default app
