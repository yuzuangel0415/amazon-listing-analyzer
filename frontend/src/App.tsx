import { useState, useEffect } from 'react';
import type { AnalysisResponse, FetchResponse, UploadResponse } from './types';
import { analyzeText, fetchAndAnalyze, uploadAndAnalyze, fetchDemo } from './api';
import InputPanel from './components/InputPanel';
import AnalysisResult from './components/AnalysisResult';
import Landing from './components/Landing';
import { Clock, Trash2 } from 'lucide-react';

type ViewState = 'landing' | 'input' | 'loading' | 'result' | 'error';

// ===== localStorage 键名 =====
const HISTORY_KEY = 'listing-analyzer-history';

// ===== 历史记录数据结构 =====
interface HistoryEntry {
  id: string;                    // 唯一标识
  timestamp: number;             // 保存时间戳
  results: AnalysisResponse[];   // 分析结果
  demoNames: string[];           // 产品名称
}

export default function App() {
  const [viewState, setViewState] = useState<ViewState>('landing');
  const [error, setError] = useState('');
  const [results, setResults] = useState<AnalysisResponse[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fetchMeta, setFetchMeta] = useState<Partial<FetchResponse> | null>(null);
  const [demoNames, setDemoNames] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);       // 历史记录列表
  const [showHistory, setShowHistory] = useState(false);            // 是否显示历史面板

  // ===== 启动时从 localStorage 恢复历史 =====
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) {
        const parsed: HistoryEntry[] = JSON.parse(raw);
        setHistory(parsed);
        // 如果有历史记录，自动恢复最近一条的结果
        if (parsed.length > 0) {
          const latest = parsed[parsed.length - 1];
          setResults(latest.results);
          setDemoNames(latest.demoNames);
          setCurrentIndex(0);
          setViewState('result');
        }
      }
    } catch { /* 数据损坏则忽略 */ }
  }, []);

  // ===== 保存到 localStorage =====
  const saveToHistory = (newResults: AnalysisResponse[], names: string[]) => {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      results: newResults,
      demoNames: names,
    };
    const updated = [...history, entry].slice(-20); // 最多保留20条
    setHistory(updated);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(updated)); } catch { /* 存储满则忽略 */ }
  };

  // ===== 删除单条历史 =====
  const deleteHistoryEntry = (id: string) => {
    const updated = history.filter(h => h.id !== id);
    setHistory(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    // 如果当前结果正好来自被删条目且没有其他历史，返回首页
    if (updated.length === 0) {
      setResults([]);
      setViewState('landing');
    }
  };

  // ===== 清空全部历史 =====
  const clearAllHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  // ===== 加载历史记录 =====
  const loadHistory = (entry: HistoryEntry) => {
    setResults(entry.results);
    setDemoNames(entry.demoNames);
    setCurrentIndex(0);
    setFetchMeta(null);
    setViewState('result');
    setShowHistory(false);
  };

  // ===== 演示模式 =====
  const handleDemo = async () => {
    setViewState('loading'); setError(''); setFetchMeta(null);
    try {
      const res = await fetchDemo();
      const list = res.results as AnalysisResponse[];
      setResults(list);
      setDemoNames(res.results.map((r: any) => r.sample_name || ''));
      setCurrentIndex(0);
      saveToHistory(list, res.results.map((r: any) => r.sample_name || ''));
      setViewState('result');
    } catch (e: any) {
      setError(e.message); setViewState('error');
    }
  };

  // ===== 文本提交（支持多产品） =====
  const handleTextSubmit = async (products: { title: string; bullets: string[] }[]) => {
    setViewState('loading'); setError(''); setFetchMeta(null); setDemoNames([]);
    try {
      const allResults: AnalysisResponse[] = [];
      const names: string[] = [];
      // 逐个调用 API 分析每个产品
      for (const p of products) {
        const res = await analyzeText(p.title, p.bullets);
        allResults.push(res);
        names.push(p.title.slice(0, 30)); // 截取前30字作为名称
      }
      setResults(allResults);
      setDemoNames(names);
      setCurrentIndex(0);
      saveToHistory(allResults, names);
      setViewState('result');
    } catch (e: any) {
      setError(e.message); setViewState('error');
    }
  };

  // ===== URL/ASIN =====
  const handleUrlSubmit = async (url: string, asin: string, marketplace: string, proxy: string) => {
    setViewState('loading'); setError(''); setDemoNames([]);
    try {
      const res = await fetchAndAnalyze(url, asin, marketplace, proxy);
      setResults([res]); setCurrentIndex(0);
      setFetchMeta({ asin: res.asin, price: res.price, rating: res.rating, reviews_count: res.reviews_count, images: res.images });
      saveToHistory([res], [res.title.slice(0, 30)]);
      setViewState('result');
    } catch (e: any) { setError(e.message); setViewState('error'); }
  };

  // ===== 文件上传 =====
  const handleFileUpload = async (file: File) => {
    setViewState('loading'); setError(''); setFetchMeta(null); setDemoNames([]);
    try {
      const res: UploadResponse = await uploadAndAnalyze(file);
      setResults(res.results as AnalysisResponse[]); setCurrentIndex(0);
      saveToHistory(res.results as AnalysisResponse[], (res.results as AnalysisResponse[]).map(r => r.title.slice(0, 30)));
      setViewState('result');
    } catch (e: any) { setError(e.message); setViewState('error'); }
  };

  const handleGoHome = () => {
    setViewState('landing'); setError(''); setResults([]); setCurrentIndex(0); setFetchMeta(null); setDemoNames([]);
  };

  const handleReset = () => {
    setViewState('input'); setError(''); setResults([]); setCurrentIndex(0); setFetchMeta(null); setDemoNames([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 导航栏 */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button onClick={handleGoHome} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center text-white font-bold text-lg">A</div>
            <div className="text-left">
              <h1 className="text-xl font-bold text-gray-900">Amazon Listing 拆解工具</h1>
              <p className="text-xs text-gray-500">标题分析 · 五点拆解 · 卖点策略 · SEO评分</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            {/* 历史记录按钮 */}
            {history.length > 0 && (
              <button
                onClick={() => setShowHistory(!showHistory)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                  showHistory ? 'bg-brand text-white' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                }`}
              >
                <Clock className="w-4 h-4" />
                历史 ({history.length})
              </button>
            )}
            {viewState === 'result' && (
              <button onClick={handleReset} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                重新分析
              </button>
            )}
            {viewState !== 'landing' && (
              <button onClick={handleGoHome} className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors">首页</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 历史记录面板 */}
        {showHistory && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Clock className="w-4 h-4" /> 分析历史
              </h3>
              {history.length > 0 && (
                <button onClick={clearAllHistory} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> 清空全部
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-gray-400">暂无历史记录</p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {history.slice().reverse().map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <button
                      onClick={() => loadHistory(entry)}
                      className="flex-1 text-left flex items-center gap-3"
                    >
                      <span className="text-xs text-gray-400 w-16 shrink-0">
                        {new Date(entry.timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-sm text-gray-700 truncate">
                        {entry.demoNames.filter(Boolean).join('、') || `共 ${entry.results.length} 个产品`}
                      </span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteHistoryEntry(entry.id); }}
                      className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 欢迎页 */}
        {viewState === 'landing' && (
          <Landing onStartAnalysis={() => setViewState('input')} onDemo={handleDemo} loading={false} />
        )}

        {/* 输入视图 */}
        {(viewState === 'input' || viewState === 'loading') && (
          <div className="max-w-3xl mx-auto mt-8">
            <InputPanel
              onTextSubmit={handleTextSubmit}
              onUrlSubmit={handleUrlSubmit}
              onFileUpload={handleFileUpload}
              loading={viewState === 'loading'}
            />
          </div>
        )}

        {/* 加载中 */}
        {viewState === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-500 font-medium">正在分析中...</p>
          </div>
        )}

        {/* 错误 */}
        {viewState === 'error' && (
          <div className="max-w-xl mx-auto mt-12">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-3">
                <span className="text-red-500 text-2xl">!</span>
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">分析出错</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button onClick={handleReset} className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium">返回重试</button>
            </div>
          </div>
        )}

        {/* 结果 */}
        {viewState === 'result' && results.length > 0 && (
          <div>
            {results.length > 1 && (
              <div className="flex items-center gap-2 mb-6 flex-wrap">
                <span className="text-sm font-medium text-gray-500">分析结果:</span>
                {results.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      i === currentIndex ? 'bg-brand text-white shadow-sm' : 'bg-white text-gray-600 hover:bg-gray-100 border'
                    }`}
                  >
                    {demoNames[i] || `产品 ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
            <AnalysisResult data={results[currentIndex]} fetchMeta={fetchMeta} />
          </div>
        )}
      </main>

      <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
        Amazon Listing Analyzer — 仅供学习与研究用途
      </footer>
    </div>
  );
}
