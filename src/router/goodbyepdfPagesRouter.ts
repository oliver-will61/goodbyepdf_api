import express from 'express'
import path from 'path'


const router = express.Router();

//index
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/html/index.html'))
})

router.get('/xlsx-json', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/public/html/xlsx/xlsxForJson.html'))
})

export default router


