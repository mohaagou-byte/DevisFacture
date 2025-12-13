import { GoogleGenAI, Type } from "@google/genai";
import { DocumentData, DocType, DocStatus, CompanyProfile } from '../types';

// Helper to compress/resize image to avoid payload limits and timeouts
export const compressImage = (base64Str: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      // Reduce dimensions and quality to ensure small payload size (< 1MB)
      // High-resolution phone photos can be 10MB+, causing XHR failures.
      const maxWidth = 800; 
      const quality = 0.6; 
      
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions keeping aspect ratio
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str); // Fallback to original if context fails
        return;
      }
      
      // White background (for transparent PNGs converted to JPEG)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str); // Fallback on error
  });
};

export const analyzeCompanyDocument = async (base64Image: string): Promise<Partial<CompanyProfile>> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key not found.");

    const compressedImage = await compressImage(base64Image);
    const cleanBase64 = compressedImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Analyze this image of a business card, RC document, or letterhead.
      Extract the company details accurately.
      Return fields: name, address, phone, email, ice, rc, if_tax, patente, bankName, rib.
      If a field is missing, return empty string.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: cleanBase64 } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            address: { type: Type.STRING },
            phone: { type: Type.STRING },
            email: { type: Type.STRING },
            ice: { type: Type.STRING },
            rc: { type: Type.STRING },
            if_tax: { type: Type.STRING },
            patente: { type: Type.STRING },
            bankName: { type: Type.STRING },
            rib: { type: Type.STRING },
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);

  } catch (error) {
    console.error("Company OCR Error:", error);
    throw error;
  }
};

export const analyzeDocumentImage = async (base64Image: string): Promise<Partial<DocumentData>> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found. Please set REACT_APP_GEMINI_API_KEY or allow usage.");
    }

    // Compress image before sending to avoid XHR size errors
    const compressedImage = await compressImage(base64Image);
    const cleanBase64 = compressedImage.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      You are an expert data extraction assistant. Analyze this handwritten business document (Quote/Devis) and extract structured data.
      
      **OBJECTIVE:** Extract line items accurately, distinguishing between **dimensions** (like 60x50) and **quantity/price** calculations.

      **LOGIC FOR ITEMS:**
      For each line found:
      1. Identify the **Description**, any **Numbers**, and the **Line Total**.
      2. **Detect Quantity (Qty) vs Dimensions:**
         - If text contains explicit unit keywords like "sacs", "kit", "pcs", "u", "ensemble", the number adjacent is the **Quantity**.
         - If text contains numbers separated by "x" (e.g., "60x50", "60x170") and NO unit keyword, these are likely **Dimensions**. Keep them in the **Designation**.
         - **Calculation Check:** If you see "A x B = C" or "A : C" where A*B ≈ C:
            - If A is a small integer (e.g., 40 sacs) and B is a price, then Qty=A, UnitPrice=B.
            - If A and B look like dimensions (e.g., "Décapage 60x50 : 3000" where 60*50=3000), consider context. "Décapage" is usually surface. If uncertain, prefer keeping "60x50" in Designation and set Qty=1, UnitPrice=Total.
      
      **SPECIFIC EXAMPLES FROM THIS DOCUMENT TYPE:**
      - "Décapage 60x50 : 3000" -> Designation: "Décapage 60x50", Qty: 1, Price: 3000. (Even though 60*50=3000, 60x50 are dimensions).
      - "Carreaux 60x170 = 10500" -> Designation: "Carreaux 60x170", Qty: 1, Price: 10500.
      - "Colle 40 sacs x 50 : 2000" -> Designation: "Colle sacs", Qty: 40, Price: 50, Total: 2000.
      - "Kit de fixation 20 x 50 : 1000" -> Designation: "Kit de fixation", Qty: 20, Price: 50, Total: 1000.

      **METADATA EXTRACTION:**
      - Look for Client Name (e.g., "JAWHARA"), Date, Document Type.
      - Look for contact details: Phone numbers, Email addresses within the document header/footer or client section.
      - Look for "Surface" indications to put in the "Object" or "Notes".

      Return pure JSON.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING, enum: ["DEVIS", "FACTURE"] },
            number: { type: Type.STRING },
            date: { type: Type.STRING },
            clientName: { type: Type.STRING },
            clientAddress: { type: Type.STRING },
            clientIce: { type: Type.STRING },
            clientEmail: { type: Type.STRING },
            clientPhone: { type: Type.STRING },
            object: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  designation: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                  total: { type: Type.NUMBER },
                  isSectionHeader: { type: Type.BOOLEAN }
                }
              }
            },
            subTotal: { type: Type.NUMBER },
            vatRate: { type: Type.NUMBER },
            totalTTC: { type: Type.NUMBER },
            currency: { type: Type.STRING }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);

    // Map to our internal structure with IDs
    const items = data.items?.map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      isTotalOverridden: false 
    })) || [];

    return {
      type: data.type as DocType || DocType.DEVIS,
      number: data.number || "",
      date: data.date || new Date().toISOString().split('T')[0],
      status: DocStatus.DRAFT,
      template: 'classic',
      clientName: data.clientName || "",
      clientAddress: data.clientAddress || "",
      clientIce: data.clientIce || "",
      clientEmail: data.clientEmail || "",
      clientPhone: data.clientPhone || "",
      object: data.object || "",
      items: items,
      subTotal: data.subTotal || 0,
      hasVat: false, 
      vatRate: data.vatRate || 20,
      totalTTC: data.totalTTC || 0,
      hasDeposit: true,
      depositPercentage: 50,
      depositAmount: 0,
      currency: 'DH' // Default
    };

  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};