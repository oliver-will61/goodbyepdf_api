from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from controllers.xlsx_json_controller import xlsx_json_controller
from controllers.json_xlsx_controller import json_xlsx_controller

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


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
