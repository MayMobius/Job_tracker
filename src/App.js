import { useEffect, useState } from 'react';

// 生成去重 key
const makeKey = (title, company) =>
  `${title.trim().toLowerCase()}|${company.trim().toLowerCase()}`;

function App() {
  // ▼ 原 Gmail 同步逻辑（已注释）▼
  /*
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/……/exec';
  const syncFromGmail = () => { … };
  useEffect(() => { syncFromGmail() }, []);
  */
  // ▲ 原 Gmail 同步逻辑（已注释）▲

  // 表单、搜索与筛选状态
  const [jobTitle, setJobTitle]       = useState('');
  const [company, setCompany]         = useState('');
  const [status, setStatus]           = useState('Applied');
  const [searchTerm, setSearchTerm]   = useState('');
  const [statusFilter, setStatusFilter] = useState('All');  // 新增

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 同步中指示（Gmail 同步被注释掉，暂时不用）
  const [loading, setLoading] = useState(false);

  // 主数据，从 localStorage 读取
  const [jobs, setJobs] = useState(() => {
    const saved = localStorage.getItem('jobList');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => {
    localStorage.setItem('jobList', JSON.stringify(jobs));
  }, [jobs]);

  // 一键清空
  const handleClearAll = () => {
    if (window.confirm('确定要清空所有记录吗？此操作不可恢复。')) {
      setJobs([]);
    }
  };

  // 添加（含去重）
  const handleSubmit = e => {
    e.preventDefault();
    const key = makeKey(jobTitle, company);
    if (jobs.some(j => makeKey(j.title, j.company) === key)) {
      alert('已存在相同的职位和公司，跳过添加');
      return;
    }
    setJobs([
      ...jobs,
      {
        id: Date.now(),
        title: jobTitle.trim(),
        company: company.trim(),
        status,
        createdAt: new Date().toLocaleString(),
      }
    ]);
    setJobTitle('');
    setCompany('');
    setStatus('Applied');
  };

  // 删除
  const handleDelete = id => {
    setJobs(jobs.filter(j => j.id !== id));
  };

  // 改状态
  const handleStatusChange = (id, newStatus) => {
    setJobs(jobs.map(j =>
      j.id === id ? { ...j, status: newStatus } : j
    ));
  };

  // JSON 导入并去重
  const handleImport = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const imported = JSON.parse(evt.target.result);
        const formatted = imported.map((j,i) => ({
          id: Date.now() + i,
          title: (j.title||'').trim(),
          company: (j.company||'').trim(),
          status: 'Applied',
          createdAt: j.appliedAt || new Date().toLocaleString(),
        }));
        setJobs(prev => {
          const map = new Map();
          prev.forEach(j => map.set(makeKey(j.title,j.company), j));
          formatted.forEach(j => {
            const key = makeKey(j.title,j.company);
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

  // 搜索 + 筛选
  let filtered = jobs.filter(j =>
    j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.company.toLowerCase().includes(searchTerm.toLowerCase())
  );
  if (statusFilter !== 'All') {
    filtered = filtered.filter(j => j.status === statusFilter);
  }

  // 分页计算
  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentJobs = filtered.slice(startIndex, startIndex + itemsPerPage);

  // 生成分页页码列表（含省略号）
  const getPageList = () => {
    const maxNumbers = 6;
    const pages = [];
    const leftCount = Math.floor(maxNumbers / 2);
    const rightCount = maxNumbers - leftCount - 1;

    if (totalPages <= maxNumbers) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    if (currentPage <= leftCount + 1) {
      for (let i = 1; i <= maxNumbers; i++) pages.push(i);
      pages.push('...', totalPages);
      return pages;
    }
    if (currentPage >= totalPages - rightCount) {
      pages.push(1, '...');
      for (let i = totalPages - maxNumbers + 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }
    pages.push(1, '...');
    const start = currentPage - leftCount;
    for (let i = start; i < start + maxNumbers; i++) {
      pages.push(i);
    }
    pages.push('...', totalPages);
    return pages;
  };
  const pageList = getPageList();

  // 状态颜色映射
  const statusColor = {
    Applied: 'text-green-600',
    Interviewing: 'text-blue-600',
    Rejected: 'text-red-600',
  };

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">

        <h1 className="text-3xl font-bold text-center mb-6 text-indigo-600">
          Job Tracker
        </h1>

        {/* 一键清空 */}
        <div className="text-right mb-4">
          <button
            onClick={handleClearAll}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
          >
            清空所有
          </button>
        </div>

        {/* 导入 JSON */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            导入 LinkedIn 已申请职位
          </label>
          <input
            type="file" accept="application/json"
            onChange={handleImport}
            className="block w-full text-sm text-gray-500
                       file:mr-4 file:py-2 file:px-4
                       file:rounded file:border-0 file:text-sm
                       file:font-semibold file:bg-indigo-50
                       file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>

        {/* 搜索和状态筛选 */}
        <div className="flex flex-col sm:flex-row sm:space-x-4 mb-6">
          <input
            type="text"
            placeholder="搜索职位或公司名"
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="flex-1 mb-2 sm:mb-0 p-2 border border-gray-300 rounded"
          />
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-48 p-2 border border-gray-300 rounded"
          >
            <option value="All">All</option>
            <option value="Applied">Applied</option>
            <option value="Interviewing">Interviewing</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {/* 状态统计 */}
        <div className="mb-6 text-sm text-gray-600">
          <strong>总数：</strong>{jobs.length} &nbsp;|&nbsp;
          <span className={statusColor.Applied}>
            Applied: {jobs.filter(j=>j.status==='Applied').length}
          </span> &nbsp;|&nbsp;
          <span className={statusColor.Interviewing}>
            Interviewing: {jobs.filter(j=>j.status==='Interviewing').length}
          </span> &nbsp;|&nbsp;
          <span className={statusColor.Rejected}>
            Rejected: {jobs.filter(j=>j.status==='Rejected').length}
          </span>
        </div>

        {/* 添加表单 */}
        <form onSubmit={handleSubmit} className="mb-6 space-y-4">
          <input
            type="text" placeholder="Job Title"
            value={jobTitle} onChange={e=>setJobTitle(e.target.value)}
            required className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            type="text" placeholder="Company"
            value={company} onChange={e=>setCompany(e.target.value)}
            required className="w-full p-2 border border-gray-300 rounded"
          />
          <select
            value={status}
            onChange={e=>setStatus(e.target.value)}
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

        {/* 列表 */}
        <ul className="space-y-4 mb-6">
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
                  onClick={()=>handleDelete(job.id)}
                  className="text-white bg-red-500 hover:bg-red-600 px-3 py-1 rounded"
                >
                  删除
                </button>
              </div>
              <div className="flex items-center text-sm">
                状态：
                <span className={`${statusColor[job.status]} font-medium ml-2`}>
                  {job.status}
                </span>
                <select
                  value={job.status}
                  onChange={e=>handleStatusChange(job.id, e.target.value)}
                  className="ml-4 border border-gray-300 rounded px-2 py-1"
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
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 border rounded-full disabled:opacity-50"
          >
            ‹
          </button>
          {pageList.map((item, idx) =>
            item === '...' ? (
              <span key={idx} className="px-2">…</span>
            ) : (
              <button
                key={item}
                onClick={() => setCurrentPage(item)}
                className={`w-8 h-8 flex items-center justify-center rounded-full transition ${
                  currentPage === item ? 'bg-indigo-500 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}                
              >
                {item}
              </button>
            )
          )}
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
