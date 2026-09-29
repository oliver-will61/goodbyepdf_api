from fastapi import FastAPI, UploadFile, File
from controllers.xlsx_json_controller import xlsx_json_controller
from controllers.json_xlsx_controller import json_xlsx_controller

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
