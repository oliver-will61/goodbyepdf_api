import { ArquivoRecebido, ArquivoConvertido } from '../types/arquivos'
import { FORMATOS } from '../constants/formatos'
import { EndpointsConversor } from '../constants/endpointsConversor'
import { trocaExtensao } from '../utils/arquivo'
import { conversorService } from './conversor.service'
import { validaArquivoJson } from '../validators/json.validator'

/*
    Regras de negócio da conversão JSON → Excel (.xlsx).
*/

// valida o arquivo, envia ao conversor e devolve a planilha gerada
export async function converteJsonParaXlsx(arquivo: ArquivoRecebido): Promise<ArquivoConvertido> {
    validaArquivoJson(arquivo)

    const conteudo = await conversorService.converte(EndpointsConversor.JSON_XLSX, arquivo)

    return {
        nome: trocaExtensao(arquivo.nome, FORMATOS.XLSX.extensao),
        conteudo,
        tipoConteudo: FORMATOS.XLSX.tipoConteudo
    }
}
