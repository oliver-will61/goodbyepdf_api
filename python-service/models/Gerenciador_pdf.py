from io import BytesIO
from pdf2docx import Converter


class Gerenciador_pdf:
    """
    Converte arquivos PDF para Word (.docx) usando a biblioteca pdf2docx.

    Toda a conversão acontece em memória: o PDF entra como bytes e o DOCX
    sai como bytes, sem gravar arquivos temporários em disco.

    Args:
        arquivo: conteúdo do PDF em bytes
    """

    def __init__(self, arquivo: bytes):
        self.arquivo = arquivo

    def converteDocx(self) -> bytes:
        print('iniciando a conversão PDF -> DOCX...')

        # buffer em memória que vai receber o .docx gerado
        docx_buffer = BytesIO()

        # abre o PDF direto dos bytes (stream) em vez de um caminho de arquivo
        conversor = Converter(stream=self.arquivo)
        try:
            # analisa o layout de cada página (texto, tabelas, imagens) e monta o .docx
            conversor.convert(docx_buffer)
        finally:
            # libera o documento aberto pelo PyMuPDF mesmo se a conversão falhar
            conversor.close()

        # retorna apenas os bytes do .docx
        return docx_buffer.getvalue()
