/*
    Funções puras para lidar com arquivos.
    Não dependem do Express nem de regras de negócio, por isso podem ser
    reaproveitadas por qualquer service (e testadas isoladamente).
*/

// devolve a extensão do arquivo, em minúsculas e sem o ponto ('' se não houver)
export function obtemExtensao(nomeArquivo: string): string {
    const posicaoPonto = nomeArquivo.lastIndexOf('.')
    // sem ponto, ou ponto só no início (ex.: ".env"), não há extensão
    if (posicaoPonto <= 0) return ''
    return nomeArquivo.slice(posicaoPonto + 1).toLowerCase()
}

// troca a extensão do arquivo (ex.: "dados.json" + "xlsx" → "dados.xlsx")
export function trocaExtensao(nomeArquivo: string, novaExtensao: string): string {
    const posicaoPonto = nomeArquivo.lastIndexOf('.')
    const nomeSemExtensao = posicaoPonto > 0 ? nomeArquivo.slice(0, posicaoPonto) : nomeArquivo
    return `${nomeSemExtensao}.${novaExtensao}`
}

// verifica se o conteúdo começa com a assinatura (magic number) informada.
// Conteúdos menores que a assinatura (inclusive vazios) não batem.
export function possuiAssinatura(conteudo: Buffer, assinatura: Buffer): boolean {
    return conteudo.subarray(0, assinatura.length).equals(assinatura)
}

// verifica se o conteúdo é um JSON válido (texto UTF-8 aceito pelo JSON.parse)
export function ehJsonValido(conteudo: Buffer): boolean {
    try {
        JSON.parse(conteudo.toString('utf8'))
        return true
    } catch {
        return false
    }
}
