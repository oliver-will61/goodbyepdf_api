from fastapi import FastAPI, UploadFile, File
from controllers.xlsx_json_controller import xlsx_json_controller
from controllers.json_xlsx_controller import json_xlsx_controller
from controllers.pdf_docx_controller import pdf_docx_controller
from controllers.pdf_pptx_controller import pdf_pptx_controller
from controllers.xlsx_pdf_controller import xlsx_pdf_controller
from controllers.pdf_xlsx_controller import pdf_xlsx_controller

app = FastAPI()

# serviço interno: só é chamado pelo servidor Express (servidor para servidor),
# por isso não usa CORS e não deve ser exposto publicamente

# usado pelo Express e pelo orquestrador para saber se o serviço está no ar
@app.get("/health")
async def health():
    return {"status": "ok"}


# xlsx -> json
@app.post("/api/xlsx-json")
async def processaArquivo(arquivo: UploadFile = File(...)):
    print('arquivo recebido!')
    #chama controller
    return await xlsx_json_controller(arquivo)

# json -> xlsx
@app.post("/api/json-xlsx")
async def processaArquivo(arquivo: UploadFile = File(...)):
    print('arquivo recebido!')
    #chama controller
    return await json_xlsx_controller(arquivo)

# pdf -> docx
@app.post("/api/pdf-docx")
async def converte_pdf_docx(arquivo: UploadFile = File(...)):
    print('arquivo recebido!')
    #chama controller
    return await pdf_docx_controller(arquivo)

# pdf -> pptx
@app.post("/api/pdf-pptx")
async def converte_pdf_pptx(arquivo: UploadFile = File(...)):
    print('arquivo recebido!')
    #chama controller
    return await pdf_pptx_controller(arquivo)

# xlsx -> pdf
@app.post("/api/xlsx-pdf")
async def converte_xlsx_pdf(arquivo: UploadFile = File(...)):
    print('arquivo recebido!')
    #chama controller
    return await xlsx_pdf_controller(arquivo)

# pdf -> xlsx
@app.post("/api/pdf-xlsx")
async def converte_pdf_xlsx(arquivo: UploadFile = File(...)):
    print('arquivo recebido!')
    #chama controller
    return await pdf_xlsx_controller(arquivo)
