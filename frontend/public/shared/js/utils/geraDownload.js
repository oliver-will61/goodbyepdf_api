export default async function geraDownload(arquivo, nomeArquivo) {
    /*
        converte o arquivo binario em blob e cria um url de donwload
    */

    //cria URL para download
    const blob  = await arquivo.blob();
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link)
    link.click();
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)

}