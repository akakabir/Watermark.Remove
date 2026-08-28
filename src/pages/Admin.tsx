import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function Admin() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem('admin_auth') === 'true');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/analytics')
        .then(r => r.json())
        .then(data => setAnalytics(data));
    }
  }, [isAuthenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'watermark' && (password === 'removed_u_lol' || password === 'removed_u _lol')) {
      localStorage.setItem('admin_auth', 'true');
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Invalid credentials');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return (
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-sm border border-gray-200 rounded-2xl p-8 bg-white">
          <div className="flex items-center justify-center mb-6 space-x-2">
             <div className="w-8 h-8 bg-black flex items-center justify-center rounded-sm">
                <div className="w-4 h-4 border-2 border-white rounded-full"></div>
             </div>
             <span className="text-xl font-bold tracking-tighter">admin</span>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <button
              type="submit"
              className="w-full bg-black text-white rounded-lg py-2 text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Sign In
            </button>
          </form>
        </div>
      </main>
    );
  }

  const COLORS = ['#000000', '#444444', '#888888', '#CCCCCC'];

  return (
    <main className="flex-1 flex flex-col p-8 bg-white overflow-y-auto">
      <div className="max-w-6xl mx-auto w-full space-y-12">
        <div className="flex justify-between items-start">
           <div>
             <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
             <p className="text-gray-500 mt-1">System-wide processing metrics and user statistics.</p>
           </div>
           <button 
             onClick={handleLogout}
             className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
           >
             Logout
           </button>
        </div>

        {analytics ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50 flex flex-col justify-center">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Daily Active Users</p>
                <p className="text-4xl font-bold">{analytics.dailyActiveUsers.toLocaleString()}</p>
              </div>
              <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50 flex flex-col justify-center">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Watermarks Removed</p>
                <p className="text-4xl font-bold">{analytics.watermarksRemoved.toLocaleString()}</p>
              </div>
              <div className="border border-gray-100 rounded-2xl p-6 bg-gray-50 flex flex-col justify-center">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Avg Processing Time</p>
                <p className="text-4xl font-bold">{analytics.avgProcessingTime}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="border border-gray-100 rounded-3xl p-8 bg-white shadow-sm">
                   <h3 className="font-bold mb-6">Processing Volume (Last 7 Days)</h3>
                   <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={analytics.chartData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEEEEE" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#888'}} />
                         <YAxis axisLine={false} tickLine={false} tick={{fill: '#888'}} />
                         <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                         <Line type="monotone" dataKey="count" stroke="#000000" strokeWidth={3} dot={{r: 4, fill: '#000', strokeWidth: 0}} activeDot={{r: 6}} />
                       </LineChart>
                     </ResponsiveContainer>
                   </div>
                </div>
                
                <div className="border border-gray-100 rounded-3xl p-8 bg-white shadow-sm">
                   <h3 className="font-bold mb-6">File Type Distribution</h3>
                   <div className="h-[300px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                       <PieChart>
                         <Pie
                           data={analytics.fileTypes}
                           cx="50%"
                           cy="50%"
                           innerRadius={60}
                           outerRadius={100}
                           paddingAngle={5}
                           dataKey="value"
                         >
                           {analytics.fileTypes.map((entry: any, index: number) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                           ))}
                         </Pie>
                         <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                         <Legend verticalAlign="bottom" height={36} />
                       </PieChart>
                     </ResponsiveContainer>
                   </div>
                </div>
            </div>
          </>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>
    </main>
  );
}
