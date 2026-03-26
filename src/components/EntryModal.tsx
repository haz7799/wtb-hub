'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { X, Plus, Image as ImageIcon, Link as LinkIcon, MapPin, Clock, ClipboardPaste } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase'; 

const LOCATION_DATA: Record<string, string[]> = {
  '韓國': ['首爾-弘大/延南洞', '首爾-明洞/乙支路', '首爾-江南/新沙洞', '首爾-聖水洞/建大', '首爾-漢南洞/梨泰院', '首爾-東大門/鐘路', '首爾-汝矣島', '釜山-海雲台/青沙浦', '釜山-西面/田浦', '釜山-廣安里', '釜山-南浦洞', '濟州島-市區', '濟州島-西歸浦', '大邱', '慶州'],
  '日本': ['東京-新宿', '東京-澀谷/原宿/表參道', '東京-池袋', '東京-銀座/東京車站', '東京-上野/淺草/秋葉原', '東京-下北澤/吉祥寺', '東京-六本木', '大阪-難波/心齋橋/道頓堀', '大阪-梅田', '大阪-天王寺', '京都-河原町/烏丸', '京都-祇園/清水寺', '北海道-札幌', '北海道-小樽', '福岡-博多/天神', '沖繩'],
  '台灣': ['台北-信義區', '台北-大安區', '台北-中山區', '台北-西門町/萬華', '台北-東區', '新北-板橋', '台中-西屯區', '台中-西區/勤美', '台南-中西區', '台南-安平區', '高雄-苓雅區', '高雄-左營/巨蛋'],
  '香港': ['香港島-中環/金鐘', '香港島-銅鑼灣/灣仔', '香港島-上環/西營盤', '九龍-尖沙咀/佐敦', '九龍-旺角/太子', '九龍-深水埗', '新界-沙田/大圍', '新界-荃灣']
};

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日'];

// 🌟 接收 currentTab 屬性來動態改變表單外觀
export default function EntryModal({ isOpen, onClose, editData = null, currentMainTab = '種草', currentSubTab = 'eat' }: { isOpen: boolean; onClose: () => void; editData?: any; currentMainTab?: string; currentSubTab?: string }) {
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [links, setLinks] = useState<string[]>(['']);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [dishType, setDishType] = useState<any>(null);
  
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<string>(''); 
  const [eventType, setEventType] = useState<string>(''); 
  
  const [isDetecting, setIsDetecting] = useState(false); 
  const [isSaving, setIsSaving] = useState(false); 

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 💡 動態決定表單的文字與選項
  let nameLabel = '店名 / 名稱';
  let categoryLabel = '類別 / 標籤';
  let defaultOptions = [{ value: 'cafe', label: '咖啡廳/甜點' }, { value: 'korean_bbq', label: '韓式烤肉/烤腸' }];
  
  if (currentSubTab === 'eat') { nameLabel = '餐廳 / 店名'; categoryLabel = '菜式 / 料理種類'; }
  else if (currentSubTab === 'go') { nameLabel = '景點 / 地標名稱'; categoryLabel = '景點類型 (如: 博物館, 展覽)'; defaultOptions = [{ value: 'museum', label: '博物館/美術館' }, { value: 'nature', label: '自然風景' }]; }
  else if (currentSubTab === 'buy') { nameLabel = '品牌 / 商店名稱'; categoryLabel = '商品種類 (如: 服飾, 美妝)'; defaultOptions = [{ value: 'fashion', label: '服飾/穿搭' }, { value: 'beauty', label: '美妝/保養' }]; }
  else if (currentMainTab === '行事曆') { nameLabel = '待辦事項 / 行程名稱'; categoryLabel = '事項類別'; defaultOptions = [{ value: 'flight', label: '航班/交通' }, { value: 'hotel', label: '飯店住宿' }]; }

  useEffect(() => {
    if (editData && isOpen) {
      setStoreName(editData.title || '');
      setAddress(editData.address || '');
      setBusinessHours(editData.businessHours || '');
      setClosedDays(editData.tags?.closedDays || []);
      setRecommendation(editData.tags?.recommendation || '');
      setEventType(editData.tags?.eventType || '');
      
      if (editData.tags?.country) setSelectedCountry({ value: editData.tags.country, label: editData.tags.country });
      if (editData.tags?.region) setSelectedRegion({ value: editData.tags.region, label: editData.tags.region });
      if (editData.tags?.dishType) setDishType({ value: editData.tags.dishType, label: editData.tags.dishType });
      if (editData.links?.length > 0) setLinks(editData.links);
      if (editData.images?.length > 0) setPreviewImage(editData.images[0]);
    } else if (isOpen) {
      setStoreName(''); setAddress(''); setBusinessHours(''); setClosedDays([]); setRecommendation(''); setEventType('');
      setSelectedCountry(null); setSelectedRegion(null); setDishType(null); setLinks(['']); setPreviewImage(null); setImageFile(null);
    }
  }, [editData, isOpen]);

  const customStyles = {
    control: (base: any, state: any) => ({ ...base, borderColor: state.isFocused ? '#F3E0E2' : '#e5e7eb', boxShadow: state.isFocused ? '0 0 0 1px #F3E0E2' : 'none', borderRadius: '0.75rem', padding: '2px', '&:hover': { borderColor: '#F3E0E2' } }),
    option: (base: any, state: any) => ({ ...base, backgroundColor: state.isSelected ? '#D1D9E6' : state.isFocused ? '#F9F7F7' : 'white', color: '#585C64', '&:active': { backgroundColor: '#F3E0E2' } })
  };

  const handleAddLink = () => setLinks([...links, '']);
  const handleLinkChange = (index: number, value: string) => { const newLinks = [...links]; newLinks[index] = value; setLinks(newLinks); };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setPreviewImage(URL.createObjectURL(file)); }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) { e.preventDefault(); setImageFile(file); setPreviewImage(URL.createObjectURL(file)); }
      }
    }
  };

  const handleClipboardRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const clipboardItem of clipboardItems) {
        const imageTypes = clipboardItem.types.filter(type => type.startsWith('image/'));
        if (imageTypes.length > 0) {
          const blob = await clipboardItem.getType(imageTypes[0]);
          const file = new File([blob], "pasted-image.png", { type: blob.type });
          setImageFile(file); setPreviewImage(URL.createObjectURL(file)); return;
        }
      }
      alert("剪貼簿裡沒有圖片唷！");
    } catch (err) { alert("無法讀取剪貼簿。請直接點擊大框框從相簿選擇圖片上傳 📱"); }
  };

  const toggleClosedDay = (day: string) => setClosedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  // 🌟 強大的全網 AI 讀取 (將網址和店名一起送出)
  const handleAISearch = async () => {
    const validLinks = links.filter(l => l.trim() !== '');
    if (!storeName && validLinks.length === 0) return alert("請輸入「名稱」或在下方「貼上網址」，AI 才能去幫你找資料唷！🩰");
    
    setIsDetecting(true);
    try {
      const res = await fetch('/api/grok', { 
        method: 'POST', 
        body: JSON.stringify({ query_text: storeName, urls: validLinks }), 
        headers: { 'Content-Type': 'application/json' } 
      });
      const data = await res.json();
      
      if (data.storeName && !storeName) setStoreName(data.storeName);
      if (data.country) setSelectedCountry({ value: data.country, label: data.country });
      if (data.region) setSelectedRegion({ value: data.region, label: data.region });
      if (data.address) setAddress(data.address);
      if (data.businessHours) setBusinessHours(data.businessHours);
      if (data.dishType) setDishType({ value: data.dishType, label: data.dishType });
    } catch (error) {
      alert("哎呀！魔法失靈了，請確認網址是否有效。");
    } finally { setIsDetecting(false); }
  };

  const handleSave = async () => {
    if (!storeName) return alert(`請輸入${nameLabel}！🩰`);
    setIsSaving(true);
    try {
      let uploadedImageUrl = previewImage;
      if (imageFile) {
        const storageRef = ref(storage, `images/${Date.now()}_${imageFile.name || 'image.png'}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        uploadedImageUrl = await getDownloadURL(snapshot.ref);
      }

      // 取得當前要存入的 type 和 category
      const targetType = currentMainTab === '種草' ? 'want' : (currentMainTab === '拔草' ? 'done' : (currentMainTab === '行事曆' ? 'calendar' : 'want'));
      const targetCategory = currentSubTab;

      const entryData = {
        title: storeName,
        address: address,
        businessHours: businessHours,
        images: uploadedImageUrl && !uploadedImageUrl.startsWith('blob:') ? [uploadedImageUrl] : (uploadedImageUrl ? [uploadedImageUrl] : []), 
        tags: { 
          country: selectedCountry?.value || '', 
          region: selectedRegion?.value || '', 
          dishType: dishType?.value || '',
          closedDays: closedDays,
          recommendation: recommendation,
          eventType: eventType 
        },
        links: links.filter(link => link.trim() !== ''),
        ...(editData ? {} : { type: targetType, category: targetCategory, createdAt: serverTimestamp() })
      };

      if (editData) await updateDoc(doc(db, 'entries', editData.id), entryData);
      else await addDoc(collection(db, 'entries'), entryData);
      onClose();
    } catch (error) {
      alert("儲存失敗了，請檢查網路。");
    } finally { setIsSaving(false); }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
        <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} onPaste={handlePaste} tabIndex={-1} className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 h-[85vh] sm:h-[80vh] overflow-y-auto shadow-soft flex flex-col outline-none">
          <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          
          <div className="flex justify-between items-center mb-6 shrink-0">
            <h2 className="text-xl font-bold text-[#FFB6C1] flex items-center">{editData ? '✏️ 編輯紀錄' : '✨ 新增紀錄'}</h2>
            <button onClick={onClose} className="p-2 bg-gray-50 rounded-full text-gray-400 hover:bg-[#F3E0E2] hover:text-white transition-colors"><X size={20} /></button>
          </div>
          
          <div className="space-y-4 flex-1">
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[#D1D9E6] rounded-2xl h-40 flex flex-col items-center justify-center text-gray-400 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors relative overflow-hidden shrink-0 group">
              {previewImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <><ImageIcon size={32} className="mb-2 text-[#D1D9E6]" /><p className="text-sm text-center font-bold">點擊從手機相簿上傳圖片</p><button onClick={handleClipboardRead} className="mt-3 bg-white border border-gray-200 shadow-sm text-gray-600 px-4 py-2 rounded-full text-xs font-bold flex items-center hover:bg-pink-50 hover:text-pink-500 hover:border-pink-200 transition z-10"><ClipboardPaste size={14} className="mr-1.5" /> 貼上剪貼簿圖片</button></>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-medium text-gray-500">{nameLabel}</label>
                <button type="button" onClick={handleAISearch} disabled={isDetecting} className={`flex items-center text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${isDetecting ? 'bg-gray-100 text-gray-400' : 'bg-pink-100 text-pink-500 hover:bg-pink-200 shadow-sm'}`}>
                  {isDetecting ? '✨ 解析網址與搜尋中...' : '✨ AI 全網讀取填入'}
                </button>
              </div>
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#F3E0E2] focus:ring-1 focus:ring-[#F3E0E2] transition-all" placeholder={`輸入${nameLabel} ...`} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">國家</label>
                <Select options={Object.keys(LOCATION_DATA).map(c => ({ value: c, label: c }))} styles={customStyles} placeholder="選擇" value={selectedCountry} onChange={(option) => { setSelectedCountry(option); setSelectedRegion(null); }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">詳細地區</label>
                <Select options={selectedCountry ? LOCATION_DATA[selectedCountry.value].map(r => ({ value: r, label: r })) : []} styles={customStyles} value={selectedRegion} onChange={setSelectedRegion} placeholder="選擇" isDisabled={!selectedCountry} />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">地址 (可選)</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 pl-9 text-sm focus:outline-none focus:border-[#F3E0E2] transition-all" placeholder="輸入地址..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">營業時間</label>
                <div className="relative">
                  <Clock size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input type="text" value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 pl-9 text-sm focus:outline-none focus:border-[#F3E0E2] transition-all" placeholder="10:00-20:00" />
                </div>
              </div>
            </div>

            {/* 隱藏不相關的選項 (例如想買衣服時不顯示公休日) */}
            {currentSubTab === 'eat' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">公休日 (可多選)</label>
                <div className="flex justify-between bg-gray-50 p-1.5 rounded-xl">
                  {WEEK_DAYS.map(day => (
                    <button key={day} type="button" onClick={() => toggleClosedDay(day)} className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-xs font-bold transition-all ${closedDays.includes(day) ? 'bg-red-400 text-white shadow-md scale-105' : 'bg-transparent text-gray-400 hover:bg-gray-200'}`}>
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{categoryLabel}</label>
              <CreatableSelect isClearable options={defaultOptions} styles={customStyles} value={dishType} onChange={setDishType} placeholder="搜尋或輸入..." formatCreateLabel={(v) => `新增 "${v}"`} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {currentMainTab === '拔草' && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">拔草評價</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    <button type="button" onClick={() => setRecommendation(recommendation === 'recommend' ? '' : 'recommend')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${recommendation === 'recommend' ? 'bg-pink-100 text-pink-500 shadow-sm' : 'text-gray-400'}`}>👍 推薦</button>
                    <button type="button" onClick={() => setRecommendation(recommendation === 'not_recommend' ? '' : 'not_recommend')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${recommendation === 'not_recommend' ? 'bg-gray-200 text-gray-500 shadow-sm' : 'text-gray-400'}`}>🙅 不推</button>
                  </div>
                </div>
              )}
              {currentMainTab === '行事曆' && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">行事曆分類</label>
                  <div className="flex bg-gray-50 p-1 rounded-xl">
                    <button type="button" onClick={() => setEventType(eventType === 'personal' ? '' : 'personal')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${eventType === 'personal' ? 'bg-blue-100 text-blue-500 shadow-sm' : 'text-gray-400'}`}>🙋 個人</button>
                    <button type="button" onClick={() => setEventType(eventType === 'company' ? '' : 'company')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${eventType === 'company' ? 'bg-orange-100 text-orange-500 shadow-sm' : 'text-gray-400'}`}>🏢 公司</button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-gray-500">貼文連結 / 影片網址 (必填以供 AI 解析)</label>
                <button type="button" onClick={handleAddLink} className="text-[#D1D9E6] hover:text-[#F3E0E2] flex items-center text-xs transition-colors"><Plus size={14} className="mr-1" /> 新增</button>
              </div>
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <LinkIcon size={16} className="text-gray-400 shrink-0" />
                    <input type="text" value={link} onChange={(e) => handleLinkChange(index, e.target.value)} className="flex-1 border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-[#D1D9E6]" placeholder="貼上 IG / 小紅書 / YouTube 連結" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-4 mt-4 border-t border-gray-100 shrink-0">
            <button onClick={handleSave} disabled={isSaving} className={`w-full font-bold py-3.5 rounded-xl shadow-sm transition-colors ${isSaving ? 'bg-gray-200 text-gray-500' : 'bg-[#F3E0E2] text-[#585C64] hover:bg-pink-200'}`}>
              {isSaving ? '儲存中... ☁️' : (editData ? '更新紀錄' : '儲存紀錄')}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}