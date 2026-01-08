import { NextRequest, NextResponse } from "next/server"
import { extractText } from "unpdf"

import mammoth from "mammoth"
import * as XLSX from "xlsx"

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        let text = ""

        if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
            const { text: pdfText } = await extractText(new Uint8Array(buffer))
            text = Array.isArray(pdfText) ? pdfText.join("\n") : pdfText
        } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || file.name.endsWith(".docx")) {
            const result = await mammoth.extractRawText({ buffer })
            text = result.value
        } else if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.name.endsWith(".csv")) {
            const workbook = XLSX.read(buffer, { type: "buffer" })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            text = XLSX.utils.sheet_to_csv(worksheet)
        } else {
            // Fallback for text files
            text = buffer.toString("utf-8")
        }

        return NextResponse.json({ text })
    } catch (error) {
        console.error("Extraction error:", error)
        return NextResponse.json({ error: "Failed to extract text from file" }, { status: 500 })
    }
}
