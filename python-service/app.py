from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from controllers.xlsx_json_controller import xlsx_json_controller
from dotenv import load_dotenv
import os
import uvicorn

#carrega constante de configuração
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/xlsx-json")
async def processaArquivo(arquivo: UploadFile = File(...)):
    print('arquivo recebido!')
    #chama controller
    return await xlsx_json_controller(arquivo)

if __name__ == "__main__":
    uvicorn.run(
        "__main__:app",
        host= os.getenv("HOST", "0.0.0.0"),
        port= int(os.getenv("PORT", 5000)),
        reload= os.getenv("RELOAD", "false").lower() == "true"
    )