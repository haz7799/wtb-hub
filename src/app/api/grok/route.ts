import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 接收來自前端的店名、網址、國家、地區
    const { query_text, urls, country, region } = await req.json();

    const urlString = urls && urls.length > 0 ? urls.join('\n') : '無提供網址';

    const systemPrompt = `
    你是一個擁有強大多模態與聯網搜尋能力的超級助理。
    請根據使用者提供的「店名/關鍵字」、「國家/地區」或「網址」，進行聯網搜尋並提取詳細資訊。
    
    【你的任務】：
    1. 如果沒有網址，請直接使用「店名 + 國家 + 地區」進行精準聯網搜尋（例如搜尋：韓國 首爾 弘大 豬腳小姐）。
    2. 如果有提供網址，請輔助深入解析網址內容（影片、圖片、正文、留言）。
    3. 綜合所有資訊，嚴格以 JSON 格式回傳，絕對不能包含額外文字。
    
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
    
    // 組合給 AI 搜尋的精準上下文
    const userContent = `
    【關鍵字/店名】：${query_text || '未提供'}
    【指定國家】：${country || '未提供'}
    【指定地區】：${region || '未提供'}
    【參考網址 (選填)】：\n${urlString}
    `;
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-reasoning", 
        messages: [
          { role: "system", content: systemPrompt }, 
          { role: "user", content: userContent }
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