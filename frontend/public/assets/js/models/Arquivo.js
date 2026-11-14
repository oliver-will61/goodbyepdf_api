export default class Arquivo {

    /*
    Gerencia o arquivo que o usuário sobe na página HTML.

    Args:
        upload: arquivo (File) selecionado ou arrastado pelo usuário
    */

    constructor (upload) {
        // sem arquivo não há o que validar nem enviar
        if (!upload) {
            throw new Error('Selecione um arquivo antes de converter.')
        }

        this.upload = upload
    }


    get extensao() {
        /* Retorna a extensão do arquivo enviado, sempre em minúsculas */
        return this.upload.name.split('.').pop().toLowerCase()
    }


    get nomeSemExtensao() {
        /* Retorna o nome do arquivo sem a extensão (usado para nomear o arquivo convertido) */
        const partes = this.upload.name.split('.')
        return partes.length > 1 ? partes.slice(0, -1).join('.') : this.upload.name
    }


    verificaExtensao(extensaoPermitida) {

        /* Verifica a extensão do arquivo

            args:
                extensaoPermitida: extensão aceita pela conversão (sem o ponto)

            return:
                true se a extensão for válida; lança erro caso contrário
        */

        if (this.extensao !== extensaoPermitida) {
            throw new Error(`Extensão não permitida. Use um arquivo com a extensão: .${extensaoPermitida}`)
        }

        return true
    }


    async realizaConversao(endpoint) {

        /* Envia o arquivo para o servidor que é responsável por convertê-lo

            args:
                endpoint: endpoint da rota de conversão (ex.: /json-xlsx)

            return: a resposta (Response) com o arquivo convertido em binário
        */

        const formData = new FormData()
        formData.append('arquivo', this.upload)

        let response
        try {
            response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            })
        } catch {
            // fetch só falha assim quando não consegue falar com o servidor
            throw new Error('Servidor indisponível. Tente novamente em instantes.')
        }

        if (!response.ok) {
            throw new Error(await Arquivo.#extraiMensagemErro(response))
        }

        return response
    }


    static async #extraiMensagemErro(response) {

        /* Lê a mensagem de erro devolvida pela API ({ mensagem: "..." })

            args:
                response: resposta com status de erro

            return: a mensagem da API ou uma mensagem genérica
        */

        try {
            const corpo = await response.json()
            if (corpo?.mensagem) return corpo.mensagem
        } catch {
            // corpo vazio ou que não é JSON: cai na mensagem genérica abaixo
        }

        return 'Não foi possível converter o arquivo. Tente novamente.'
    }
}
