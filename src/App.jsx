import { useState, useEffect } from 'react';
import { PLAYLIST } from './constants';
import { BookOpen, Calendar, Menu, X, Search, Plus, Minus, Check, ChevronLeft, ChevronRight, Clock, Heart, Bookmark, ChevronUp } from 'lucide-react';

function App() {
    const [readChapters, setReadChapters] = useState(() => {
        try {
            const saved = localStorage.getItem('readChapters');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Error parsing readChapters', e);
            return [];
        }
    });

    const [favorites, setFavorites] = useState(() => {
        try {
            const saved = localStorage.getItem('favorites');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const [currentChapter, setCurrentChapter] = useState(() => {
        try {
            const lastOrder = localStorage.getItem('lastChapterOrder');
            if (lastOrder !== null) {
                const order = parseInt(lastOrder);
                const chapter = PLAYLIST.find(p => p.order === order);
                return chapter || PLAYLIST[0];
            }
        } catch (e) {
            console.error('Error parsing lastChapterOrder', e);
        }
        return PLAYLIST[0];
    });

    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.innerWidth > 768;
        }
        return true;
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [fontSize, setFontSize] = useState(() => {
        try {
            const saved = localStorage.getItem('fontSize');
            return saved ? parseFloat(saved) : 1.25;
        } catch (e) {
            return 1.25;
        }
    });
    const [scrollProgress, setScrollProgress] = useState(0);
    const [viewMode, setViewMode] = useState('all'); // 'all' or 'favorites'
    const [fontFamily, setFontFamily] = useState(() => {
        return localStorage.getItem('fontFamily') || 'THSarabunNew_content';
    });

    const fontOptions = [
        { id: 'THSarabunNew_content', label: 'TH Sarabun (Content)' }
    ];

    // Defensive index calculation
    const currentIndex = currentChapter ? PLAYLIST.findIndex(p => p.order === currentChapter.order) : 0;
    const prevChapter = currentIndex > 0 ? PLAYLIST[currentIndex - 1] : null;
    const nextChapter = currentIndex < PLAYLIST.length - 1 ? PLAYLIST[currentIndex + 1] : null;

    useEffect(() => {
        if (!currentChapter) return;

        fetchContent(currentChapter);
        localStorage.setItem('lastChapterOrder', currentChapter.order.toString());
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Mark as read
        if (!readChapters.includes(currentChapter.order)) {
            const updated = [...readChapters, currentChapter.order];
            setReadChapters(updated);
            localStorage.setItem('readChapters', JSON.stringify(updated));
        }
    }, [currentChapter]);

    useEffect(() => {
        localStorage.setItem('fontSize', fontSize.toString());
    }, [fontSize]);

    useEffect(() => {
        localStorage.setItem('fontFamily', fontFamily);
    }, [fontFamily]);

    useEffect(() => {
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }, [favorites]);

    useEffect(() => {
        const handleScroll = () => {
            const main = document.getElementById('main-scroll');
            if (main) {
                const totalHeight = main.scrollHeight - main.clientHeight;
                const progress = (main.scrollTop / totalHeight) * 100;
                setScrollProgress(progress);
            }
        };

        const main = document.getElementById('main-scroll');
        if (main) {
            main.addEventListener('scroll', handleScroll);
            return () => main.removeEventListener('scroll', handleScroll);
        }
    }, [loading]);

    const fetchContent = async (item) => {
        if (!item) return;
        setLoading(true);
        setContent('');
        setScrollProgress(0);

        try {
            // Strategy 1: Try to load from pre-scraped local content (Fastest & Most Reliable for Render)
            const localUrl = `/content/${item.order}.json`;
            const localResponse = await fetch(localUrl);
            const contentType = localResponse.headers.get('content-type');

            if (localResponse.ok && contentType && contentType.includes('application/json')) {
                console.log('Loading from local content...');
                const data = await localResponse.json();
                processRawHtml(data.html);
                setLoading(false);
                return;
            }

            // Strategy 2: Fallback to dynamic proxy (Original way + Server Cache)
            console.log('Local content not found, falling back to proxy/cache...');
            const proxyUrl = `/api/fetch?url=${encodeURIComponent(item.url)}`;
            const response = await fetch(proxyUrl);
            const html = await response.text();

            processRawHtml(html);
            // if (html.toLowerCase().includes('human verification') || html.toLowerCase().includes('cloudflare')) {
            //     setContent(`
            //         <div style="text-align: center; padding: 20px; border: 1px solid #e63946; border-radius: 8px; background: #fff5f5;">
            //             <h3 style="color: #e63946;">ถูกระงับการเข้าถึงชั่วคราว (Human Verification)</h3>
            //             <p>เซิร์ฟเวอร์โดนระบบป้องกันความปลอดภัยบล็อกครับ</p>
            //             <p style="margin-top: 10px; font-size: 0.9rem;">
            //                 <strong>วิธีแก้:</strong> ญาติๆ สามารถอ่านได้แน่นอนหากคุณใช้ระบบ "Scraper" ในเครื่องแล้วส่งขึ้น GitHub อีกครั้งครับ
            //             </p>
            //         </div>
            //     `);
            // } else {
            //     processRawHtml(html);
            // }
        } catch (error) {
            console.error('Error fetching content:', error);
            setContent('<p>เกิดข้อผิดพลาดในการโหลดเนื้อหา กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</p>');
        } finally {
            setLoading(false);
        }
    };

    const processRawHtml = (html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const storyContent = doc.querySelector('#story-content');

        if (storyContent) {
            setContent(storyContent.innerHTML);
        } else {
            setContent('<p>ไม่สามารถดึงเนื้อหาได้ อาจเกิดจากโครงสร้างหน้าเว็บเปลี่ยนไป หรือการจำกัดการเข้าถึง</p>');
        }
    };

    const toggleFavorite = (order) => {
        setFavorites(prev =>
            prev.includes(order) ? prev.filter(o => o !== order) : [...prev, order]
        );
    };

    const getReadingTime = (text) => {
        const wordsPerMinute = 200;
        const noHtml = text.replace(/<[^>]*>/g, '');
        const minutes = Math.ceil(noHtml.length / wordsPerMinute);
        return minutes;
    };

    const filteredPlaylist = PLAYLIST.filter(item => {
        const lowerSearch = searchTerm.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(lowerSearch);
        const matchesOrder = item.order.toString().includes(lowerSearch);
        const matchesSearch = matchesTitle || matchesOrder;

        if (viewMode === 'favorites') {
            return matchesSearch && favorites.includes(item.order);
        }
        return matchesSearch;
    });

    return (
        <>
            <div className="progress-bar" style={{ width: `${scrollProgress}%` }} />
            
            <div 
                className={`sidebar-overlay ${sidebarOpen ? 'active' : ''}`} 
                onClick={() => setSidebarOpen(false)} 
            />

            <div className={`sidebar ${sidebarOpen ? '' : 'closed'}`}>
                <div className="sidebar-header">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h1 className="serif">ธรรมบริการ</h1>
                        <X size={20} className="mobile-toggle" onClick={() => setSidebarOpen(false)} style={{ cursor: 'pointer' }} />
                    </div>
                    <div className="search-box">
                        <Search size={16} color="#8c7355" />
                        <input
                            type="text"
                            placeholder="ค้นหาหัวข้อ..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="sidebar-tabs">
                        <button
                            className={viewMode === 'all' ? 'active' : ''}
                            onClick={() => setViewMode('all')}
                        >
                            ทั้งหมด
                        </button>
                        <button
                            className={viewMode === 'favorites' ? 'active' : ''}
                            onClick={() => setViewMode('favorites')}
                        >
                            รายการโปรด ({favorites.length})
                        </button>
                    </div>
                </div>

                <div className="playlist-container">
                    {filteredPlaylist.map((item) => (
                        <div
                            key={item.order}
                            className={`chapter-item ${currentChapter.order === item.order ? 'active' : ''} ${readChapters.includes(item.order) ? 'read' : ''}`}
                            onClick={() => setCurrentChapter(item)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <span className="chapter-number">{item.order.toString().padStart(2, '0')}</span>
                                    <div className="chapter-title">{item.title}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {favorites.includes(item.order) && <Heart size={14} color="#e63946" fill="#e63946" />}
                                    {readChapters.includes(item.order) && <Check size={14} color="#8c7355" style={{ marginTop: '2px' }} />}
                                </div>
                            </div>
                            <div className="chapter-date">
                                <Calendar size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                {item.update_date}
                                {readChapters.includes(item.order) && <span style={{ marginLeft: '8px', fontSize: '0.7rem', opacity: 0.7 }}>(อ่านแล้ว)</span>}
                            </div>
                        </div>
                    ))}
                    {filteredPlaylist.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', color: '#8c7355' }}>
                            {viewMode === 'favorites' ? (
                                <>
                                    <p>ยังไม่มีรายการโปรด</p>
                                    <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7 }}>กด ❤️ ในบทความที่ชอบเพื่อเก็บไว้ที่นี่ครับ</p>
                                </>
                            ) : 'ไม่พบหัวข้อที่ค้นหา'}
                        </div>
                    )}
                </div>
            </div>

            <main className="main-content" id="main-scroll">
                {!sidebarOpen && (
                    <div style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 100 }}>
                        <Menu size={24} onClick={() => setSidebarOpen(true)} style={{ cursor: 'pointer', color: '#8c7355' }} />
                    </div>
                )}

                <div className="reader-container">
                    <div className="article-header">
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                            <h2 className="serif">{currentChapter.title}</h2>
                            <button
                                className={`fav-btn ${favorites.includes(currentChapter.order) ? 'active' : ''}`}
                                onClick={() => toggleFavorite(currentChapter.order)}
                                title="เก็บไว้ในรายการโปรด"
                            >
                                <Heart size={20} fill={favorites.includes(currentChapter.order) ? "#e63946" : "none"} />
                            </button>
                        </div>

                        <div className="article-meta" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '20px' }}>
                            <span>
                                <Calendar size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                อัปเดตเมื่อ: {currentChapter.update_date}
                            </span>
                            {content && (
                                <span>
                                    <Clock size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                                    ใช้เวลาอ่านประมาณ: {getReadingTime(content)} นาที
                                </span>
                            )}
                            <div className="font-controls">
                                <select
                                    className="font-selector"
                                    value={fontFamily}
                                    onChange={(e) => setFontFamily(e.target.value)}
                                    title="เลือกรูปแบบตัวอักษร"
                                >
                                    {fontOptions.map(opt => (
                                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                                    ))}
                                </select>
                                <div className="divider" />
                                <button onClick={() => setFontSize(prev => Math.max(0.75, prev - 0.25))} title="ลดขนาดตัวอักษร">
                                    <Minus size={14} />
                                </button>
                                <span style={{ fontSize: '0.8rem', minWidth: '40px' }}>{Math.round(fontSize * 100)}%</span>
                                <button onClick={() => setFontSize(prev => Math.min(2.5, prev + 0.25))} title="เพิ่มขนาดตัวอักษร">
                                    <Plus size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="article-body" style={{ fontSize: `${fontSize}rem`, fontFamily: fontFamily }}>
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '50px', color: '#8c7355' }}>
                                <p>กำลังโหลดสาระธรรม...</p>
                            </div>
                        ) : (
                            <div dangerouslySetInnerHTML={{ __html: content }} />
                        )}
                    </div>

                    <div className="navigation-footer">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
                            {prevChapter ? (
                                <button className="nav-btn" onClick={() => setCurrentChapter(prevChapter)}>
                                    <ChevronLeft size={20} />
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>ตอนก่อนหน้า</div>
                                        <div className="nav-btn-title">{prevChapter.title}</div>
                                    </div>
                                </button>
                            ) : <div />}

                            {nextChapter ? (
                                <button className="nav-btn next" onClick={() => setCurrentChapter(nextChapter)}>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>ตอนถัดไป</div>
                                        <div className="nav-btn-title">{nextChapter.title}</div>
                                    </div>
                                    <ChevronRight size={20} />
                                </button>
                            ) : <div />}
                        </div>

                        <div style={{ marginTop: '3rem', borderTop: '1px solid var(--border-color)', padding: '2rem 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <p className="serif">จบตอน</p>
                            <p style={{ fontSize: '0.8rem', marginTop: '1rem' }}>ขอบคุณเนื้อหาจาก Dek-D.com</p>
                        </div>
                    </div>
                </div>

                {scrollProgress > 20 && (
                    <button
                        className="scroll-top-btn"
                        onClick={() => document.getElementById('main-scroll').scrollTo({ top: 0, behavior: 'smooth' })}
                        title="เลื่อนขึ้นบนสุด"
                    >
                        <ChevronUp size={24} />
                    </button>
                )}
            </main>
        </>
    );
}

export default App;
