from fastapi import HTTPException, Response
from zipfile import BadZipFile
from models.Gerenciador_xlsx import Gerenciador_xlsx
from models.Gerenciador_json import Gerenciado_json
import traceback

async def json_xlsx_controller(arquivo):
        try:
            
            print(f"📥 Arquivo Recebido no Python: {arquivo.filename}")

            # Lê o conteúdo em bytes
            conteudo = await arquivo.read()

            # abre o arquivo em xlsx e o converte para JSON
            gerenciador =  Gerenciado_json(conteudo)
            arquivo_convertido = gerenciador.converteXlsx()

            print(f"🔍 Tipo do arquivo_convertido: {type(arquivo_convertido)}")
            #retorna o arquivo como resposta para donwload

            resposta = Response(
                content= arquivo_convertido,
                #envia a respota em json
                media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={
                        "Content-Disposition": f"attachment; filename={arquivo.filename}",
                        "Access-Control-Expose-Headers": "Content-Disposition"
                    }
            )

            print(resposta)
            return resposta
                    
        # o pandas não conseguiu ler o conteúdo: erro do arquivo enviado, não do servidor
        except (ValueError, BadZipFile) as e:
            print(f"⚠️ Conteúdo não convertível: {str(e)}")
            raise HTTPException(status_code=422, detail=f"Não foi possível converter o arquivo JSON: {str(e)}")

        except Exception as e:
            print(f"❌ Erro no Python: {str(e)}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")
