// src/app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, CheckSquare, Calendar as CalendarIcon, Settings, Plus, MapPin, X, ExternalLink, Trash2, Edit3, Clock, Search, ThumbsUp, ThumbsDown, Bell, ChevronRight, Filter, Star, Share2, ChevronLeft, Send } from 'lucide-react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EntryModal from '@/components/EntryModal';

const MAIN_TABS = [
  { id: '種草', icon: Heart, type: 'want' }, 
  { id: '拔草', icon: CheckSquare, type: 'done' },
  { id: '行程曆', icon: CalendarIcon, type: 'calendar' },
  { id: '設定', icon: Settings, type: 'settings' }
];

const SUB_TABS = {
  '種草': [{ label: '想吃', value: 'eat' }, { label: '想去', value: 'go' }, { label: '想買', value: 'buy' }],
  '拔草': [{ label: '已吃', value: 'eat' }, { label: '已去', value: 'go' }, { label: '已買', value: 'buy' }],
  '行程曆': [{ label: '我的行程', value: 'trip' }],
  '設定': [{ label: '個人資訊', value: 'profile' }, { label: '系統設定', value: 'system' }]
};

type FlightData = {
  flightNo: string;
  depAir: string;
  arrAir: string;
  depTime: string;
  arrTime: string;
};

export default function Home() {
  const [activeMainTab, setActiveMainTab] = useState(MAIN_TABS[0]);
  const [activeSubTab, setActiveSubTab] = useState(SUB_TABS['種草'][0]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedFilterCountry, setSelectedFilterCountry] = useState('');
  const [selectedFilterRegion, setSelectedFilterRegion] = useState('');
  const [selectedFilterDish, setSelectedFilterDish] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [editEntry, setEditEntry] = useState<any | null>(null);

  const [tripData, setTripData] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  const [isEditingTrip, setIsEditingTrip] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const [tripForm, setTripForm] = useState({ 
    name: '', startDate: '', endDate: '', 
    flights: [] as FlightData[], 
    hotels: [] as string[] 
  });
  
  const [newTask, setNewTask] = useState({ time: '10:00', task: '', type: '景點', link: '' });
  
  const [addingToTripEntry, setAddingToTripEntry] = useState<any | null>(null);
  const [addToTripDate, setAddToTripDate] = useState('');
  const [addToTripTime, setAddToTripTime] = useState('12:00');

  useEffect(() => {
    const q = query(collection(db, 'entries'));
    const unsubscribeEntries = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setEntries(data);
      setIsLoading(false);
    });

    const unsubscribeTrip = onSnapshot(doc(db, 'appData', 'currentTrip'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().settings) {
        setTripData(docSnap.data());
      } else {
        setTripData(null);
      }
    });

    return () => { unsubscribeEntries(); unsubscribeTrip(); };
  }, []);

  const availableCountries = Array.from(new Set(entries.map(e => e.tags?.country).filter(Boolean)));
  const availableRegions = Array.from(new Set(entries.map(e => e.tags?.region).filter(Boolean)));
  const availableDishTypes = Array.from(new Set(entries.map(e => e.tags?.dishType).filter(Boolean)));

  const handleMainTabChange = (tab: any) => {
    setActiveMainTab(tab);
    setActiveSubTab(SUB_TABS[tab.id as keyof typeof SUB_TABS][0]);
    setActiveFilter('all');
    setSearchQuery(''); setSelectedFilterCountry(''); setSelectedFilterRegion(''); setSelectedFilterDish('');
    setSelectedDate(null);
    setIsEditingTrip(false);
  };

  const filteredEntries = entries.filter(entry => {
    if (activeMainTab.id === '設定' || activeMainTab.id === '行程曆') return false;
    const isTabMatch = entry.type === activeMainTab.type && entry.category === activeSubTab.value;
    if (!isTabMatch) return false;
    
    if (activeFilter !== 'all' && activeMainTab.id === '拔草' && entry.tags?.recommendation !== activeFilter) return false;
    if (selectedFilterCountry && entry.tags?.country !== selectedFilterCountry) return false;
    if (selectedFilterRegion && entry.tags?.region !== selectedFilterRegion) return false;
    if (selectedFilterDish && entry.tags?.dishType !== selectedFilterDish) return false;

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      return (
        entry.title?.toLowerCase().includes(lowerQuery) ||
        entry.address?.toLowerCase().includes(lowerQuery) ||
        entry.tags?.country?.toLowerCase().includes(lowerQuery) ||
        entry.tags?.region?.toLowerCase().includes(lowerQuery) ||
        entry.tags?.dishType?.toLowerCase().includes(lowerQuery)
      );
    }
    return true;
  });

  const handleDelete = async (id: string) => {
    if (confirm("確定要刪除這筆紀錄嗎？🗑️")) {
      await deleteDoc(doc(db, 'entries', id));
      setSelectedEntry(null); 
    }
  };

  const handleEdit = (entry: any) => { setEditEntry(entry); setSelectedEntry(null); setIsModalOpen(true); };

  const handleToggleStatus = async (e: React.MouseEvent, item: any) => {
    e.stopPropagation(); 
    const isCurrentlyWant = item.type === 'want';
    const newType = isCurrentlyWant ? 'done' : 'want';
    const actionName = isCurrentlyWant ? '拔草成功' : '重新種草';
    if (confirm(`確定要將這筆紀錄標記為「${actionName}」嗎？✨`)) {
      await updateDoc(doc(db, 'entries', item.id), { type: newType });
    }
  };

  const openEditTrip = () => {
    setTripForm({
      name: tripData.settings.name,
      startDate: tripData.settings.startDate,
      endDate: tripData.settings.endDate,
      flights: tripData.settings.flights || [],
      hotels: tripData.settings.hotels || []
    });
    setIsEditingTrip(true);
  };

  const saveTripSettings = async () => {
    if (!tripForm.name || !tripForm.startDate || !tripForm.endDate) return alert("請填寫行程名稱與日期！");
    await setDoc(doc(db, 'appData', 'currentTrip'), { settings: tripForm, schedule: tripData?.schedule || {} }, { merge: true });
    setIsEditingTrip(false);
  };

  const getDaysArray = () => {
    if (!tripData?.settings?.startDate || !tripData?.settings?.endDate) return [];
    let dates = [];
    let currDate = new Date(tripData.settings.startDate);
    let endDate = new Date(tripData.settings.endDate);
    while (currDate <= endDate) {
      dates.push(currDate.toISOString().split('T')[0]);
      currDate.setDate(currDate.getDate() + 1);
    }
    return dates;
  };

  const saveTask = async () => {
    if (!newTask.task || !selectedDate) return;
    const dayTasks = tripData?.schedule?.[selectedDate] || [];
    const updatedTasks = [...dayTasks, { id: Date.now(), ...newTask }].sort((a, b) => a.time.localeCompare(b.time));
    await setDoc(doc(db, 'appData', 'currentTrip'), { schedule: { ...tripData.schedule, [selectedDate]: updatedTasks } }, { merge: true });
    setNewTask({ time: '10:00', task: '', type: '景點', link: '' });
  };

  const deleteTask = async (taskId: number) => {
    const updatedTasks = tripData.schedule[selectedDate!].filter((t: any) => t.id !== taskId);
    await setDoc(doc(db, 'appData', 'currentTrip'), { schedule: { ...tripData.schedule, [selectedDate!]: updatedTasks } }, { merge: true });
  };

  // 🌟 自動辨識國家並決定地圖搜尋引擎
  const confirmAddToTrip = async () => {
    if (!addToTripDate || !addingToTripEntry) return alert("請選擇日期！");
    const dayTasks = tripData?.schedule?.[addToTripDate] || [];
    
    const isKorea = addingToTripEntry.tags?.country === '韓國';
    const mapQuery = encodeURIComponent(addingToTripEntry.address || addingToTripEntry.title || '');
    
    // 依據國家分流地圖引擎
    const fallbackLink = isKorea 
      ? `https://map.naver.com/v5/search/${mapQuery}` 
      : `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
      
    const defaultLink = addingToTripEntry.links?.[0] || fallbackLink;
    const targetType = addingToTripEntry.category === 'eat' ? '餐飲' : (addingToTripEntry.category === 'go' ? '景點' : '購物');

    const newTaskData = {
      id: Date.now(),
      time: addToTripTime,
      task: addingToTripEntry.title,
      type: targetType,
      link: defaultLink
    };

    const updatedTasks = [...dayTasks, newTaskData].sort((a, b) => a.time.localeCompare(b.time));
    await setDoc(doc(db, 'appData', 'currentTrip'), { schedule: { ...tripData.schedule, [addToTripDate]: updatedTasks } }, { merge: true });
    
    alert(`✅ 已將「${addingToTripEntry.title}」加入 ${addToTripDate} 的行程！`);
    setAddingToTripEntry(null);
    if (selectedEntry) setSelectedEntry(null); 
  };

  const shareTripAsImage = async () => {
    if (!tripData?.settings) return;
    setIsGeneratingImage(true);

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 800;

      let contentHeight = 140; 
      
      if (tripData.settings.flights?.length) contentHeight += 60 + tripData.settings.flights.length * 40;
      if (tripData.settings.hotels?.length) contentHeight += 60 + tripData.settings.hotels.length * 40;

      contentHeight += 60; 
      const days = getDaysArray();
      days.forEach(date => {
        contentHeight += 50; 
        const tasks = tripData.schedule?.[date] || [];
        if (tasks.length === 0) contentHeight += 40;
        else contentHeight += tasks.length * 40;
      });
      contentHeight += 80; 

      canvas.height = contentHeight;

      ctx.fillStyle = '#F9F7F7';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#FFB6C1';
      ctx.fillRect(0, 0, canvas.width, 16);

      let y = 80;
      
      ctx.fillStyle = '#585C64';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`✈️ ${tripData.settings.name}`, canvas.width / 2, y);

      y += 40;
      ctx.fillStyle = '#9CA3AF';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(`🗓️ ${tripData.settings.startDate} ~ ${tripData.settings.endDate}`, canvas.width / 2, y);

      ctx.textAlign = 'left';
      y += 60;

      if (tripData.settings.flights?.length > 0) {
        ctx.fillStyle = '#60A5FA';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('🛫 航班資訊', 60, y);
        y += 40;
        ctx.fillStyle = '#6B7280';
        ctx.font = '20px monospace';
        tripData.settings.flights.forEach((f: any, i: number) => {
          const fNo = f.flightNo ? `[${f.flightNo}] ` : '';
          const text = `(${i+1}) ${fNo}${f.depAir} (${f.depTime?.split('T')[1] || '待定'}) ➔ ${f.arrAir} (${f.arrTime?.split('T')[1] || '待定'})`;
          ctx.fillText(text, 80, y);
          y += 35;
        });
        y += 20;
      }

      if (tripData.settings.hotels?.length > 0) {
        ctx.fillStyle = '#F472B6';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('🏨 住宿資訊', 60, y);
        y += 40;
        ctx.fillStyle = '#6B7280';
        ctx.font = '20px sans-serif';
        tripData.settings.hotels.forEach((h: string, i: number) => {
          const text = `(${i+1}) ${h}`;
          ctx.fillText(text.length > 50 ? text.substring(0, 48) + '...' : text, 80, y);
          y += 35;
        });
        y += 20;
      }

      ctx.fillStyle = '#585C64';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText('📌 每日精選行程', 60, y);
      y += 40;

      days.forEach((date, idx) => {
        ctx.fillStyle = '#FFB6C1';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(`Day ${idx+1} (${date})`, 60, y);
        y += 35;

        const tasks = tripData.schedule?.[date] || [];
        ctx.fillStyle = '#4B5563';
        ctx.font = '20px sans-serif';
        if (tasks.length === 0) {
          ctx.fillText('  (自由活動)', 80, y);
          y += 35;
        } else {
          tasks.forEach((t: any) => {
            let taskText = `⏰ ${t.time} - ${t.task} [${t.type}]`;
            if (taskText.length > 45) taskText = taskText.substring(0, 43) + '...';
            ctx.fillText(taskText, 80, y);
            y += 35;
          });
        }
        y += 15;
      });

      ctx.fillStyle = '#D1D5DB';
      ctx.font = 'italic 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Generated by MY WTB bot 🎀', canvas.width / 2, canvas.height - 30);

      canvas.toBlob(async (blob) => {
        if (!blob) throw new Error('Canvas error');
        const file = new File([blob], 'itinerary.png', { type: 'image/png' });
        
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `${tripData.settings.name} 行程表`,
            text: '快來看看我們的行程表！'
          });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${tripData.settings.name}_行程表.png`;
          a.click();
          URL.revokeObjectURL(url);
          alert("已成功為您匯出並下載行程表圖片！🖼️");
        }
        setIsGeneratingImage(false);
      }, 'image/png');

    } catch (error) {
      alert("生成圖片失敗，請稍後再試！");
      setIsGeneratingImage(false);
    }
  };

  const shareReview = (entry: any) => {
    const text = `🌟【${entry.title}】的評價\n推薦度: ${entry.rating || 5}顆星\n📝 ${entry.reviewText || '無'}\n📍 ${entry.address || '無'}`;
    if (navigator.share) navigator.share({ text });
    else { navigator.clipboard.writeText(text); alert("已複製評論！"); }
  };

  return (
    <main className="min-h-screen max-w-md mx-auto bg-[#F9F7F7] relative pb-28">
      <header className="pt-8 pb-4 px-6 text-center">
        <h1 className="text-4xl font-black italic tracking-widest text-[#FFB6C1]" style={{ WebkitTextStroke: '1.5px white', textShadow: '0 0 10px rgba(255, 182, 193, 0.8)' }}>
          MY WTB bot
        </h1>
      </header>

      {(activeMainTab.id === '種草' || activeMainTab.id === '拔草') && (
        <>
          <div className="px-6 mb-3 space-y-3">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜尋店名、地區或事項..." className="w-full bg-white border border-gray-100 rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-pink-200 transition-all shadow-sm text-gray-600" />
              {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X size={16} /></button>}
            </div>

            <div className="flex space-x-2 overflow-x-auto scrollbar-hide pb-1">
              <div className="flex items-center shrink-0 text-gray-400 bg-white border border-gray-100 px-3 py-1.5 rounded-full shadow-sm">
                <Filter size={14} className="mr-1.5" /> <span className="text-xs font-bold">篩選</span>
              </div>
              <select value={selectedFilterCountry} onChange={(e) => setSelectedFilterCountry(e.target.value)} className="shrink-0 bg-white border border-gray-100 text-gray-500 text-xs font-bold rounded-full px-3 py-1.5 focus:outline-none shadow-sm appearance-none">
                <option value="">所有國家</option>
                {availableCountries.map(c => <option key={c as string} value={c as string}>{c as string}</option>)}
              </select>
              <select value={selectedFilterRegion} onChange={(e) => setSelectedFilterRegion(e.target.value)} className="shrink-0 bg-white border border-gray-100 text-gray-500 text-xs font-bold rounded-full px-3 py-1.5 focus:outline-none shadow-sm appearance-none">
                <option value="">所有地區</option>
                {availableRegions.map(r => <option key={r as string} value={r as string}>{r as string}</option>)}
              </select>
            </div>
          </div>

          <div className="px-6 mb-3 overflow-x-auto scrollbar-hide whitespace-nowrap">
            <div className="flex space-x-3">
              {SUB_TABS[activeMainTab.id as keyof typeof SUB_TABS].map((sub) => (
                <button key={sub.value} onClick={() => setActiveSubTab(sub)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 inline-block ${activeSubTab.value === sub.value ? 'bg-[#D1D9E6] text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}>
                  {sub.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {activeMainTab.id === '設定' ? (
        <div className="px-6 space-y-6 mt-6 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-6 flex items-center shadow-sm border border-gray-50">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center text-pink-400 text-3xl mr-4 shadow-inner">👸</div>
            <div><h2 className="text-xl font-black text-[#585C64] mb-1">My Profile</h2><p className="text-xs font-medium text-gray-400">wtb-hub 專屬用戶</p></div>
          </div>
          <div className="bg-white rounded-[2rem] p-3 shadow-sm border border-gray-50">
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition"><div className="flex items-center"><Bell size={18} className="text-blue-400 mr-3"/><span className="text-sm font-bold text-gray-600">通知設定</span></div><ChevronRight size={16} className="text-gray-300"/></button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-2xl transition group"><div className="flex items-center"><Trash2 size={18} className="text-red-400 mr-3 group-hover:text-red-500"/><span className="text-sm font-bold text-red-400 group-hover:text-red-500">清空所有資料</span></div></button>
          </div>
        </div>
      ) : activeMainTab.id === '行程曆' ? (
        <div className="px-6 space-y-4 animate-fade-in">
          {!tripData?.settings || isEditingTrip ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-black text-xl text-[#585C64]">✈️ {isEditingTrip ? '修改行程設定' : '新增專屬行程'}</h2>
                {isEditingTrip && <button onClick={() => setIsEditingTrip(false)} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded-full"><X size={18}/></button>}
              </div>
              <div className="space-y-4">
                <input type="text" placeholder="行程名稱 (例: 2026 韓國自由行)" value={tripForm.name} onChange={e=>setTripForm({...tripForm, name: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none font-bold text-sm text-gray-600" />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold text-gray-400">出發</label><input type="date" value={tripForm.startDate} onChange={e=>setTripForm({...tripForm, startDate: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none mt-1 text-xs font-bold text-gray-600" /></div>
                  <div><label className="text-xs font-bold text-gray-400">回程</label><input type="date" value={tripForm.endDate} onChange={e=>setTripForm({...tripForm, endDate: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none mt-1 text-xs font-bold text-gray-600" /></div>
                </div>
                
                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-blue-400 flex items-center"><Send size={14} className="mr-1"/> 航班資訊</label>
                    <button onClick={() => setTripForm({...tripForm, flights: [...tripForm.flights, { flightNo:'', depAir:'', arrAir:'', depTime:'', arrTime:'' }]})} className="text-[10px] bg-blue-50 text-blue-500 px-2 py-1 rounded-md font-bold hover:bg-blue-100">+ 新增航班</button>
                  </div>
                  {tripForm.flights.map((flight, idx) => (
                    <div key={idx} className="bg-blue-50/50 p-3 rounded-xl border border-blue-50 mb-2 relative group">
                      <button onClick={() => setTripForm({...tripForm, flights: tripForm.flights.filter((_, i) => i !== idx)})} className="absolute top-2 right-2 text-red-300 hover:text-red-500"><X size={14}/></button>
                      
                      <div className="mb-2 pr-6">
                        <input type="text" placeholder="航班號 (例: CX410)" value={flight.flightNo || ''} onChange={e=>{const f=[...tripForm.flights]; f[idx].flightNo=e.target.value; setTripForm({...tripForm, flights: f})}} className="w-full bg-white p-2 text-xs font-bold text-blue-600 rounded-lg border border-blue-100 outline-none placeholder:font-normal"/>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input type="text" placeholder="出發機場/代碼" value={flight.depAir} onChange={e=>{const f=[...tripForm.flights]; f[idx].depAir=e.target.value; setTripForm({...tripForm, flights: f})}} className="bg-white p-2 text-xs rounded-lg border border-blue-100 outline-none"/>
                        <input type="text" placeholder="到達機場/代碼" value={flight.arrAir} onChange={e=>{const f=[...tripForm.flights]; f[idx].arrAir=e.target.value; setTripForm({...tripForm, flights: f})}} className="bg-white p-2 text-xs rounded-lg border border-blue-100 outline-none"/>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="datetime-local" value={flight.depTime} onChange={e=>{const f=[...tripForm.flights]; f[idx].depTime=e.target.value; setTripForm({...tripForm, flights: f})}} className="bg-white p-2 text-[10px] font-bold text-gray-500 rounded-lg border border-blue-100 outline-none"/>
                        <input type="datetime-local" value={flight.arrTime} onChange={e=>{const f=[...tripForm.flights]; f[idx].arrTime=e.target.value; setTripForm({...tripForm, flights: f})}} className="bg-white p-2 text-[10px] font-bold text-gray-500 rounded-lg border border-blue-100 outline-none"/>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-gray-100 pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-pink-400 flex items-center"><MapPin size={14} className="mr-1"/> 住宿資訊</label>
                    <button onClick={() => setTripForm({...tripForm, hotels: [...tripForm.hotels, '']})} className="text-[10px] bg-pink-50 text-pink-500 px-2 py-1 rounded-md font-bold hover:bg-pink-100">+ 新增酒店</button>
                  </div>
                  {tripForm.hotels.map((hotel, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input type="text" placeholder="酒店名稱/連結" value={hotel} onChange={e=>{const h=[...tripForm.hotels]; h[idx]=e.target.value; setTripForm({...tripForm, hotels: h})}} className="flex-1 bg-white p-2.5 text-xs rounded-xl border border-pink-100 outline-none"/>
                      <button onClick={() => setTripForm({...tripForm, hotels: tripForm.hotels.filter((_, i) => i !== idx)})} className="bg-red-50 text-red-400 p-2.5 rounded-xl hover:bg-red-100"><X size={14}/></button>
                    </div>
                  ))}
                </div>

                <button onClick={saveTripSettings} className="w-full py-4 bg-[#D1D9E6] hover:bg-[#b0bdxd] text-white rounded-xl font-bold active:scale-95 transition-all shadow-sm mt-4">
                  {isEditingTrip ? '儲存修改' : '建立行程'}
                </button>
              </div>
            </div>
          ) : !selectedDate ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-fade-in relative">
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={shareTripAsImage} disabled={isGeneratingImage} className="p-2 bg-blue-50 text-blue-500 hover:bg-blue-100 rounded-full shadow-sm" title="分享行程為圖片">
                  {isGeneratingImage ? <Clock size={16} className="animate-spin" /> : <Share2 size={16}/>}
                </button>
                <button onClick={openEditTrip} className="p-2 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-full shadow-sm" title="編輯設定"><Edit3 size={16}/></button>
                <button onClick={() => { if(confirm("確定徹底刪除此行程表？")) setDoc(doc(db, 'appData', 'currentTrip'), { settings: null, schedule: {} }) }} className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-full shadow-sm"><Trash2 size={16}/></button>
              </div>
              
              <div className="mb-6 pb-6 border-b border-gray-100 pr-24">
                <h2 className="text-2xl font-black text-[#585C64] mb-2">{tripData.settings.name}</h2>
                <p className="text-sm text-gray-400 font-bold flex items-center gap-1"><CalendarIcon size={16}/> {tripData.settings.startDate} ~ {tripData.settings.endDate}</p>
                
                {tripData.settings.flights?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-blue-400 font-black mb-1">✈️ 航班資訊</p>
                    {tripData.settings.flights.map((f:any, idx:number) => (
                      <p key={idx} className="text-[10px] text-gray-500 font-mono bg-blue-50/50 p-1.5 rounded-lg mb-1 flex items-center flex-wrap gap-1">
                        {f.flightNo && <span className="font-black text-blue-600 bg-white px-1.5 py-0.5 rounded shadow-sm">{f.flightNo}</span>}
                        {f.depAir} ({f.depTime?.split('T')[1] || '待定'}) ➔ {f.arrAir} ({f.arrTime?.split('T')[1] || '待定'})
                      </p>
                    ))}
                  </div>
                )}
                {tripData.settings.hotels?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-pink-400 font-black mb-1">🏨 住宿資訊</p>
                    {tripData.settings.hotels.map((h:string, idx:number) => (
                      <p key={idx} className="text-[10px] text-gray-500 bg-pink-50/50 p-1.5 rounded-lg mb-1 truncate">{h}</p>
                    ))}
                  </div>
                )}
              </div>
              
              <h3 className="font-bold text-gray-500 mb-4 text-sm">點擊日期規劃每日行程 👇</h3>
              <div className="grid grid-cols-4 gap-2">
                {getDaysArray().map((date, idx) => {
                  const d = new Date(date);
                  const taskCount = tripData.schedule?.[date]?.length || 0;
                  return (
                    <div key={date} onClick={() => setSelectedDate(date)} className="aspect-square bg-[#F9F7F7] rounded-2xl flex flex-col items-center justify-center border border-gray-100 cursor-pointer hover:border-[#D1D9E6] active:scale-95 transition-all relative overflow-hidden">
                      <span className="text-[10px] font-bold text-gray-400 mb-1">Day {idx+1}</span>
                      <span className="text-xl font-black text-[#585C64]">{d.getDate()}</span>
                      {taskCount > 0 && <span className="absolute bottom-2 w-1.5 h-1.5 bg-[#FFB6C1] rounded-full"></span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                <button onClick={() => setSelectedDate(null)} className="p-2 bg-gray-50 rounded-full text-gray-500"><ChevronLeft size={20}/></button>
                <div>
                  <h2 className="text-lg font-black text-[#585C64]">{selectedDate}</h2>
                  <p className="text-xs font-bold text-gray-400">每日 Timeline</p>
                </div>
              </div>

              <div className="relative border-l-2 border-[#D1D9E6] ml-6 mb-8 space-y-5">
                {(tripData.schedule?.[selectedDate] || []).map((item: any) => (
                  <div key={item.id} className="relative pl-6">
                    <div className="absolute -left-[11px] top-1.5 w-5 h-5 bg-[#D1D9E6] rounded-full border-4 border-[#F9F7F7]"></div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex justify-between items-start group">
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-xs font-black text-[#FFB6C1] bg-pink-50 px-2 py-1 rounded-md tracking-wider">{item.time}</span>
                        <span className="text-[10px] font-bold text-gray-400 ml-2 border border-gray-200 px-1.5 py-0.5 rounded">{item.type}</span>
                        <p className="font-bold text-[#585C64] mt-2 mb-1 leading-snug">{item.task}</p>
                        
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noreferrer" className="inline-flex items-center text-[10px] font-bold text-blue-500 hover:text-blue-600 bg-blue-50 px-2 py-1 rounded-md mt-1">
                            <MapPin size={10} className="mr-1"/> 查看地點/詳情
                          </a>
                        )}
                      </div>
                      <button onClick={() => deleteTask(item.id)} className="text-gray-300 hover:text-red-400 p-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-gray-50 rounded-full"><X size={14}/></button>
                    </div>
                  </div>
                ))}
                {(!tripData.schedule?.[selectedDate] || tripData.schedule[selectedDate].length === 0) && <p className="pl-6 text-gray-400 text-sm font-medium pt-2">這天還沒有行程唷，趕快新增吧！</p>}
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex gap-2 mb-3">
                  <input type="time" value={newTask.time} onChange={e=>setNewTask({...newTask, time: e.target.value})} className="bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none font-bold text-sm text-gray-600" />
                  <select value={newTask.type} onChange={e=>setNewTask({...newTask, type: e.target.value})} className="bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none font-bold text-sm text-gray-600">
                    {['景點', '餐飲', '交通', '購物', '住宿', '其他'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 mb-3">
                  <input type="text" placeholder="行程名稱或備註..." value={newTask.task} onChange={e=>setNewTask({...newTask, task: e.target.value})} className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none font-bold text-sm text-gray-600" />
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <ExternalLink size={14} className="absolute left-3 top-3.5 text-gray-400"/>
                    <input type="text" placeholder="Google Map 或網站連結 (選填)" value={newTask.link} onChange={e=>setNewTask({...newTask, link: e.target.value})} className="w-full bg-gray-50 p-3 pl-9 rounded-xl border border-gray-100 outline-none text-xs text-gray-600" />
                  </div>
                  <button onClick={saveTask} className="bg-[#D1D9E6] hover:bg-[#b0bdxd] text-white px-5 rounded-xl font-bold active:scale-95 shadow-sm transition-colors"><Plus size={20}/></button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="px-6 space-y-4">
          {isLoading ? (
            <div className="text-center text-gray-400 py-10 animate-pulse">魔法載入中... 🪄</div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm min-h-[250px] flex flex-col items-center justify-center">
              <div className="text-4xl mb-3">🪹</div>
              <p className="text-gray-400 text-sm">這裡還空空的唷，快點擊右下角新增吧！</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredEntries.map((item) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} onClick={() => setSelectedEntry(item)} className="bg-white rounded-2xl p-4 shadow-sm flex space-x-4 items-center border border-gray-50 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden relative">
                    {item.images && item.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0]} alt="縮圖" className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🩰</div>}
                    {item.images?.length > 1 && <span className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 rounded-sm">+{item.images.length-1}</span>}
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <h3 className="font-bold text-[#585C64] truncate mb-1">{item.title}</h3>
                    <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
                      {item.tags?.region && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-500">{item.tags.region}</span>}
                      {item.tags?.dishType && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">{item.tags.dishType}</span>}
                      {item.rating && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-50 text-yellow-600"><Star size={10} className="mr-1" fill="currentColor"/> {item.rating}.0</span>}
                    </div>
                  </div>
                  
                  {tripData?.settings && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setAddingToTripEntry(item); }} 
                      className="absolute top-3 right-12 w-8 h-8 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center hover:bg-indigo-100 transition-colors z-10 opacity-100 sm:opacity-0 group-hover:opacity-100 shadow-sm"
                      title="加入行程"
                    >
                      <CalendarIcon size={14} />
                    </button>
                  )}

                  <button onClick={(e) => handleToggleStatus(e, item)} className={`absolute top-3 right-3 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-sm z-10 shrink-0 ${item.type === 'done' ? 'bg-[#FFB6C1] border-[#FFB6C1] text-white' : 'border-[#F3E0E2] text-gray-300 hover:text-pink-400'}`}>
                    <CheckSquare size={14} strokeWidth={2.5} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {/* 🌟 AddToTrip Modal */}
      <AnimatePresence>
        {addingToTripEntry && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl relative">
              <button onClick={() => setAddingToTripEntry(null)} className="absolute top-4 right-4 w-8 h-8 bg-gray-50 rounded-full text-gray-500 flex items-center justify-center hover:bg-gray-100"><X size={16}/></button>
              
              <h3 className="font-black text-lg text-[#585C64] mb-1 flex items-center"><CalendarIcon size={18} className="mr-2 text-indigo-400"/> 加入行程</h3>
              <p className="text-xs font-bold text-gray-400 mb-5 truncate pb-4 border-b border-gray-100">{addingToTripEntry.title}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">選擇日期</label>
                  <select value={addToTripDate} onChange={e=>setAddToTripDate(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold text-gray-700 outline-none">
                    <option value="" disabled>請選擇行程天數</option>
                    {getDaysArray().map((d, i) => <option key={d} value={d}>Day {i+1} ({d})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5">預定時間</label>
                  <input type="time" value={addToTripTime} onChange={e=>setAddToTripTime(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm font-bold text-gray-700 outline-none" />
                </div>
                
                <button onClick={confirmAddToTrip} className="w-full mt-2 py-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors shadow-md">
                  確認加入
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {activeMainTab.id !== '設定' && activeMainTab.id !== '行程曆' && (
        <button onClick={() => { setEditEntry(null); setIsModalOpen(true); }} className="fixed bottom-28 right-6 w-14 h-14 bg-[#FFB6C1] rounded-full shadow-[0_5px_15px_rgba(255,182,193,0.5)] flex items-center justify-center text-white text-3xl hover:bg-pink-400 transition-colors z-40">
          <Plus size={28} />
        </button>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-xl border-t border-gray-50 pb-6 pt-3 px-6 z-40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-center">
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMainTab.id === tab.id;
            return (
              <button key={tab.id} onClick={() => handleMainTabChange(tab)} className={`flex flex-col items-center justify-center w-16 h-12 transition-all ${isActive ? 'text-[#FFB6C1]' : 'text-gray-400'}`}>
                <motion.div animate={isActive ? { scale: 1.2, y: -2 } : { scale: 1, y: 0 }}><Icon size={26} strokeWidth={isActive ? 2.5 : 2} /></motion.div>
                {isActive && <motion.div layoutId="navIndicator" className="w-1.5 h-1.5 rounded-full bg-[#FFB6C1] mt-1" />}
              </button>
            );
          })}
        </div>
      </nav>

      <EntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editData={editEntry} currentMainTab={activeMainTab.id} currentSubTab={activeSubTab.value} entries={entries} />

      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
              <div className="absolute top-4 right-4 z-10 flex space-x-2">
                {tripData?.settings && (
                  <button onClick={() => setAddingToTripEntry(selectedEntry)} className="w-9 h-9 bg-indigo-500/90 backdrop-blur-md rounded-full text-white flex items-center justify-center shadow-sm"><CalendarIcon size={14} /></button>
                )}
                <button onClick={() => shareReview(selectedEntry)} className="w-9 h-9 bg-white/80 backdrop-blur-md rounded-full text-indigo-500 flex items-center justify-center shadow-sm"><Share2 size={16} /></button>
                <button onClick={() => handleEdit(selectedEntry)} className="w-9 h-9 bg-white/80 backdrop-blur-md rounded-full text-blue-500 flex items-center justify-center shadow-sm"><Edit3 size={16} /></button>
                <button onClick={() => handleDelete(selectedEntry.id)} className="w-9 h-9 bg-white/80 backdrop-blur-md rounded-full text-red-500 flex items-center justify-center shadow-sm"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedEntry(null)} className="w-9 h-9 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center shadow-sm"><X size={18} /></button>
              </div>
              
              <div className="w-full h-64 bg-gray-100 relative shrink-0 flex overflow-x-auto snap-x scrollbar-hide">
                {selectedEntry.images && selectedEntry.images.length > 0 ? (
                  selectedEntry.images.map((img: string, idx: number) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={idx} src={img} alt="圖片" className="w-full h-full object-cover flex-shrink-0 snap-center" />
                  ))
                ) : <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300 flex-shrink-0">🩰</div>}
              </div>

              <div className="p-6 overflow-y-auto bg-white">
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-[#585C64] mb-3 leading-snug tracking-wide">{selectedEntry.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.tags?.region && <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-500 tracking-wider">{selectedEntry.tags.region}</span>}
                    {selectedEntry.tags?.dishType && <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500 tracking-wider">{selectedEntry.tags.dishType}</span>}
                  </div>
                </div>

                {selectedEntry.type === 'done' && (
                  <div className="bg-[#F9F7F7] rounded-2xl p-5 mb-6 border border-gray-100">
                    <div className="flex items-center gap-1 mb-3 text-yellow-400">
                      {[1,2,3,4,5].map(s => <Star key={s} size={18} fill={s <= (selectedEntry.rating || 5) ? 'currentColor' : 'none'} className={s > (selectedEntry.rating || 5) ? 'text-gray-300' : ''} />)}
                      <span className="text-xs font-bold text-gray-400 ml-2">{selectedEntry.rating || 5}.0 顆星</span>
                    </div>
                    {selectedEntry.tags?.recommendation && (
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold mb-3 ${selectedEntry.tags.recommendation === 'recommend' ? 'bg-pink-100 text-pink-600' : 'bg-gray-200 text-gray-600'}`}>
                        {selectedEntry.tags.recommendation === 'recommend' ? '👍 強烈推薦' : '👎 不推薦/避雷'}
                      </span>
                    )}
                    <div className="text-sm font-medium text-gray-600 leading-relaxed bg-white p-3 rounded-xl border border-gray-50">
                      {selectedEntry.reviewText || "尚未填寫詳細評價。可以在編輯中補充你的心得！"}
                    </div>
                  </div>
                )}

                <div className="bg-[#F9F7F7] rounded-2xl p-5 space-y-5 mb-6 border border-gray-100">
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center shrink-0 mr-3 mt-0.5"><MapPin size={14}/></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 mb-0.5 tracking-widest">{selectedEntry.address ? '地址資訊' : '自動搜尋'}</p>
                      <p className="text-sm font-bold text-[#585C64] leading-relaxed">{selectedEntry.address || `搜尋: ${selectedEntry.title} ${selectedEntry.tags?.region || ''}`}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  {selectedEntry.tags?.country === '韓國' ? (
                    <a href={`https://map.naver.com/v5/search/${encodeURIComponent(selectedEntry.address || (selectedEntry.title + ' ' + (selectedEntry.tags?.region || '')))}`} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center w-full h-40 bg-[#E8F5E9] hover:bg-[#DCFCE7] text-[#2DB400] rounded-2xl border border-[#BBE5B3] transition-colors shadow-inner group">
                      <MapPin size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                      <span className="font-black text-sm tracking-widest">在 Naver Map 中開啟</span>
                    </a>
                  ) : (
                    <div className="rounded-2xl overflow-hidden border border-gray-100 h-40 bg-gray-50 relative shadow-inner">
                      <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedEntry.address || (selectedEntry.title + ' ' + (selectedEntry.tags?.region || '')))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}></iframe>
                    </div>
                  )}
                </div>

                {selectedEntry.links && selectedEntry.links.length > 0 && (
                  <div className="space-y-2">
                    {selectedEntry.links.map((linkText: string, idx: number) => {
                      const urlMatch = linkText.match(/https?:\/\/[^\s]+/);
                      if (!urlMatch) return null; 
                      return (
                        <a key={idx} href={urlMatch[0]} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full px-4 py-3.5 bg-blue-50 rounded-xl text-sm font-bold text-blue-500 hover:bg-blue-100 transition-all shadow-sm">
                          <ExternalLink size={16} className="mr-2"/> 前往原貼文看詳細介紹
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}