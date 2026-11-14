import { conversorService } from './conversor.service'

/*
    Regra de negócio da checagem de saúde:
    a API está "ok" só quando o serviço de conversão também responde.
*/

export interface StatusSaude {
    status: 'ok' | 'degradado'
    conversor: 'ok' | 'indisponível'
}

export async function verificaSaude(): Promise<StatusSaude> {
    const conversorOk = await conversorService.verificaSaude()

    return {
        status: conversorOk ? 'ok' : 'degradado',
        conversor: conversorOk ? 'ok' : 'indisponível'
    }
}
