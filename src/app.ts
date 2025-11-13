import express from 'express'
import cors from 'cors'
import path from 'path'

import goodbypdRouter from './router/goodbyepdfRouter'
 

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

export default app;
