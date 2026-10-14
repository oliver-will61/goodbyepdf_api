from fastapi import HTTPException, Response
from starlette.concurrency import run_in_threadpool
from pymupdf import FileDataError
from models.Gerenciador_pdf import Gerenciador_pdf
# as mensagens de erro de PDF são as mesmas da conversão para Word
from controllers.pdf_docx_controller import mensagem_amigavel
import traceback

# tipo de conteúdo de uma apresentação PowerPoint (.pptx)
MIME_PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation"


async def pdf_pptx_controller(arquivo):
        try:
            print(f"📥 Arquivo Recebido no Python: {arquivo.filename}")

            # lê o conteúdo em bytes
            conteudo = await arquivo.read()

            # renderizar as páginas usa bastante CPU e é síncrono: roda em uma thread
            # separada para não travar o loop do servidor enquanto converte
            gerenciador = Gerenciador_pdf(conteudo)
            arquivo_convertido = await run_in_threadpool(gerenciador.convertePptx)

            # retorna o .pptx como resposta para download
            return Response(
                content=arquivo_convertido,
                media_type=MIME_PPTX,
                headers={
                        "Content-Disposition": f"attachment; filename={arquivo.filename}",
                        "Access-Control-Expose-Headers": "Content-Disposition"
                    }
            )

        # PDF corrompido, protegido por senha ou sem páginas:
        # erro do arquivo enviado, não do servidor
        except (FileDataError, ValueError) as e:
            print(f"⚠️ Conteúdo não convertível: {str(e)}")
            raise HTTPException(status_code=422, detail=f"Não foi possível converter o arquivo PDF: {mensagem_amigavel(e)}")

        except Exception as e:
            print(f"❌ Erro no Python: {str(e)}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")
