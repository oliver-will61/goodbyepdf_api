from dotenv import load_dotenv
import os
import uvicorn

#carrega constante de configuração
load_dotenv()


# verifica se o arquivo está sendo executado diretamente 
if __name__ == "__main__":
    uvicorn.run(
        #importa app de main.py
        "main:app",
        host= os.getenv("HOST", "0.0.0.0"),
        port= int(os.getenv("PORT", 5000)),
        reload= os.getenv("RELOAD"),
        log_level=os.getenv("LOG_LEVEL"),
        workers= int(os.getenv("WORKERS"))
    )