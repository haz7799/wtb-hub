'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, CheckSquare, Calendar, Settings, Plus, MapPin, X, ExternalLink, Map, Trash2, Edit3, Navigation, Clock, Utensils } from 'lucide-react';
import { collection, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EntryModal from '@/components/EntryModal';

const MAIN_TABS = [
  { id: '種草', icon: Heart, type: 'want' }, { id: '拔草', icon: CheckSquare, type: 'done' },
  { id: '行事曆', icon: Calendar, type: 'calendar' }, { id: '設定', icon: Settings, type: 'settings' }
];

const SUB_TABS = {
  '種草': [{ label: '想吃', value: 'eat' }, { label: '想去', value: 'go' }, { label: '想買', value: 'buy' }],
  '拔草': [{ label: '已吃', value: 'eat' }, { label: '已去', value: 'go' }, { label: '已買', value: 'buy' }],
  '行事曆': [{ label: '未做', value: 'todo' }, { label: '已做', value: 'done' }],
  '設定': [{ label: '個人資訊', value: 'profile' }, { label: '主題設定', value: 'theme' }]
};

export default function Home() {
  const [activeMainTab, setActiveMainTab] = useState(MAIN_TABS[0]);
  const [activeSubTab, setActiveSubTab] = useState(SUB_TABS['種草'][0]);
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

  const filteredEntries = entries.filter(entry => entry.type === activeMainTab.type && entry.category === activeSubTab.value);

  const handleDelete = async (id: string) => {
    if (confirm("確定要拔除這筆紀錄嗎？🗑️")) {
      await deleteDoc(doc(db, 'entries', id));
      setSelectedEntry(null); 
    }
  };

  const handleEdit = (entry: any) => { setEditEntry(entry); setSelectedEntry(null); setIsModalOpen(true); };

  return (
    <main className="min-h-screen max-w-md mx-auto bg-[#F9F7F7] relative pb-24">
      <header className="pt-8 pb-6 px-6 text-center">
        <h1 className="text-4xl font-black italic tracking-widest text-[#FFB6C1]" style={{ WebkitTextStroke: '1.5px white', textShadow: '0 0 10px rgba(255, 182, 193, 0.8)' }}>
          MY WTB bot
        </h1>
      </header>

      <div className="px-6 mb-4 overflow-x-auto scrollbar-hide whitespace-nowrap pb-2">
        <div className="flex space-x-3">
          {SUB_TABS[activeMainTab.id as keyof typeof SUB_TABS].map((sub) => (
            <button key={sub.value} onClick={() => setActiveSubTab(sub)} className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 inline-block ${activeSubTab.value === sub.value ? 'bg-[#D1D9E6] text-white shadow-md' : 'bg-white text-gray-500 border border-gray-100'}`}>
              {sub.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-4">
        {isLoading ? (
          <div className="text-center text-gray-400 py-10 animate-pulse">魔法載入中... 🪄</div>
        ) : filteredEntries.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm min-h-[300px] flex flex-col items-center justify-center">
            <div className="text-4xl mb-3">🪹</div>
            <p className="text-gray-400 text-sm">這裡還空空的唷，快點擊右下角新增吧！</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredEntries.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} onClick={() => setSelectedEntry(item)} className="bg-white rounded-2xl p-4 shadow-sm flex space-x-4 items-center border border-gray-50 cursor-pointer hover:shadow-md transition-shadow">
                <div className="w-20 h-20 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden">
                  {item.images && item.images.length > 0 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.images[0]} alt="縮圖" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/F9F7F7/D1D9E6?text=No+Img'; }} />
                  ) : <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">🩰</div>}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#585C64] truncate mb-1">{item.title}</h3>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags?.country && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-pink-50 text-pink-400"><MapPin size={10} className="mr-0.5" /> {item.tags.country}</span>}
                    {item.tags?.region && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-400">{item.tags.region}</span>}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <button onClick={() => { setEditEntry(null); setIsModalOpen(true); }} className="fixed bottom-28 right-6 w-14 h-14 bg-[#F3E0E2] rounded-full shadow-lg flex items-center justify-center text-white text-3xl hover:bg-pink-300 transition-colors z-40">
        <Plus size={28} />
      </button>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/70 backdrop-blur-xl border-t border-white pb-6 pt-3 px-6 z-40 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="flex justify-between items-center">
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMainTab.id === tab.id;
            return (
              <button key={tab.id} onClick={() => { setActiveMainTab(tab); setActiveSubTab(SUB_TABS[tab.id as keyof typeof SUB_TABS][0]); }} className={`flex flex-col items-center justify-center w-16 h-12 transition-all ${isActive ? 'text-[#FFB6C1]' : 'text-gray-400'}`}>
                <motion.div animate={isActive ? { scale: 1.2, y: -2 } : { scale: 1, y: 0 }}><Icon size={26} strokeWidth={isActive ? 2.5 : 2} /></motion.div>
                {isActive && <motion.div layoutId="navIndicator" className="w-1.5 h-1.5 rounded-full bg-[#FFB6C1] mt-1" />}
              </button>
            );
          })}
        </div>
      </nav>

      <EntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} editData={editEntry} />

      {/* 🔮 終極版詳細資訊視窗 (乾淨排版 + 內嵌地圖) */}
      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="bg-white w-full max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
              
              <div className="absolute top-4 right-4 z-10 flex space-x-2">
                <button onClick={() => handleEdit(selectedEntry)} className="w-9 h-9 bg-white/80 backdrop-blur-md rounded-full text-blue-500 flex items-center justify-center hover:bg-white transition shadow-sm"><Edit3 size={16} /></button>
                <button onClick={() => handleDelete(selectedEntry.id)} className="w-9 h-9 bg-white/80 backdrop-blur-md rounded-full text-red-500 flex items-center justify-center hover:bg-white transition shadow-sm"><Trash2 size={16} /></button>
                <button onClick={() => setSelectedEntry(null)} className="w-9 h-9 bg-black/50 backdrop-blur-md rounded-full text-white flex items-center justify-center hover:bg-black/70 transition shadow-sm"><X size={18} /></button>
              </div>

              {/* 頂部大圖 */}
              <div className="w-full h-56 bg-gray-100 relative shrink-0">
                {selectedEntry.images && selectedEntry.images.length > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedEntry.images[0]} alt="圖片" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300/F9F7F7/D1D9E6?text=No+Img'; }} />
                ) : <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">🩰</div>}
              </div>

              <div className="p-6 overflow-y-auto bg-white">
                {/* 標題與標籤 */}
                <div className="mb-6">
                  <h2 className="text-2xl font-black text-[#585C64] mb-3 leading-snug tracking-wide">{selectedEntry.title}</h2>
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.tags?.country && <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-pink-50 text-pink-500 tracking-wider">{selectedEntry.tags.country}</span>}
                    {selectedEntry.tags?.region && <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-500 tracking-wider">{selectedEntry.tags.region}</span>}
                  </div>
                </div>

                {/* 乾淨的結構化資訊卡片 */}
                <div className="bg-[#F9F7F7] rounded-2xl p-5 space-y-5 mb-6 border border-gray-100">
                  {/* 推薦菜式 */}
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center shrink-0 mr-3 mt-0.5"><Utensils size={14}/></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 mb-0.5 tracking-widest">推薦菜式 / 類別</p>
                      <p className="text-sm font-bold text-[#585C64]">{selectedEntry.tags?.dishType || '未指定'}</p>
                    </div>
                  </div>

                  {/* 營業時間 */}
                  <div className="flex items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-500 flex items-center justify-center shrink-0 mr-3 mt-0.5"><Clock size={14}/></div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 mb-0.5 tracking-widest">營業時間</p>
                      <p className="text-sm font-bold text-[#585C64] leading-relaxed">{selectedEntry.businessHours || '暫無營業時間資訊'}</p>
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

                {/* 內嵌地圖 (Iframe) */}
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
                  {/* 如果是韓國，多提供一顆前往 Naver Map 的快捷鈕 */}
                  {selectedEntry.tags?.country === '韓國' && (
                    <a href={`https://map.naver.com/v5/search/${encodeURIComponent(selectedEntry.address || selectedEntry.title)}`} target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-blue-500 shadow-sm flex items-center hover:bg-blue-50 transition">
                      <Navigation size={12} className="mr-1"/> 開啟 Naver Map
                    </a>
                  )}
                </div>

                {/* 原文連結變成純按鈕 (徹底拋棄冗長文案) */}
                {selectedEntry.links && selectedEntry.links.length > 0 && (
                  <div className="space-y-2">
                    {selectedEntry.links.map((linkText: string, idx: number) => {
                      const urlMatch = linkText.match(/https?:\/\/[^\s]+/);
                      const url = urlMatch ? urlMatch[0] : null;
                      if (!url) return null; // 如果找不到網址就不顯示
                      
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