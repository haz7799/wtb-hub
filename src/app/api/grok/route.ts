import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query_text, urls } = await req.json();

    // 組合所有的參考網址
    const urlString = urls && urls.length > 0 ? urls.join('\n') : '無提供網址';

    const systemPrompt = `
    你是一個擁有強大多模態（視覺、影片解析、聯網）能力的超級助理。
    使用者會提供「一段文字或店名」以及「一個或多個網址（可能是 IG Reels、YouTube 影片、小紅書圖文或貼文）」。
    
    【你的任務】：
    請務必「深入讀取並解析」這些網址中的內容，包含：
    1. 影片畫面中的招牌或字幕
    2. 圖片中的文字與菜單
    3. 貼文正文
    4. 網友的留言與評價
    
    請綜合這些資訊，提取出這家店/景點/品牌的詳細真實資訊。必須嚴格以 JSON 格式回傳，絕對不能包含任何額外的文字解釋。
    
    回傳格式範例：
    {
      "country": "韓國", 
      "region": "首爾-江南/新沙洞", 
      "storeName": "Cafe Layered", 
      "dishType": "咖啡廳/甜點",
      "address": "首爾特別市麻浦區延南洞223-20",
      "businessHours": "15:00-01:00(週一公休)"
    }
    
    推論規則：
    1. 國家與地區：請盡量細分到商圈（例如：東京-新宿、首爾-弘大/延南洞、台北-信義區）。
    2. 如果根據輸入的店名與網址內容，真的完全找不到某個欄位，請填入空字串 ""。
    `;
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-reasoning", // 使用 Grok 的最新推理模型
        messages: [
          { role: "system", content: systemPrompt }, 
          { role: "user", content: `【使用者輸入的關鍵字/店名】：${query_text}\n\n【請解析以下網址內容 (影片/圖片/圖文)】：\n${urlString}` }
        ],
        temperature: 0.1
      })
    });

    const data = await response.json();
    const aiText = data.choices[0].message.content;
    const jsonString = aiText.slice(aiText.indexOf('{'), aiText.lastIndexOf('}') + 1);
    
    return NextResponse.json(JSON.parse(jsonString));
  } catch (error) {
    return NextResponse.json({ error: 'AI 解析失敗' }, { status: 500 });
  }
}