export default class Arquivo {

    /* 
    Gerencia os arquivos que o usuário sobe na pagina html

    Args:
        arquivoEnviado: é o arquivo que o usuário subiu na pagina
    */

    constructor (upload) {
        this.upload = upload
        this. extensoesPermitidas = {

            /* Variavel responsável por armazenar em constantes os valores das extensões permitidas*/

            JSON: 'json',
            XLSX: 'xlsx'
        }
    }



    verificaExtensao(extensaoPermitidas) {

        /*Verifica as extensões dos arquivos

            args:
                extensaoPermitidas: definine a extensão permitida do arquivo
        
            return: 
                erro caso a extensão do arquivo do usuário não corresponda a extensão permitida

        */
            
        const extensaoArquivoEnviado = this.upload.name.split('.').pop().toLowerCase();

        if (extensaoArquivoEnviado != extensaoPermitidas){
            throw new Error (`Extensão não permitida. Use um arquivo com a extensão: .${extensaoPermitidas}`)
        }

        return true
    }


    async realizaConversao(endpoint){

        /* Envia o arquivo para o servidor que é responsável por converte-lo 

            args: 
                endpoint: endpoint da rota

            return: retorna o arquivo convertido, mas em binario
        */

        const formData = new FormData();
        formData.append('arquivo', this.upload);

        const response = await fetch(endpoint, {
            method: "POST",
            body: formData
        });
        
        if (!response.ok) {
            throw new Error ('Erro ao enviar o arquivo ao servidor!')
        }

        return response
    }
}

