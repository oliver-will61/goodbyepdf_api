from fastapi import HTTPException, Response
from starlette.concurrency import run_in_threadpool
from zipfile import BadZipFile
from models.Gerenciador_xlsx import Gerenciador_xlsx
import traceback

# tipo de conteúdo de um documento PDF
MIME_PDF = "application/pdf"


async def xlsx_pdf_controller(arquivo):
        try:
            print(f"📥 Arquivo Recebido no Python: {arquivo.filename}")

            # lê o conteúdo em bytes
            conteudo = await arquivo.read()

            # o LibreOffice roda como processo externo e a chamada é bloqueante:
            # roda em uma thread separada para não travar o loop do servidor
            gerenciador = Gerenciador_xlsx(conteudo)
            arquivo_convertido = await run_in_threadpool(gerenciador.convertePdf)

            # retorna o PDF como resposta para download
            return Response(
                content=arquivo_convertido,
                media_type=MIME_PDF,
                headers={
                        "Content-Disposition": f"attachment; filename={arquivo.filename}",
                        "Access-Control-Expose-Headers": "Content-Disposition"
                    }
            )

        # planilha corrompida ou ilegível: erro do arquivo enviado, não do servidor
        except (ValueError, BadZipFile) as e:
            print(f"⚠️ Conteúdo não convertível: {str(e)}")
            raise HTTPException(status_code=422, detail=f"Não foi possível converter o arquivo Excel: {str(e)}")

        # timeout do LibreOffice, LibreOffice não instalado etc.: erro do servidor
        except Exception as e:
            print(f"❌ Erro no Python: {str(e)}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")
