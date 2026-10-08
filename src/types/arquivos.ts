// Tipos compartilhados entre controllers e services.
// Os services não conhecem o Express: recebem e devolvem estes objetos simples.

// arquivo enviado pelo cliente, já extraído da requisição pelo controller
export interface ArquivoRecebido {
    nome: string            // nome original (ex.: dados.json)
    conteudo: Buffer        // bytes do arquivo, mantidos só em memória
    tipoConteudo: string    // MIME type informado pelo cliente
}

// resultado de uma conversão, pronto para o controller enviar ao cliente
export interface ArquivoConvertido {
    nome: string            // nome sugerido para download (ex.: dados.xlsx)
    conteudo: Buffer        // bytes do arquivo convertido
    tipoConteudo: string    // MIME type do arquivo convertido
}
