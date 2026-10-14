from io import BytesIO
import pymupdf
from pdf2docx import Converter
from pptx import Presentation
from pptx.util import Pt

# resolução usada para renderizar cada página como imagem no .pptx:
# 150 dpi deixa o texto nítido em tela cheia sem inflar demais o arquivo
DPI_SLIDE = 150

# índice do layout "em branco" no modelo padrão da python-pptx
LAYOUT_EM_BRANCO = 6


class Gerenciador_pdf:
    """
    Converte arquivos PDF para Word (.docx), com a biblioteca pdf2docx, e para
    PowerPoint (.pptx), com PyMuPDF + python-pptx.

    Toda a conversão acontece em memória: o PDF entra como bytes e o arquivo
    convertido sai como bytes, sem gravar arquivos temporários em disco.

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

    def convertePptx(self) -> bytes:
        """
        Gera um .pptx com um slide por página do PDF.

        Cada página é renderizada como imagem PNG (o texto não fica editável),
        o que mantém o visual idêntico ao do PDF.
        """
        print('iniciando a conversão PDF -> PPTX...')

        # abre o PDF direto dos bytes; arquivo corrompido lança FileDataError
        documento = pymupdf.open(stream=self.arquivo, filetype='pdf')
        try:
            # PDF protegido por senha não pode ser renderizado
            if documento.needs_pass:
                raise ValueError('password: o PDF está protegido por senha')
            if documento.page_count == 0:
                raise ValueError('o PDF não tem páginas')

            apresentacao = Presentation()

            # o tamanho do slide segue o da 1ª página (1 ponto do PDF = 1 pt no PowerPoint)
            primeira_pagina = documento[0].rect
            apresentacao.slide_width = Pt(primeira_pagina.width)
            apresentacao.slide_height = Pt(primeira_pagina.height)
            layout = apresentacao.slide_layouts[LAYOUT_EM_BRANCO]

            for pagina in documento:
                # renderiza a página e guarda o PNG em memória
                imagem = BytesIO(pagina.get_pixmap(dpi=DPI_SLIDE).tobytes('png'))

                # ajusta a imagem ao slide mantendo a proporção da página
                # (páginas de tamanhos diferentes ficam centralizadas)
                escala = min(apresentacao.slide_width / pagina.rect.width,
                             apresentacao.slide_height / pagina.rect.height)
                largura = int(pagina.rect.width * escala)
                altura = int(pagina.rect.height * escala)
                esquerda = (apresentacao.slide_width - largura) // 2
                topo = (apresentacao.slide_height - altura) // 2

                slide = apresentacao.slides.add_slide(layout)
                slide.shapes.add_picture(imagem, esquerda, topo, largura, altura)
        finally:
            # libera o documento aberto pelo PyMuPDF mesmo se a conversão falhar
            documento.close()

        # salva a apresentação em memória e devolve só os bytes
        pptx_buffer = BytesIO()
        apresentacao.save(pptx_buffer)
        return pptx_buffer.getvalue()
