import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 改為接收 generic 的 query_text (可以是店名，也可以是文案)
    const { query_text } = await req.json();

    const systemPrompt = `
    你是一個極度精準的餐廳資訊搜尋與數據提取助理。
    使用者會輸入「店鋪名稱」或「一段貼文文案」。
    請你運用你的即時聯網搜尋能力，找出這家店的詳細真實資訊。
    
    必須嚴格以 JSON 格式回傳，絕對不能包含任何額外的文字解釋。
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
    2. 如果根據輸入的店名真的在網路上找不到某個欄位，請填入空字串 ""。
    `;
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-reasoning", // 使用 Grok 的快速推理與搜尋模型
        messages: [
          { role: "system", content: systemPrompt }, 
          { role: "user", content: `請搜尋並分析此店鋪資訊: ${query_text}` }
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