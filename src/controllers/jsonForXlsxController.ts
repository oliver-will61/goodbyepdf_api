import { FactoryController } from "../models/FactoryController"
import { Arquivo } from "../models/Arquivo"
import {EndPointsAPI} from "../constants/endpoinsApi"

export const jsonForXlsxController = FactoryController.createController(
    Arquivo.TIPOS.json, EndPointsAPI.JSON_XLSX
)
    