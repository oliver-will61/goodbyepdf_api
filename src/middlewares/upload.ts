import multer from 'multer'
import { TAMANHO_MAXIMO_UPLOAD_BYTES } from '../constants/limites'

/*
    Recebimento de arquivos com o Multer.
    memoryStorage mantém o arquivo só em memória (req.file.buffer): nada é gravado
    em disco, e o buffer é descartado pelo coletor de lixo ao fim da requisição.
*/
const upload = multer({
    storage: multer.memoryStorage(),
    // limite de tamanho: como o arquivo fica em memória, evita estourar a RAM do servidor.
    // O busboy (usado pelo Multer) acusa o limite ao atingir exatamente esse valor,
    // por isso o +1: um arquivo de exatamente TAMANHO_MAXIMO_UPLOAD_BYTES é aceito.
    // O erro de tamanho vira 413 no middleware trataErros.
    limits: {
        fileSize: TAMANHO_MAXIMO_UPLOAD_BYTES + 1
    }
})

// middleware que lê o arquivo enviado no campo "arquivo"
export const recebeArquivo = upload.single('arquivo')
