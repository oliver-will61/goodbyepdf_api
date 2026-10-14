import { ArquivoRecebido, ArquivoConvertido } from '../types/arquivos'
import { FORMATOS } from '../constants/formatos'
import { EndpointsConversor } from '../constants/endpointsConversor'
import { trocaExtensao } from '../utils/arquivo'
import { conversorService } from './conversor.service'
import { validaArquivoXlsx } from '../validators/xlsx.validator'

/*
    Regras de negócio da conversão Excel (.xlsx) → JSON.
*/

// valida a planilha, envia ao conversor e devolve o JSON gerado
export async function converteXlsxParaJson(arquivo: ArquivoRecebido): Promise<ArquivoConvertido> {
    validaArquivoXlsx(arquivo)

    const conteudo = await conversorService.converte(EndpointsConversor.XLSX_JSON, arquivo)

    return {
        nome: trocaExtensao(arquivo.nome, FORMATOS.JSON.extensao),
        conteudo,
        tipoConteudo: FORMATOS.JSON.tipoConteudo
    }
}
