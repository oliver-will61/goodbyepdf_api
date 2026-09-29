import { Controller } from "../models/Controller"
import { Arquivo } from "../models/Arquivo"
import {EndPointsAPI} from "../constants/endpoinsApi"

export const jsonForXlsxController = new Controller(Arquivo.TIPOS.json, EndPointsAPI.JSON_XLSX)
export const xlsxForJsonController = new Controller(Arquivo.TIPOS.excel, EndPointsAPI.EXCEL_JSON)
    