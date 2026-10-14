import { Request, Response } from 'express'
import { verificaSaude } from '../services/health.service'

/*
    Controller da checagem de saúde: 200 se tudo estiver no ar,
    503 se o serviço de conversão estiver fora.
*/
export const healthController = {
    async verifica(_req: Request, res: Response): Promise<void> {
        const saude = await verificaSaude()
        res.status(saude.status === 'ok' ? 200 : 503).json(saude)
    }
}
