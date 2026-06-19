import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Globe, Link, FileText, FileSpreadsheet, Plus, Trash2, Loader2, Copy, X } from 'lucide-react';

// ===== 产品数据结构 =====
interface ProductInput {
  title: string;
  bullets: string[];
}

// ===== Props =====
interface Props {
  onTextSubmit: (products: ProductInput[]) => void; // 改为多产品提交
  onUrlSubmit: (url: string, asin: string, marketplace: string, proxy: string) => void;
  onFileUpload: (file: File) => void;
  loading: boolean;
}

type TabId = 'text' | 'url' | 'excel';

const tabs: { id: TabId; label: string; icon: typeof FileText }[] = [
  { id: 'text', label: '粘贴文本', icon: FileText },
  { id: 'url', label: 'URL / ASIN', icon: Link },
  { id: 'excel', label: '上传 Excel', icon: FileSpreadsheet },
];

const marketplaces = [
  { value: 'com', label: '美国 amazon.com' },
  { value: 'co.jp', label: '日本 amazon.co.jp' },
  { value: 'de', label: '德国 amazon.de' },
  { value: 'co.uk', label: '英国 amazon.co.uk' },
  { value: 'ca', label: '加拿大 amazon.ca' },
  { value: 'fr', label: '法国 amazon.fr' },
  { value: 'it', label: '意大利 amazon.it' },
  { value: 'es', label: '西班牙 amazon.es' },
];

// ===== 默认空产品模板 =====
const emptyProduct = (): ProductInput => ({ title: '', bullets: ['', '', '', '', ''] });

export default function InputPanel({ onTextSubmit, onUrlSubmit, onFileUpload, loading }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('text');

  // ===== 多产品状态：默认包含一个空产品 =====
  const [products, setProducts] = useState<ProductInput[]>([emptyProduct()]);
  const [activeProduct, setActiveProduct] = useState(0); // 当前编辑的产品索引

  // URL tab
  const [url, setUrl] = useState('');
  const [asin, setAsin] = useState('');
  const [marketplace, setMarketplace] = useState('com');
  const [proxy, setProxy] = useState('');

  // Excel tab
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) setSelectedFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    maxFiles: 1,
  });

  // ===== 当前产品 =====
  const current = products[activeProduct] || emptyProduct();

  // ===== 更新当前产品标题 =====
  const updateTitle = (val: string) => {
    setProducts(prev => prev.map((p, i) => i === activeProduct ? { ...p, title: val } : p));
  };

  // ===== 更新当前产品的某个卖点 =====
  const updateBullet = (idx: number, val: string) => {
    setProducts(prev => prev.map((p, i) =>
      i === activeProduct ? { ...p, bullets: p.bullets.map((b, j) => j === idx ? val : b) } : p
    ));
  };

  // ===== 当前产品添加卖点 =====
  const addBullet = () => {
    const cur = products[activeProduct];
    if (cur && cur.bullets.length < 10) {
      setProducts(prev => prev.map((p, i) =>
        i === activeProduct ? { ...p, bullets: [...p.bullets, ''] } : p
      ));
    }
  };

  // ===== 当前产品删除卖点 =====
  const removeBullet = (idx: number) => {
    const cur = products[activeProduct];
    if (cur && cur.bullets.length > 1) {
      setProducts(prev => prev.map((p, i) =>
        i === activeProduct ? { ...p, bullets: p.bullets.filter((_, j) => j !== idx) } : p
      ));
    }
  };

  // ===== 添加新产品 =====
  const addProduct = () => {
    setProducts(prev => [...prev, emptyProduct()]);
    setActiveProduct(products.length); // 切换到新添加的产品
  };

  // ===== 删除产品（至少保留一个） =====
  const removeProduct = (idx: number) => {
    if (products.length <= 1) return;
    setProducts(prev => prev.filter((_, i) => i !== idx));
    if (activeProduct >= idx) {
      setActiveProduct(Math.max(0, idx - 1));
    }
  };

  // ===== 多产品提交 =====
  const handleTextSubmit = () => {
    const valid = products
      .map(p => ({ ...p, title: p.title.trim(), bullets: p.bullets.filter(b => b.trim()) }))
      .filter(p => p.title && p.bullets.length > 0);
    if (valid.length > 0) onTextSubmit(valid);
  };

  const handleUrlSubmit = () => {
    if (url.trim() || asin.trim()) {
      onUrlSubmit(url.trim(), asin.trim(), marketplace, proxy.trim());
    }
  };

  const handleFileSubmit = () => {
    if (selectedFile) onFileUpload(selectedFile);
  };

  const isValidText = products.some(p => p.title.trim() && p.bullets.some(b => b.trim()));
  const isValidUrl = url.trim() || asin.trim();
  const isValidFile = !!selectedFile;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      {/* 标签页导航 */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-brand bg-white border-b-2 border-b-brand -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {/* ===== 文本输入（多产品） ===== */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            {/* 产品标签切换 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {products.map((_, i) => (
                <div key={i} className="flex items-center">
                  <button
                    onClick={() => setActiveProduct(i)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                      i === activeProduct
                        ? 'bg-brand text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    产品 {i + 1}
                  </button>
                  {products.length > 1 && (
                    <button
                      onClick={() => removeProduct(i)}
                      className="ml-0.5 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="删除此产品"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addProduct}
                className="px-2.5 py-1.5 rounded-lg text-sm font-medium text-brand hover:bg-brand/10 transition-colors flex items-center gap-1 border border-dashed border-brand/30"
              >
                <Plus className="w-3.5 h-3.5" /> 添加产品
              </button>
              <span className="text-xs text-gray-400 ml-auto">{products.length} 个产品</span>
            </div>

            {/* 当前产品的标题 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                产品 {activeProduct + 1} 标题
              </label>
              <input
                type="text"
                value={current.title}
                onChange={e => updateTitle(e.target.value)}
                placeholder="粘贴 Amazon 产品标题..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-sm"
              />
            </div>

            {/* 当前产品的五点描述 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-gray-700">五点描述</label>
                <span className="text-xs text-gray-400">{current.bullets.filter(b => b.trim()).length}/5 已填</span>
              </div>
              <div className="space-y-2">
                {current.bullets.map((b, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <span className="w-6 h-8 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={b}
                      onChange={e => updateBullet(i, e.target.value)}
                      placeholder={`第 ${i + 1} 条卖点...`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-sm"
                    />
                    {current.bullets.length > 1 && (
                      <button
                        onClick={() => removeBullet(i)}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {current.bullets.length < 10 && (
                <button onClick={addBullet} className="mt-2 flex items-center gap-1 text-sm text-brand hover:text-brand-dark transition-colors font-medium">
                  <Plus className="w-4 h-4" /> 添加卖点
                </button>
              )}
            </div>

            <button
              onClick={handleTextSubmit}
              disabled={!isValidText || loading}
              className="w-full py-3 bg-brand hover:bg-brand-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />分析 {products.filter(p => p.title.trim() && p.bullets.some(b => b.trim())).length} 个产品...</span>
              ) : (
                `分析 ${products.filter(p => p.title.trim() && p.bullets.some(b => b.trim())).length} 个产品`
              )}
            </button>
          </div>
        )}

        {/* ===== URL / ASIN ===== */}
        {activeTab === 'url' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amazon 产品链接</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.amazon.com/dp/B0XXXXXXXXX" className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-sm" />
              </div>
            </div>
            <div className="text-center text-sm text-gray-400 font-medium">— 或者 —</div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">ASIN 编码</label>
              <input type="text" value={asin} onChange={e => setAsin(e.target.value.toUpperCase())} placeholder="B0XXXXXXXXX" maxLength={10} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-sm font-mono tracking-wider" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">站点</label>
              <select value={marketplace} onChange={e => setMarketplace(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-sm bg-white">
                {marketplaces.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
              </select>
            </div>
            <details className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
              <summary className="px-4 py-2 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 select-none">代理设置（反爬用，可选）</summary>
              <div className="px-4 pb-3">
                <input type="text" value={proxy} onChange={e => setProxy(e.target.value)} placeholder="http://user:pass@ip:port" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all text-xs font-mono" />
                <p className="text-xs text-gray-400 mt-1.5">设置代理后可绕过 Amazon 对当前IP的拦截。</p>
              </div>
            </details>
            <button onClick={handleUrlSubmit} disabled={!isValidUrl || loading} className="w-full py-3 bg-brand hover:bg-brand-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm">
              {loading ? (<span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />抓取分析中...</span>) : '抓取并分析'}
            </button>
          </div>
        )}

        {/* ===== Excel 上传 ===== */}
        {activeTab === 'excel' && (
          <div className="space-y-4">
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${isDragActive ? 'border-brand bg-brand/5' : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'}`}>
              <input {...getInputProps()} />
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-gray-700">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400 mt-1">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  <p className="text-xs text-brand mt-2 font-medium">点击更换文件</p>
                </div>
              ) : isDragActive ? (
                <p className="text-sm font-medium text-brand">释放文件以上传</p>
              ) : (
                <div>
                  <p className="text-sm font-medium text-gray-600">拖拽 Excel 文件到此处</p>
                  <p className="text-xs text-gray-400 mt-1">或点击选择文件 (.xlsx, .xls)</p>
                </div>
              )}
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              <p className="font-semibold mb-1">Excel 格式要求:</p>
              <p>列: <code className="bg-blue-100 px-1.5 py-0.5 rounded">title</code>, <code className="bg-blue-100 px-1.5 py-0.5 rounded">bullet1</code>~<code className="bg-blue-100 px-1.5 py-0.5 rounded">bullet5</code></p>
            </div>
            <button onClick={handleFileSubmit} disabled={!isValidFile || loading} className="w-full py-3 bg-brand hover:bg-brand-dark disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all text-sm">
              {loading ? (<span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />批量分析中...</span>) : '上传并批量分析'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
