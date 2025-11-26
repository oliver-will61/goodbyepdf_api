import express from 'express'
import cors from 'cors'
import goodbypdRouter from './router/goodbyepdfRouter'
// import goodbypdfPagesRouter from './router/goodbyepdfPagesRouter' 

const app = express()

app.use(express.json());

app.use(cors({
    origin: 'https://willian-ribeiro.com',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}))

//Serve as paginas estaticas
app.use(express.static('frontend/public'))

//registra rota
app.use('/', goodbypdRouter)
// app.use('/pg', goodbypdfPagesRouter)

export default app;
