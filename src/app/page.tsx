'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, CheckSquare, Calendar as CalendarIcon, Settings, Plus, MapPin, X, ExternalLink, Trash2, Edit3, Navigation, Clock, Utensils, Search, ThumbsUp, ThumbsDown, User, Briefcase, Bell, Moon, ChevronRight, Filter, Star, Share2, ChevronLeft } from 'lucide-react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EntryModal from '@/components/EntryModal';

const MAIN_TABS = [
  { id: '種草', icon: Heart, type: 'want' }, 
  { id: '拔草', icon: CheckSquare, type: 'done' },
  { id: '行程曆', icon: CalendarIcon, type: 'calendar' }, // 🌟 升級為行程曆
  { id: '設定', icon: Settings, type: 'settings' }
];

const SUB_TABS = {
  '種草': [{ label: '想吃', value: 'eat' }, { label: '想去', value: 'go' }, { label: '想買', value: 'buy' }],
  '拔草': [{ label: '已吃', value: 'eat' }, { label: '已去', value: 'go' }, { label: '已買', value: 'buy' }],
  '行程曆': [{ label: '我的行程', value: 'trip' }],
  '設定': [{ label: '個人資訊', value: 'profile' }, { label: '系統設定', value: 'system' }]
};

const THIRD_TIER_FILTERS: Record<string, any[]> = {
  '拔草': [{ label: '全部', value: 'all' }, { label: '推薦', value: 'recommend', icon: ThumbsUp }, { label: '不推', value: 'not_recommend', icon: ThumbsDown }]
};

export default function Home() {
  const [activeMainTab, setActiveMainTab] = useState(MAIN_TABS[0]);
  const [activeSubTab, setActiveSubTab] = useState(SUB_TABS['種草'][0]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 🌟 進階下拉選單篩選器
  const [selectedFilterCountry, setSelectedFilterCountry] = useState('');
  const [selectedFilterRegion, setSelectedFilterRegion] = useState('');
  const [selectedFilterDish, setSelectedFilterDish] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [editEntry, setEditEntry] = useState<any | null>(null);

  // 🌟 行程曆專屬狀態
  const [tripData, setTripData] = useState<any | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [tripForm, setTripForm] = useState({ name: '', startDate: '', endDate: '', flight: '', hotel: '' });
  const [newTask, setNewTask] = useState({ time: '10:00', task: '', type: '景點' });

  // 抓取 Entries 與 TripData
  useEffect(() => {
    // 1. 抓取種草/拔草紀錄
    const q = query(collection(db, 'entries'));
    const unsubscribeEntries = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setEntries(data);
      setIsLoading(false);
    });

    // 2. 抓取行程設定與時間軸 (存在 appData/currentTrip)
    const unsubscribeTrip = onSnapshot(doc(db, 'appData', 'currentTrip'), (docSnap) => {
      if (docSnap.exists()) setTripData(docSnap.data());
      else setTripData(null);
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
    setSelectedDate(null); // 切換 Tab 時重置行程日期
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

  // ==========================================
  // 🌟 行程曆專屬邏輯
  // ==========================================
  const saveTripSettings = async () => {
    if (!tripForm.name || !tripForm.startDate || !tripForm.endDate) return alert("請填寫行程名稱與日期！");
    await setDoc(doc(db, 'appData', 'currentTrip'), { settings: tripForm, schedule: {} }, { merge: true });
  };

  const getDaysArray = () => {
    if (!tripData?.settings) return [];
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
    setNewTask({ time: '10:00', task: '', type: '景點' });
  };

  const deleteTask = async (taskId: number) => {
    const updatedTasks = tripData.schedule[selectedDate!].filter((t: any) => t.id !== taskId);
    await setDoc(doc(db, 'appData', 'currentTrip'), { schedule: { ...tripData.schedule, [selectedDate!]: updatedTasks } }, { merge: true });
  };

  // 一鍵分享評論
  const shareReview = (entry: any) => {
    const text = `🌟【${entry.title}】的真實評價\n推薦度: ${entry.rating || 5}顆星\n📝評論: ${entry.reviewText || '無'}\n快來看看！`;
    if (navigator.share) navigator.share({ text });
    else { navigator.clipboard.writeText(text); alert("已複製評論至剪貼簿！"); }
  };

  return (
    <main className="min-h-screen max-w-md mx-auto bg-[#F9F7F7] relative pb-28">
      <header className="pt-8 pb-4 px-6 text-center">
        <h1 className="text-4xl font-black italic tracking-widest text-[#FFB6C1]" style={{ WebkitTextStroke: '1.5px white', textShadow: '0 0 10px rgba(255, 182, 193, 0.8)' }}>
          MY WTB bot
        </h1>
      </header>

      {/* 搜尋與篩選列 (設定與行程曆不顯示) */}
      {(activeMainTab.id === '種草' || activeMainTab.id === '拔草') && (
        <>
          <div className="px-6 mb-3 space-y-3">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜尋店名、地區或事項..." className="w-full bg-white border border-gray-100 rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-pink-200 focus:ring-1 focus:ring-pink-200 transition-all shadow-sm text-gray-600 placeholder:text-gray-300" />
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

      {/* 主內容區塊 */}
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
        // 🌟 行程曆面板 (Month View & Timeline)
        <div className="px-6 space-y-4 animate-fade-in">
          {!tripData?.settings ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
              <h2 className="font-black text-xl mb-4 text-[#585C64]">✈️ 新增專屬行程</h2>
              <div className="space-y-4">
                <input type="text" placeholder="行程名稱 (例: 2026 韓國自由行)" value={tripForm.name} onChange={e=>setTripForm({...tripForm, name: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none font-bold text-sm text-gray-600" />
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold text-gray-400">出發</label><input type="date" value={tripForm.startDate} onChange={e=>setTripForm({...tripForm, startDate: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none mt-1 text-xs font-bold text-gray-600" /></div>
                  <div><label className="text-xs font-bold text-gray-400">回程</label><input type="date" value={tripForm.endDate} onChange={e=>setTripForm({...tripForm, endDate: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none mt-1 text-xs font-bold text-gray-600" /></div>
                </div>
                <input type="text" placeholder="航班資訊 (選填)" value={tripForm.flight} onChange={e=>setTripForm({...tripForm, flight: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none text-sm text-gray-600" />
                <input type="text" placeholder="入住酒店 (選填)" value={tripForm.hotel} onChange={e=>setTripForm({...tripForm, hotel: e.target.value})} className="w-full bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none text-sm text-gray-600" />
                <button onClick={saveTripSettings} className="w-full py-4 bg-[#D1D9E6] text-white rounded-xl font-bold active:scale-95 transition-all shadow-sm">建立行程</button>
              </div>
            </div>
          ) : !selectedDate ? (
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 animate-fade-in">
              <div className="mb-6 pb-6 border-b border-gray-100 relative">
                <button onClick={() => { if(confirm("確定刪除此行程？")) setDoc(doc(db, 'appData', 'currentTrip'), { settings: null, schedule: {} }) }} className="absolute top-0 right-0 p-2 text-red-400 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                <h2 className="text-2xl font-black text-[#585C64] mb-2 pr-8">{tripData.settings.name}</h2>
                <p className="text-sm text-gray-400 font-bold flex items-center gap-1"><CalendarIcon size={16}/> {tripData.settings.startDate} ~ {tripData.settings.endDate}</p>
                {tripData.settings.flight && <p className="text-xs text-blue-400 mt-2 font-bold">✈️ 航班: {tripData.settings.flight}</p>}
                {tripData.settings.hotel && <p className="text-xs text-pink-400 mt-1 font-bold">🏨 酒店: {tripData.settings.hotel}</p>}
              </div>
              <h3 className="font-bold text-gray-500 mb-4 text-sm">點擊日期規劃每日行程 👇</h3>
              <div className="grid grid-cols-4 gap-2">
                {getDaysArray().map((date, idx) => {
                  const d = new Date(date);
                  const taskCount = tripData.schedule?.[date]?.length || 0;
                  return (
                    <div key={date} onClick={() => setSelectedDate(date)} className="aspect-square bg-[#F9F7F7] rounded-2xl flex flex-col items-center justify-center border border-gray-100 cursor-pointer active:scale-95 transition-all relative overflow-hidden">
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

              {/* 時間軸 */}
              <div className="relative border-l-2 border-[#D1D9E6] ml-6 mb-8 space-y-5">
                {(tripData.schedule?.[selectedDate] || []).map((item: any) => (
                  <div key={item.id} className="relative pl-6">
                    <div className="absolute -left-[11px] top-1.5 w-5 h-5 bg-[#D1D9E6] rounded-full border-4 border-[#F9F7F7]"></div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50 flex justify-between items-start">
                      <div>
                        <span className="text-xs font-black text-[#FFB6C1] bg-pink-50 px-2 py-1 rounded-md tracking-wider">{item.time}</span>
                        <span className="text-xs font-bold text-gray-400 ml-2">{item.type}</span>
                        <p className="font-bold text-[#585C64] mt-2">{item.task}</p>
                      </div>
                      <button onClick={() => deleteTask(item.id)} className="text-gray-300 hover:text-red-400 p-2"><X size={16}/></button>
                    </div>
                  </div>
                ))}
                {(!tripData.schedule?.[selectedDate] || tripData.schedule[selectedDate].length === 0) && <p className="pl-6 text-gray-400 text-sm font-medium pt-2">這天還沒有行程唷，趕快新增吧！</p>}
              </div>

              {/* 新增時間軸任務 */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex gap-2 mb-3">
                  <input type="time" value={newTask.time} onChange={e=>setNewTask({...newTask, time: e.target.value})} className="bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none font-bold text-sm text-gray-600" />
                  <select value={newTask.type} onChange={e=>setNewTask({...newTask, type: e.target.value})} className="bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none font-bold text-sm text-gray-600">
                    {['景點', '餐飲', '交通', '購物', '住宿'].map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input type="text" placeholder="行程名稱或筆記..." value={newTask.task} onChange={e=>setNewTask({...newTask, task: e.target.value})} className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100 outline-none font-bold text-sm text-gray-600" />
                  <button onClick={saveTask} className="bg-[#D1D9E6] text-white px-5 rounded-xl font-bold active:scale-95 shadow-sm"><Plus size={20}/></button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // 🌟 原本的 種草 / 拔草 列表
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
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} onClick={() => setSelectedEntry(item)} className="bg-white rounded-2xl p-4 shadow-sm flex space-x-4 items-center border border-gray-50 cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden relative">
                    {item.images && item.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0]} alt="縮圖" className="w-full h-full object-cover" />
                    ) : <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🩰</div>}
                    {item.images?.length > 1 && <span className="absolute bottom-1 right-1 bg-black/50 text-white text-[10px] px-1.5 rounded-sm">+{item.images.length-1}</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#585C64] truncate mb-1">{item.title}</h3>
                    <div className="flex flex-wrap gap-1.5 mb-2 mt-1">
                      {item.tags?.region && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-500">{item.tags.region}</span>}
                      {item.tags?.dishType && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-600">{item.tags.dishType}</span>}
                      {item.rating && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-50 text-yellow-600"><Star size={10} className="mr-1" fill="currentColor"/> {item.rating}.0</span>}
                    </div>
                  </div>
                  <button onClick={(e) => handleToggleStatus(e, item)} className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all shadow-sm z-10 shrink-0 ${item.type === 'done' ? 'bg-[#FFB6C1] border-[#FFB6C1] text-white' : 'border-[#F3E0E2] text-gray-300 hover:text-pink-400'}`}>
                    <CheckSquare size={16} strokeWidth={2.5} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

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

      {/* 🌟 拔草/種草 詳細內容彈跳視窗 (加入多圖與評論) */}
      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
              <div className="absolute top-4 right-4 z-10 flex space-x-2">
                <button onClick={() => shareReview(selectedEntry)} className="w-9 h-9 bg-white/80 backdrop-blur-md rounded-full text-indigo-500 flex items-center justify-center shadow-sm"><Share2 size={16} /></button>
                <button onClick={() => handleEdit(selectedEntry)} className="w-9 h-9 bg-white/80 backdrop-blur-md rounded-full text-blue-500 flex items-center justify-center shadow-sm"><Edit3 size={16} /></button>
                <button onClick={() => handleDelete(selectedEntry.id)} className="w-9 h-9 bg-white/80 backdrop-blur-md rounded-full text-red-500 flex items-center justify-center shadow-sm"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedEntry(null)} className="w-9 h-9 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center shadow-sm"><X size={18} /></button>
              </div>
              
              {/* 🌟 多圖橫向輪播 */}
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

                {/* 🌟 評星與評價區塊 (如果是在拔草清單) */}
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

                <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100 h-40 bg-gray-50 relative shadow-inner">
                  <iframe width="100%" height="100%" style={{ border: 0 }} loading="lazy" src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedEntry.address || (selectedEntry.title + ' ' + (selectedEntry.tags?.region || '')))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}></iframe>
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