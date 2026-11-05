import os
import subprocess
import tempfile
import zipfile
import pandas as pd
from io import BytesIO, StringIO

# tempo máximo da conversão pelo LibreOffice; fica abaixo dos 120 s que o
# Express espera (TIMEOUT_XLSX_PDF_MS), para o erro aparecer do lado do Python
TIMEOUT_LIBREOFFICE_S = 100

class Gerenciador_xlsx:
    def __init__(self, arquivo):
          self.arquivo = arquivo

    def converte_json(self):
            
            print('iniciando a conversão...')

            excel_data = BytesIO(self.arquivo)

            # Lê o arquivo Excel
            df = pd.read_excel(excel_data)


            #Usa stringIO para simular um arquivo em memoria
            json_buffer = StringIO()

            #converte o excel em json 
            # 'records' orienta a criação de uma lista de objetos JSON
            # 'indent' adiciona indentação para melhor legibilidade
            # salva o conteudo do excel no json_buffer
            df.to_json(json_buffer, orient='records', indent=4, force_ascii=False)  

            # Pega o conteúdo do json_buffer, transformando a variavel no tipo string
            arquivo_json = json_buffer.getvalue()
            json_buffer.close

            print(arquivo_json)

            return arquivo_json


    def convertePdf(self) -> bytes:
        """
        Converte a planilha (todas as abas) em PDF com o LibreOffice headless.

        O LibreOffice só trabalha com arquivos, então a planilha é gravada em uma
        pasta temporária que é apagada assim que a conversão termina (com ou sem erro).

        Returns:
            bytes do PDF gerado

        Raises:
            zipfile.BadZipFile: o conteúdo não é um .xlsx (ZIP) válido
            ValueError: o LibreOffice não conseguiu gerar o PDF a partir do arquivo
        """
        print('iniciando a conversão XLSX -> PDF...')

        # um .xlsx é um ZIP: rejeita logo o que nem abre como ZIP
        if not zipfile.is_zipfile(BytesIO(self.arquivo)):
            raise zipfile.BadZipFile('o arquivo não é uma planilha .xlsx válida')

        with tempfile.TemporaryDirectory() as pasta:
            entrada = os.path.join(pasta, 'planilha.xlsx')
            saida = os.path.join(pasta, 'planilha.pdf')

            with open(entrada, 'wb') as arquivo_entrada:
                arquivo_entrada.write(self.arquivo)

            # perfil de usuário próprio por conversão: permite várias conversões ao
            # mesmo tempo (o LibreOffice trava o perfil enquanto está rodando)
            perfil = 'file://' + os.path.join(pasta, 'perfil')

            # --convert-to pdf exporta todas as abas, cada uma em páginas próprias;
            # estoura subprocess.TimeoutExpired se passar do tempo limite
            subprocess.run(
                [
                    'soffice', '--headless', '--norestore', '--nologo',
                    f'-env:UserInstallation={perfil}',
                    '--convert-to', 'pdf', '--outdir', pasta, entrada
                ],
                capture_output=True,
                timeout=TIMEOUT_LIBREOFFICE_S
            )

            # arquivo corrompido: o LibreOffice termina sem gerar a saída
            if not os.path.exists(saida) or os.path.getsize(saida) == 0:
                raise ValueError('o LibreOffice não conseguiu ler a planilha')

            with open(saida, 'rb') as arquivo_saida:
                return arquivo_saida.read()
