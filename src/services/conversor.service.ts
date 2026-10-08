import axios from 'axios'
import FormData from 'form-data'
import { ArquivoRecebido } from '../types/arquivos'
import { ConversorError } from '../errors/AppError'
import { EndpointsConversor } from '../constants/endpointsConversor'

/*
    Cliente HTTP do serviço interno de conversão (Python/FastAPI).
    Só faz a comunicação: não valida arquivos e não conhece o Express.
    Falhas viram ConversorError, que o middleware de erros transforma em resposta.
*/

// tempo máximo de uma conversão e da checagem de saúde, em milissegundos
const TIMEOUT_CONVERSAO_MS = 30000
const TIMEOUT_SAUDE_MS = 3000

// URL base lida a cada chamada (e não no carregamento do módulo),
// para respeitar o .env carregado no index.ts e facilitar os testes
const urlBase = (): string => String(process.env.CONVERSOR_API_URL)

// o corpo de erro chega em arraybuffer: decodifica e usa o "detail" do FastAPI, se houver
function extraiDetalheErro(erro: any): string {
    const corpo = erro.response?.data
    if (!corpo) return erro.message

    const texto = Buffer.from(corpo).toString('utf8')
    try {
        return JSON.parse(texto).detail ?? texto
    } catch {
        return texto
    }
}

export const conversorService = {

    // envia o arquivo para o endpoint de conversão e devolve os bytes convertidos
    async converte(endpoint: string, arquivo: ArquivoRecebido): Promise<Buffer> {
        const formData = new FormData()
        formData.append('arquivo', arquivo.conteudo, {
            filename: arquivo.nome,
            contentType: arquivo.tipoConteudo
        })

        try {
            const resposta = await axios.post(`${urlBase()}${endpoint}`, formData, {
                headers: formData.getHeaders(),
                timeout: TIMEOUT_CONVERSAO_MS,
                // guarda a resposta em bytes, já que pode ser um arquivo binário (.xlsx)
                responseType: 'arraybuffer'
            })
            return Buffer.from(resposta.data)
        } catch (erro: any) {
            const detalhe = extraiDetalheErro(erro)
            // registra o detalhe técnico no log; o cliente recebe só a mensagem tratada
            console.error(`Falha no conversor (${endpoint}):`, erro.response?.status ?? erro.message, detalhe)
            throw new ConversorError(erro.response?.status, detalhe)
        }
    },

    // retorna true se o serviço de conversão responder no /health
    async verificaSaude(): Promise<boolean> {
        try {
            await axios.get(`${urlBase()}${EndpointsConversor.HEALTH}`, { timeout: TIMEOUT_SAUDE_MS })
            return true
        } catch {
            return false
        }
    }
}
