import dotenv from 'dotenv'

// carrega o .env antes de qualquer outro módulo ler process.env
dotenv.config()

import app from './app'

const PORT = process.env.PORT
const HOST = process.env.HOST

app.listen(PORT, () => {
    console.log(`Servidor rodando em ${HOST}:${PORT}`)
})
