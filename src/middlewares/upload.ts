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
    // A partir do Multer 2.5 o próprio Multer compensa o busboy (que acusa o limite
    // ao atingir exatamente o valor): um arquivo de exatamente TAMANHO_MAXIMO_UPLOAD_BYTES
    // é aceito e só o que passa disso é recusado. Por isso o package.json exige multer >= 2.5.
    // O erro de tamanho vira 413 no middleware trataErros.
    limits: {
        fileSize: TAMANHO_MAXIMO_UPLOAD_BYTES
    }
})

// middleware que lê o arquivo enviado no campo "arquivo"
export const recebeArquivo = upload.single('arquivo')
