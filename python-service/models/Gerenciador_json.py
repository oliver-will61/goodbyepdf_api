import pandas as pd
from io import BytesIO, StringIO

class Gerenciado_json:
    def __init__(self, arquivo):
          self.arquivo = arquivo

    def converteXlsx(self):
            
            print('iniciando a conversão...')

            #cria um objeto file-lile a partir dos bytes
            json_file = BytesIO(self.arquivo)

            #Lê o JSON do objeto file-like
            df = pd.read_json(json_file)

            print(df)

            #cria um buffer em memoria para o arquivo excel
            excel_buffer = BytesIO()
            
            #salva o DataFrame como xlsx no buffer
            df.to_excel(excel_buffer, index=False, engine='openpyxl')

            #posiciona o cursor no incio do buffer para leitura
            excel_buffer.seek(0)

            #Retorna apenas os bytes (simples), não o objeto BytesIO
            return excel_buffer.getvalue()  