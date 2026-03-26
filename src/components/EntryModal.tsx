'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { X, Plus, Image as ImageIcon, Link as LinkIcon, MapPin, Clock } from 'lucide-react';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase'; 

const LOCATION_DATA: Record<string, string[]> = {
  '韓國': ['首爾', '釜山', '濟州島', '大邱'],
  '日本': ['東京', '大阪', '京都', '北海道'],
  '台灣': ['台北', '台中', '台南', '高雄'],
};

const DISH_OPTIONS = [
  { value: 'cafe', label: '咖啡廳/甜點' },
  { value: 'korean', label: '韓式烤肉' },
  { value: 'omakase', label: '日式無菜單' },
];

const WEEK_DAYS = ['一', '二', '三', '四', '五', '六', '日'];

export default function EntryModal({ isOpen, onClose, editData = null }: { isOpen: boolean; onClose: () => void; editData?: any }) {
  const [selectedCountry, setSelectedCountry] = useState<any>(null);
  const [selectedRegion, setSelectedRegion] = useState<any>(null);
  const [links, setLinks] = useState<string[]>(['']);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [businessHours, setBusinessHours] = useState('');
  const [dishType, setDishType] = useState<any>(null);
  
  // 🌟 新增的進階標籤 State
  const [closedDays, setClosedDays] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<string>(''); // 'recommend' | 'not_recommend'
  const [eventType, setEventType] = useState<string>(''); // 'personal' | 'company'
  
  const [isDetecting, setIsDetecting] = useState(false); 
  const [isSaving, setIsSaving] = useState(false); 

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const toggleClosedDay = (day: string) => {
    setClosedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleAIDetect = async () => {
    if (!links[0]) return alert("請先貼上文案或連結！🩰");
    setIsDetecting(true);
    try {
      const res = await fetch('/api/grok', { method: 'POST', body: JSON.stringify({ url: links[0] }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.country) setSelectedCountry({ value: data.country, label: data.country });
      if (data.region) setSelectedRegion({ value: data.region, label: data.region });
      if (data.storeName) setStoreName(data.storeName);
      if (data.address) setAddress(data.address);
      if (data.businessHours) setBusinessHours(data.businessHours);
      if (data.dishType) setDishType({ value: data.dishType, label: data.dishType });
    } catch (error) {
      alert("魔法失靈了，請手動輸入。");
    } finally { setIsDetecting(false); }
  };

  const handleSave = async () => {
    if (!storeName) return alert("請輸入店名！🩰");
    setIsSaving(true);
    try {
      let uploadedImageUrl = previewImage;
      if (imageFile) {
        const storageRef = ref(storage, `images/${Date.now()}_${imageFile.name || 'image.png'}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        uploadedImageUrl = await getDownloadURL(snapshot.ref);
      }

      const entryData = {
        title: storeName,
        address: address,
        businessHours: businessHours,
        images: uploadedImageUrl && !uploadedImageUrl.startsWith('blob:') ? [uploadedImageUrl] : (uploadedImageUrl ? [uploadedImageUrl] : []), 
        tags: { 
          country: selectedCountry?.value || '', 
          region: selectedRegion?.value || '', 
          dishType: dishType?.value || '',
          closedDays: closedDays, // 👈 存入公休日
          recommendation: recommendation, // 👈 存入推薦狀態
          eventType: eventType // 👈 存入行事曆分類
        },
        links: links.filter(link => link.trim() !== ''),
        ...(editData ? {} : { type: 'want', category: 'eat', createdAt: serverTimestamp() })
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
            <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[#D1D9E6] rounded-2xl h-40 flex flex-col items-center justify-center text-gray-400 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors relative overflow-hidden shrink-0">
              {previewImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <><ImageIcon size={32} className="mb-2 text-[#D1D9E6]" /><p className="text-sm text-center">點擊選擇圖片 <br /><span className="text-xs text-gray-400">(或 Ctrl+V 貼上)</span></p></>
              )}
            </div>

            {/* 進階分類 (評價與行事曆) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">拔草評價</label>
                <div className="flex bg-gray-50 p-1 rounded-xl">
                  <button type="button" onClick={() => setRecommendation(recommendation === 'recommend' ? '' : 'recommend')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${recommendation === 'recommend' ? 'bg-pink-100 text-pink-500 shadow-sm' : 'text-gray-400'}`}>👍 推薦</button>
                  <button type="button" onClick={() => setRecommendation(recommendation === 'not_recommend' ? '' : 'not_recommend')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${recommendation === 'not_recommend' ? 'bg-gray-200 text-gray-500 shadow-sm' : 'text-gray-400'}`}>🙅 不推</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">行事曆分類</label>
                <div className="flex bg-gray-50 p-1 rounded-xl">
                  <button type="button" onClick={() => setEventType(eventType === 'personal' ? '' : 'personal')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${eventType === 'personal' ? 'bg-blue-100 text-blue-500 shadow-sm' : 'text-gray-400'}`}>🙋 個人</button>
                  <button type="button" onClick={() => setEventType(eventType === 'company' ? '' : 'company')} className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${eventType === 'company' ? 'bg-orange-100 text-orange-500 shadow-sm' : 'text-gray-400'}`}>🏢 公司</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">國家</label>
                <Select options={Object.keys(LOCATION_DATA).map(c => ({ value: c, label: c }))} styles={customStyles} placeholder="選擇" value={selectedCountry} onChange={(option) => { setSelectedCountry(option); setSelectedRegion(null); }} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">地區</label>
                <Select options={selectedCountry ? LOCATION_DATA[selectedCountry.value].map(r => ({ value: r, label: r })) : []} styles={customStyles} value={selectedRegion} onChange={setSelectedRegion} placeholder="選擇" isDisabled={!selectedCountry} />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">店名 / 餐廳名 / 事項</label>
              <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-[#F3E0E2] focus:ring-1 focus:ring-[#F3E0E2] transition-all" placeholder="輸入名稱..." />
            </div>

            {/* 公休日 Tick Boxes */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">公休日 (可多選)</label>
              <div className="flex justify-between bg-gray-50 p-1.5 rounded-xl">
                {WEEK_DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleClosedDay(day)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-xs font-bold transition-all ${closedDays.includes(day) ? 'bg-red-400 text-white shadow-md scale-105' : 'bg-transparent text-gray-400 hover:bg-gray-200'}`}
                  >
                    {day}
                  </button>
                ))}
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

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">菜式 / 類別</label>
              <CreatableSelect isClearable options={DISH_OPTIONS} styles={customStyles} value={dishType} onChange={setDishType} placeholder="搜尋或輸入..." formatCreateLabel={(v) => `新增 "${v}"`} />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-gray-500">參考連結 / 文案 (選填)</label>
                <button type="button" onClick={handleAddLink} className="text-[#D1D9E6] hover:text-[#F3E0E2] flex items-center text-xs transition-colors"><Plus size={14} className="mr-1" /> 新增</button>
              </div>
              <div className="space-y-2">
                {links.map((link, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <LinkIcon size={16} className="text-gray-400 shrink-0" />
                    <input type="text" value={link} onChange={(e) => handleLinkChange(index, e.target.value)} className="flex-1 border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:border-[#D1D9E6]" placeholder="貼上文案或網址" />
                    {index === 0 && (
                      <button type="button" onClick={handleAIDetect} disabled={isDetecting} className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${isDetecting ? 'bg-gray-100 text-gray-400' : 'bg-[#F3E0E2] text-[#585C64] hover:bg-pink-300 hover:text-white shadow-sm'}`}>
                        {isDetecting ? '✨ 解析中...' : '✨ 自動填寫'}
                      </button>
                    )}
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