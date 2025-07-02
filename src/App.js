import { useEffect, useState } from 'react';

// 🛠️ 请替换为你最新部署的 Apps Script 网络应用 URL（JSONP 版 exec）：
const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxT4PTEQ1oZns_iby5XEIhwzL7KpwE_raEKek3OPSe297yBeAyaojHelojSypaaeEDv/exec';

// 去重用 Key
const makeKey = (title, company) =>
  `${title.trim().toLowerCase()}|${company.trim().toLowerCase()}`;

function App() {
  // —— 状态定义 —— //
  const [jobs, setJobs] = useState(() => {
    const saved = localStorage.getItem('jobList');
    return saved ? JSON.parse(saved) : [];
  });
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState('Applied');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [loading, setLoading] = useState(false);

  // —— 持久化 jobs —— //
  useEffect(() => {
    localStorage.setItem('jobList', JSON.stringify(jobs));
  }, [jobs]);

  // —— JSONP 同步函数 —— //
  const syncFromGmail = () => {
    console.log('🟢 开始同步 Gmail 数据');
    setLoading(true);

    // 全局回调
    window.__GMAIL_SYNC_CB = ({ applications = [], rejections = [] }) => {
      console.log(
        '🟢 JSONP 回调，apps:',
        applications.length,
        'rejs:',
        rejections.length
      );
      setJobs(prev => {
        const map = new Map();
        // 1. 本地已有
        prev.forEach(job => {
          const normTitle = job.title
            .replace(/^Your application to\s*/i, '')
            .trim();
          map.set(makeKey(normTitle, job.company), {
            ...job,
            title: normTitle
          });
        });
        // 2. applications
        applications.forEach(app => {
          const key = makeKey(app.title, app.company);
          if (!map.has(key)) {
            map.set(key, {
              id: Date.now() + Math.random(),
              title: app.title,
              company: app.company,
              status: 'Applied',
              createdAt: app.date
            });
          }
        });
        // 3. rejections
        rejections.forEach(rj => {
          const title = rj.title.replace(/^Your application to\s*/i, '').trim();
          const comp  = rj.company.trim();
          const key   = makeKey(title, comp);
          if (map.has(key)) {
            const old = map.get(key);
            map.set(key, { ...old, title, company: comp, status: 'Rejected' });
          } else {
            map.set(key, {
              id: Date.now() + Math.random(),
              title,
              company: comp,
              status: 'Rejected',
              createdAt: rj.date
            });
          }
        });
        return Array.from(map.values());
      });

      // 清理
      setLoading(false);
      delete window.__GMAIL_SYNC_CB;
      document.body.removeChild(script);
    };

    // 动态插入 JSONP script
    const script = document.createElement('script');
    script.src = `${APPS_SCRIPT_URL}?callback=__GMAIL_SYNC_CB`;
    // script.crossOrigin = 'anonymous';
    document.body.appendChild(script);
  };

  // 首次挂载自动同步
  useEffect(() => {
    syncFromGmail();
  }, []);

  // 手动刷新
  const handleRefresh = () => {
    syncFromGmail();
  };

  // —— CRUD & Import —— //
  const handleSubmit = e => {
    e.preventDefault();
    setJobs([
      ...jobs,
      {
        id: Date.now(),
        title: jobTitle.trim(),
        company: company.trim(),
        status,
        createdAt: new Date().toLocaleString()
      }
    ]);
    setJobTitle('');
    setCompany('');
    setStatus('Applied');
  };

  const handleDelete = id => {
    setJobs(jobs.filter(j => j.id !== id));
  };

  const handleStatusChange = (id, newStatus) => {
    setJobs(jobs.map(j => (j.id === id ? { ...j, status: newStatus } : j)));
  };

  const handleImport = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target.result);
        const formatted = imported.map((j, idx) => ({
          id: Date.now() + idx + Math.random(),
          title: (j.title || '').trim(),
          company: (j.company || '').trim(),
          status: 'Applied',
          createdAt: j.appliedAt || new Date().toLocaleString()
        }));
        setJobs(prev => {
          const map = new Map();
          prev.forEach(j => map.set(makeKey(j.title, j.company), j));
          formatted.forEach(j => {
            const key = makeKey(j.title, j.company);
            if (!map.has(key)) map.set(key, j);
          });
          return Array.from(map.values());
        });
      } catch {
        alert('导入失败：JSON 格式不正确');
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  // —— 搜索 & 分页 —— //
  const filtered = jobs.filter(
    j =>
      j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      j.company.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const firstIndex = (currentPage - 1) * itemsPerPage;
  const currentJobs = filtered.slice(firstIndex, firstIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-3xl font-bold text-center mb-4 text-indigo-600">
          Job Tracker
        </h1>

        {/* 同步指示 & 刷新按钮 */}
        {loading && (
          <div className="text-center mb-4 text-gray-500">同步中，请稍候…</div>
        )}
        <div className="text-right mb-4">
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            刷新同步
          </button>
        </div>

        {/* 导入 LinkedIn JSON */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            导入 LinkedIn 已申请职位
          </label>
          <input
            type="file"
            accept="application/json"
            onChange={handleImport}
            className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4 file:rounded
                       file:border-0 file:text-sm file:font-semibold
                       file:bg-indigo-50 file:text-indigo-700
                       hover:file:bg-indigo-100"
          />
        </div>

        {/* 搜索框 */}
        <input
          type="text"
          placeholder="搜索职位或公司名"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full mb-6 p-2 border border-gray-300 rounded"
        />

        {/* 统计 */}
        <div className="mb-4 text-sm text-gray-600">
          <strong>状态统计：</strong>
          Applied: {jobs.filter(j => j.status === 'Applied').length} ｜{' '}
          Interviewing:{' '}
          {jobs.filter(j => j.status === 'Interviewing').length} ｜{' '}
          Rejected: {jobs.filter(j => j.status === 'Rejected').length}
        </div>

        {/* 添加职位表单 */}
        <form onSubmit={handleSubmit} className="mb-6 space-y-4">
          <input
            type="text"
            placeholder="Job Title"
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            type="text"
            placeholder="Company"
            value={company}
            onChange={e => setCompany(e.target.value)}
            required
            className="w-full p-2 border border-gray-300 rounded"
          />
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          >
            <option value="Applied">Applied</option>
            <option value="Interviewing">Interviewing</option>
            <option value="Rejected">Rejected</option>
          </select>
          <button
            type="submit"
            className="w-full bg-indigo-500 text-white py-2 px-4 rounded hover:bg-indigo-600 transition"
          >
            Add Job
          </button>
        </form>

        {/* 职位列表 */}
        <ul className="space-y-4">
          {currentJobs.map(job => (
            <li
              key={job.id}
              className="border rounded p-4 flex flex-col gap-2 bg-gray-50 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-lg font-semibold text-gray-800">
                    {job.title} @ {job.company}
                  </div>
                  <div className="text-sm text-gray-500">
                    添加于：{job.createdAt}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(job.id)}
                  className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
                >
                  删除
                </button>
              </div>
              <div className="text-sm">
                状态：
                <select
                  value={job.status}
                  onChange={e => handleStatusChange(job.id, e.target.value)}
                  className="ml-2 border border-gray-300 rounded px-2 py-1"
                >
                  <option value="Applied">Applied</option>
                  <option value="Interviewing">Interviewing</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </li>
          ))}
        </ul>

        {/* 分页 */}
        <div className="mt-6 flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border rounded-full disabled:opacity-50"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => setCurrentPage(p)}
              className={`w-8 h-8 flex items-center justify-center rounded-full transition ${
                currentPage === p
                  ? 'bg-indigo-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 border rounded-full disabled:opacity-50"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
