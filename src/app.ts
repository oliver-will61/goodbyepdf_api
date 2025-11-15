import express from 'express'
import cors from 'cors'
import goodbypdRouter from './router/goodbyepdfRouter'
import goodbypdfPagesRouter from './router/goodbyepdfPagesRouter' 

const app = express()

app.use(express.json());

app.use(cors({
    origin: 'https://willian-ribeiro.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))

app.use(express.static('frontend'))

const router = express.Router();

//registra rota
app.use('/', goodbypdRouter)
app.use('/pg', goodbypdfPagesRouter)

export default app;
