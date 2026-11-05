import re
from io import BytesIO
import pymupdf
from openpyxl import Workbook
from openpyxl.styles import Font
from pdf2docx import Converter
from pptx import Presentation
from pptx.util import Pt

# resolução usada para renderizar cada página como imagem no .pptx:
# 150 dpi deixa o texto nítido em tela cheia sem inflar demais o arquivo
DPI_SLIDE = 150

# índice do layout "em branco" no modelo padrão da python-pptx
LAYOUT_EM_BRANCO = 6

# o Excel limita o nome de uma aba a 31 caracteres
TAMANHO_MAXIMO_NOME_ABA = 31

# largura máxima de uma coluna na planilha (em caracteres), para textos longos
LARGURA_MAXIMA_COLUNA = 60

# número "simples": inteiro ou decimal com vírgula ou ponto, sem separador de milhar.
# "1.234" fica de fora de propósito: pode ser mil duzentos e trinta e quatro (pt-BR)
# ou um vírgula dois três quatro (en-US), então é mantido como texto; números com
# zero à esquerda ("007", CEPs, códigos) também ficam como texto para não perder o zero
PADRAO_NUMERO = re.compile(r'^-?(?!0\d)\d+([.,]\d{1,2}|[.,]\d{4,})?$')


class Gerenciador_pdf:
    """
    Converte arquivos PDF para Word (.docx), com a biblioteca pdf2docx, para
    PowerPoint (.pptx), com PyMuPDF + python-pptx, e para Excel (.xlsx), com
    PyMuPDF (detecção de tabelas) + openpyxl.

    Toda a conversão acontece em memória: o PDF entra como bytes e o arquivo
    convertido sai como bytes, sem gravar arquivos temporários em disco.

    Args:
        arquivo: conteúdo do PDF em bytes
    """

    def __init__(self, arquivo: bytes):
        self.arquivo = arquivo

    def _abreDocumento(self):
        """
        Abre o PDF direto dos bytes e recusa os que não podem ser lidos.

        Raises:
            pymupdf.FileDataError: PDF corrompido
            ValueError: PDF protegido por senha ou sem páginas
        """
        documento = pymupdf.open(stream=self.arquivo, filetype='pdf')

        # PDF protegido por senha não pode ser lido
        if documento.needs_pass:
            documento.close()
            raise ValueError('password: o PDF está protegido por senha')
        if documento.page_count == 0:
            documento.close()
            raise ValueError('o PDF não tem páginas')

        return documento

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

        # abre o PDF direto dos bytes (corrompido, com senha ou sem páginas lança erro)
        documento = self._abreDocumento()
        try:
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

    def converteXlsx(self) -> bytes:
        """
        Gera uma planilha .xlsx com as tabelas do PDF.

        Cada tabela encontrada (PyMuPDF, page.find_tables) vira uma aba
        "Pág N - Tabela M", e a primeira linha dela fica em negrito (cabeçalho).
        Se o PDF não tiver nenhuma tabela, cada página vira uma aba "Página N"
        com o texto da página, uma linha do PDF por linha da planilha, para
        nunca devolver uma planilha vazia.
        """
        print('iniciando a conversão PDF -> XLSX...')

        documento = self._abreDocumento()
        try:
            # lista de (nome da aba, linhas, primeira linha é cabeçalho?)
            abas = []

            for numero, pagina in enumerate(documento, start=1):
                for indice, tabela in enumerate(pagina.find_tables().tables, start=1):
                    linhas = [[self._valorCelula(celula) for celula in linha] for linha in tabela.extract()]
                    abas.append((f'Pág {numero} - Tabela {indice}', linhas, True))

            # nenhuma tabela no documento: exporta o texto de cada página
            if not abas:
                for numero, pagina in enumerate(documento, start=1):
                    linhas = [[linha.strip()] for linha in pagina.get_text().splitlines() if linha.strip()]
                    abas.append((f'Página {numero}', linhas, False))
        finally:
            # libera o documento aberto pelo PyMuPDF mesmo se a conversão falhar
            documento.close()

        planilha = Workbook()
        # o Workbook já nasce com uma aba vazia: ela é removida e as abas são criadas na ordem
        planilha.remove(planilha.active)

        for nome, linhas, tem_cabecalho in abas:
            aba = planilha.create_sheet(title=nome[:TAMANHO_MAXIMO_NOME_ABA])
            for linha in linhas:
                aba.append(linha)

            # destaca o cabeçalho da tabela
            if tem_cabecalho and linhas:
                for celula in aba[1]:
                    celula.font = Font(bold=True)

            self._ajustaLarguraColunas(aba)

        # salva a planilha em memória e devolve só os bytes
        xlsx_buffer = BytesIO()
        planilha.save(xlsx_buffer)
        return xlsx_buffer.getvalue()

    @staticmethod
    def _valorCelula(celula):
        """
        Limpa o texto de uma célula extraída do PDF.

        Célula vazia (None) vira None (célula vazia no Excel), quebras de linha
        dentro da célula viram espaço e números simples viram número, para o
        Excel conseguir somar e ordenar.
        """
        if celula is None:
            return None

        texto = ' '.join(celula.split())
        if not texto:
            return None

        if PADRAO_NUMERO.match(texto):
            numero = float(texto.replace(',', '.'))
            return int(numero) if numero.is_integer() and not re.search(r'[.,]', texto) else numero

        return texto

    @staticmethod
    def _ajustaLarguraColunas(aba):
        """Ajusta a largura de cada coluna ao maior texto dela (com um limite)."""
        for coluna in aba.iter_cols():
            maior = max((len(str(celula.value)) for celula in coluna if celula.value is not None), default=0)
            aba.column_dimensions[coluna[0].column_letter].width = min(maior + 2, LARGURA_MAXIMA_COLUNA)
