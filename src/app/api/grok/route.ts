import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    const systemPrompt = `
    你是一個極度精準的社群媒體數據提取助理。
    請從包含「網址」與「貼文文案」的綜合文字中，提取出這家店/餐廳的相關資訊。
    
    必須嚴格以 JSON 格式回傳，絕對不能包含任何額外的文字解釋。
    回傳格式範例：
    {
      "country": "韓國", 
      "region": "首爾", 
      "storeName": "Cafe Layered", 
      "dishType": "咖啡廳/甜點",
      "address": "首爾特別市麻浦區延南洞223-20",
      "businessHours": "15:00-01:00(週一公休)"
    }
    
    推論規則：
    1. 國家與地區：若內文提到首爾/弘大，自動填入韓國/首爾。
    2. 地址 (address)：請盡可能找出實體地址。
    3. 營業時間 (businessHours)：找出營業時間及公休日。
    4. 若真的完全找不到某個欄位，請填入空字串 ""。
    `;
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
      'Authorization': `Bearer ${process.env.GROK_API_KEY}`,
      'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "grok-4-1-fast-reasoning",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `請分析此內容: ${url}` }],
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