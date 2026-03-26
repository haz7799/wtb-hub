'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, CheckSquare, Calendar, Settings, Plus, MapPin, X, ExternalLink, Map, Trash2, Edit3, Navigation, Clock, Utensils, Search, ThumbsUp, ThumbsDown, User, Briefcase, Bell, Moon, ChevronRight } from 'lucide-react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EntryModal from '@/components/EntryModal';

const MAIN_TABS = [
  { id: '種草', icon: Heart, type: 'want' }, 
  { id: '拔草', icon: CheckSquare, type: 'done' },
  { id: '行事曆', icon: Calendar, type: 'calendar' }, 
  { id: '設定', icon: Settings, type: 'settings' }
];

const SUB_TABS = {
  '種草': [{ label: '想吃', value: 'eat' }, { label: '想去', value: 'go' }, { label: '想買', value: 'buy' }],
  '拔草': [{ label: '已吃', value: 'eat' }, { label: '已去', value: 'go' }, { label: '已買', value: 'buy' }],
  '行事曆': [{ label: '未做', value: 'todo' }, { label: '已做', value: 'done' }],
  '設定': [{ label: '個人資訊', value: 'profile' }, { label: '系統設定', value: 'system' }]
};

const THIRD_TIER_FILTERS: Record<string, any[]> = {
  '拔草': [
    { label: '全部', value: 'all' }, 
    { label: '推薦', value: 'recommend', icon: ThumbsUp }, 
    { label: '不推', value: 'not_recommend', icon: ThumbsDown }
  ],
  '行事曆': [
    { label: '全部', value: 'all' }, 
    { label: '個人', value: 'personal', icon: User }, 
    { label: '公司', value: 'company', icon: Briefcase }
  ]
};

export default function Home() {
  const [activeMainTab, setActiveMainTab] = useState(MAIN_TABS[0]);
  const [activeSubTab, setActiveSubTab] = useState(SUB_TABS['種草'][0]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [editEntry, setEditEntry] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'entries'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setEntries(data);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleMainTabChange = (tab: any) => {
    setActiveMainTab(tab);
    setActiveSubTab(SUB_TABS[tab.id as keyof typeof SUB_TABS][0]);
    setActiveFilter('all');
    setSearchQuery('');
  };

  const filteredEntries = entries.filter(entry => {
    if (activeMainTab.id === '設定') return false;
    const isTabMatch = entry.type === activeMainTab.type && entry.category === activeSubTab.value;
    if (!isTabMatch) return false;
    if (activeFilter !== 'all') {
      if (activeMainTab.id === '拔草' && entry.tags?.recommendation !== activeFilter) return false;
      if (activeMainTab.id === '行事曆' && entry.tags?.eventType !== activeFilter) return false;
    }
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
    if (activeMainTab.id === '行事曆') {
      const newCategory = item.category === 'todo' ? 'done' : 'todo';
      await updateDoc(doc(db, 'entries', item.id), { category: newCategory });
      return;
    }
    const isCurrentlyWant = item.type === 'want';
    const newType = isCurrentlyWant ? 'done' : 'want';
    const actionName = isCurrentlyWant ? '拔草成功' : '重新種草';
    if (confirm(`確定要將這筆紀錄標記為「${actionName}」嗎？✨`)) {
      await updateDoc(doc(db, 'entries', item.id), { type: newType });
    }
  };

  return (
    <main className="min-h-screen max-w-md mx-auto bg-[#F9F7F7] relative pb-24">
      <header className="pt-8 pb-4 px-6 text-center">
        <h1 className="text-4xl font-black italic tracking-widest text-[#FFB6C1]" style={{ WebkitTextStroke: '1.5px white', textShadow: '0 0 10px rgba(255, 182, 193, 0.8)' }}>
          MY WTB bot
        </h1>
      </header>

      {activeMainTab.id !== '設定' && (
        <div className="px-6 mb-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜尋店名、地區或事項..." className="w-full bg-white border border-gray-100 rounded-full py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:border-pink-200 focus:ring-1 focus:ring-pink-200 transition-all shadow-sm text-gray-600 placeholder:text-gray-300" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"><X size={16} /></button>}
          </div>
        </div>
      )}

      <div className="px-6 mb-3 overflow-x-auto scrollbar-hide whitespace-nowrap">
        <div className="flex space-x-3">
          {SUB_TABS[activeMainTab.id as keyof typeof SUB_TABS].map((sub) => (
            <button key={sub.value} onClick={() => setActiveSubTab(sub)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 inline-block ${activeSubTab.value === sub.value ? 'bg-[#D1D9E6] text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}>
              {sub.label}
            </button>
          ))}
        </div>
      </div>

      {THIRD_TIER_FILTERS[activeMainTab.id] && (
        <div className="px-6 mb-4 flex space-x-2">
          {THIRD_TIER_FILTERS[activeMainTab.id].map((filter) => {
            const Icon = filter.icon;
            return (
              <button key={filter.value} onClick={() => setActiveFilter(filter.value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center ${activeFilter === filter.value ? 'bg-pink-100 text-pink-500' : 'bg-transparent text-gray-400 hover:bg-gray-100'}`}>
                {Icon && <Icon size={12} className="mr-1.5" />} {filter.label}
              </button>
            );
          })}
        </div>
      )}

      {activeMainTab.id === '設定' ? (
        <div className="px-6 space-y-6 mt-6 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-6 flex items-center shadow-sm border border-gray-50">
            <div className="w-16 h-16 bg-pink-50 rounded-full flex items-center justify-center text-pink-400 text-3xl mr-4 shadow-inner">👸</div>
            <div>
              <h2 className="text-xl font-black text-[#585C64] mb-1">My Profile</h2>
              <p className="text-xs font-medium text-gray-400">wtb-hub 專屬用戶</p>
            </div>
          </div>
          <div className="bg-white rounded-[2rem] p-3 shadow-sm border border-gray-50">
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition">
              <div className="flex items-center"><Bell size={18} className="text-blue-400 mr-3"/><span className="text-sm font-bold text-gray-600">通知設定</span></div><ChevronRight size={16} className="text-gray-300"/>
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition">
              <div className="flex items-center"><Moon size={18} className="text-indigo-400 mr-3"/><span className="text-sm font-bold text-gray-600">深色模式</span></div><ChevronRight size={16} className="text-gray-300"/>
            </button>
            <div className="h-px bg-gray-100 mx-4 my-1"></div>
            <button className="w-full flex items-center justify-between p-4 hover:bg-red-50 rounded-2xl transition group">
              <div className="flex items-center"><Trash2 size={18} className="text-red-400 mr-3 group-hover:text-red-500"/><span className="text-sm font-bold text-red-400 group-hover:text-red-500">清空所有資料</span></div>
            </button>
          </div>
        </div>
      ) : (
        <div className="px-6 space-y-4">
          {isLoading ? (
            <div className="text-center text-gray-400 py-10 animate-pulse">魔法載入中... 🪄</div>
          ) : filteredEntries.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center shadow-sm min-h-[250px] flex flex-col items-center justify-center">
              <div className="text-4xl mb-3">{searchQuery || activeFilter !== 'all' ? '🔍' : '🪹'}</div>
              <p className="text-gray-400 text-sm">{searchQuery || activeFilter !== 'all' ? '找不到符合條件的紀錄唷！' : '這裡還空空的唷，快點擊右下角新增吧！'}</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredEntries.map((item) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} onClick={() => setSelectedEntry(item)} className="bg-white rounded-2xl p-4 shadow-sm flex space-x-4 items-center border border-gray-50 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden relative">
                    {item.images && item.images.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.images[0]} alt="縮圖" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/F9F7F7/D1D9E6?text=No+Img'; }} />
                    ) : <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">{activeMainTab.id === '行事曆' ? '📝' : '🩰'}</div>}
                    
                    {item.tags?.recommendation === 'recommend' && <div className="absolute top-1 left-1 bg-pink-500 text-white p-1 rounded-full"><ThumbsUp size={10}/></div>}
                    {item.tags?.recommendation === 'not_recommend' && <div className="absolute top-1 left-1 bg-gray-500 text-white p-1 rounded-full"><ThumbsDown size={10}/></div>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[#585C64] truncate mb-1">{item.title}</h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.tags?.country && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-pink-50 text-pink-400"><MapPin size={10} className="mr-0.5" /> {item.tags.country}</span>}
                      {item.tags?.closedDays && item.tags.closedDays.length > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500">休週{item.tags.closedDays.join('、')}</span>
                      )}
                      {item.tags?.eventType === 'personal' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-500"><User size={10} className="mr-1"/> 個人</span>}
                      {item.tags?.eventType === 'company' && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-500"><Briefcase size={10} className="mr-1"/> 公司</span>}
                    </div>
                  </div>

                  <button onClick={(e) => handleToggleStatus(e, item)} className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all shadow-sm z-10 shrink-0 ${item.type === 'done' || item.category === 'done' ? 'bg-pink-400 border-pink-400 text-white hover:bg-pink-500' : 'border-[#F3E0E2] text-gray-300 hover:text-pink-400 hover:bg-pink-50'}`}>
                    <CheckSquare size={16} strokeWidth={2.5} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      )}

      {activeMainTab.id !== '設定' && (
        <button onClick={() => { setEditEntry(null); setIsModalOpen(true); }} className="fixed bottom-28 right-6 w-14 h-14 bg-[#F3E0E2] rounded-full shadow-lg flex items-center justify-center text-white text-3xl hover:bg-pink-300 transition-colors z-40">
          <Plus size={28} />
        </button>
      )}

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/70 backdrop-blur-xl border-t border-white pb-6 pt-3 px-6 z-40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
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

      <EntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editData={editEntry} />

      {/* 🔮 終極版詳細資訊視窗 (所有資訊全部回歸！) */}
      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
              
              <div className="absolute top-4 right-4 z-10 flex space-x-2">
                <button onClick={() => handleEdit(selectedEntry)} className="w-9 h-9 bg-white/80 backdrop-blur-md rounded-full text-blue-500 flex items-center justify-center shadow-sm"><Edit3 size={16} /></button>
                <button onClick={() => handleDelete(selectedEntry.id)} className="w-9 h-9 bg-white/80 backdrop-blur-md rounded-full text-red-500 flex items-center justify-center shadow-sm"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedEntry(null)} className="w-9 h-9 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center shadow-sm"><X size={18} /></button>
              </div>

              <div className="w-full h-56 bg-gray-100 relative shrink-0">
                {selectedEntry.images && selectedEntry.images.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedEntry.images[0]} alt="圖片" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300/F9F7F7/D1D9E6?text=No+Img'; }} />
                ) : <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">🩰</div>}
              </div>

              <div className="p-6 overflow-y-auto bg-white">
                {/* 1. 標題與標籤區塊 */}
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-[#585C64] mb-3 leading-snug tracking-wide">{selectedEntry.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.tags?.country && <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-pink-50 text-pink-500 tracking-wider">{selectedEntry.tags.country}</span>}
                    {selectedEntry.tags?.region && <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-500 tracking-wider">{selectedEntry.tags.region}</span>}
                    {selectedEntry.tags?.dishType && <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500 tracking-wider">{selectedEntry.tags.dishType}</span>}
                    {selectedEntry.tags?.eventType === 'personal' && <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-500 tracking-wider">🙋 個人</span>}
                    {selectedEntry.tags?.eventType === 'company' && <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-500 tracking-wider">🏢 公司</span>}
                  </div>
                </div>

                {/* 2. 結構化資訊卡片 */}
                <div className="bg-[#F9F7F7] rounded-2xl p-5 space-y-5 mb-6 border border-gray-100">
                  
                  {/* 評價 */}
                  {selectedEntry.tags?.recommendation && (
                    <div className="flex items-start">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mr-3 mt-0.5 ${selectedEntry.tags.recommendation === 'recommend' ? 'bg-pink-100 text-pink-500' : 'bg-gray-200 text-gray-500'}`}>
                        {selectedEntry.tags.recommendation === 'recommend' ? <ThumbsUp size={14}/> : <ThumbsDown size={14}/>}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 mb-0.5 tracking-widest">評價</p>
                        <p className="text-sm font-bold text-[#585C64]">{selectedEntry.tags.recommendation === 'recommend' ? '超級推薦 👍' : '不推薦 🙅'}</p>
                      </div>
                    </div>
                  )}

                  {/* 推薦菜式 */}
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0 mr-3 mt-0.5"><Utensils size={14}/></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 mb-0.5 tracking-widest">推薦菜式 / 類別</p>
                      <p className="text-sm font-bold text-[#585C64]">{selectedEntry.tags?.dishType || '未指定'}</p>
                    </div>
                  </div>

                  {/* 固定公休日 */}
                  {selectedEntry.tags?.closedDays && selectedEntry.tags.closedDays.length > 0 && (
                    <div className="flex items-start">
                      <div className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center shrink-0 mr-3 mt-0.5"><Calendar size={14}/></div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 mb-0.5 tracking-widest">固定公休日</p>
                        <p className="text-sm font-bold text-red-500 leading-relaxed">逢每週{selectedEntry.tags.closedDays.join('、')}休息</p>
                      </div>
                    </div>
                  )}

                  {/* 營業時間 */}
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shrink-0 mr-3 mt-0.5"><Clock size={14}/></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 mb-0.5 tracking-widest">營業時間</p>
                      <p className="text-sm font-bold text-[#585C64] leading-relaxed">{selectedEntry.businessHours || '暫無資訊'}</p>
                    </div>
                  </div>

                  {/* 地址與搜尋 */}
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center shrink-0 mr-3 mt-0.5"><MapPin size={14}/></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 mb-0.5 tracking-widest">{selectedEntry.address ? '地址資訊' : '自動搜尋分店'}</p>
                      <p className="text-sm font-bold text-[#585C64] leading-relaxed">{selectedEntry.address || `搜尋: ${selectedEntry.title} ${selectedEntry.tags?.region || ''}`}</p>
                    </div>
                  </div>
                </div>

                {/* 3. 內嵌地圖 */}
                <div className="mb-6 rounded-2xl overflow-hidden border border-gray-100 h-40 bg-gray-50 relative shadow-inner">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(selectedEntry.address || (selectedEntry.title + ' ' + (selectedEntry.tags?.region || '')))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  ></iframe>
                  {selectedEntry.tags?.country === '韓國' && (
                    <a href={`https://map.naver.com/v5/search/${encodeURIComponent(selectedEntry.address || selectedEntry.title)}`} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-blue-500 shadow-sm flex items-center hover:bg-blue-50 transition">
                      <Navigation size={12} className="mr-1"/> 開啟 Naver Map
                    </a>
                  )}
                </div>

                {/* 4. 原文連結 */}
                {selectedEntry.links && selectedEntry.links.length > 0 && (
                  <div className="space-y-2">
                    {selectedEntry.links.map((linkText: string, idx: number) => {
                      const urlMatch = linkText.match(/https?:\/\/[^\s]+/);
                      const url = urlMatch ? urlMatch[0] : null;
                      if (!url) return null; 
                      return (
                        <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full px-4 py-3.5 bg-pink-50 rounded-xl text-sm font-bold text-pink-500 hover:bg-pink-100 transition-all shadow-sm">
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