from fastapi import HTTPException, Response
from starlette.concurrency import run_in_threadpool
from pymupdf import FileDataError
from pdf2docx.converter import ConversionException
from models.Gerenciador_pdf import Gerenciador_pdf
import traceback

# tipo de conteúdo de um documento Word (.docx)
MIME_DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


async def pdf_docx_controller(arquivo):
        try:
            print(f"📥 Arquivo Recebido no Python: {arquivo.filename}")

            # lê o conteúdo em bytes
            conteudo = await arquivo.read()

            # a conversão de PDF usa bastante CPU e é síncrona: roda em uma thread
            # separada para não travar o loop do servidor enquanto converte
            gerenciador = Gerenciador_pdf(conteudo)
            arquivo_convertido = await run_in_threadpool(gerenciador.converteDocx)

            # retorna o .docx como resposta para download
            return Response(
                content=arquivo_convertido,
                media_type=MIME_DOCX,
                headers={
                        "Content-Disposition": f"attachment; filename={arquivo.filename}",
                        "Access-Control-Expose-Headers": "Content-Disposition"
                    }
            )

        # PDF corrompido, protegido por senha ou com página que não pôde ser lida:
        # erro do arquivo enviado, não do servidor
        except (FileDataError, ConversionException, ValueError) as e:
            print(f"⚠️ Conteúdo não convertível: {str(e)}")
            raise HTTPException(status_code=422, detail=f"Não foi possível converter o arquivo PDF: {mensagem_amigavel(e)}")

        except Exception as e:
            print(f"❌ Erro no Python: {str(e)}")
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Erro: {str(e)}")


def mensagem_amigavel(erro: Exception) -> str:
    """Traduz os erros mais comuns da pdf2docx/PyMuPDF para mensagens em português."""
    texto = str(erro)
    if 'password' in texto.lower():
        return 'o PDF está protegido por senha.'
    if isinstance(erro, FileDataError):
        return 'o arquivo está corrompido ou não é um PDF válido.'
    return texto
