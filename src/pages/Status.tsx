import React, { useEffect, useState } from 'react';

interface Service {
  name: string;
  status: string;
  uptime: string;
}

export default function Status() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/status')
      .then(r => r.json())
      .then(data => {
        setServices(data.services);
        setLoading(false);
      });
  }, []);

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-3xl p-10">
        <h1 className="text-3xl font-bold mb-2">System Status</h1>
        <p className="text-gray-500 mb-8">Current operational status of all platform services.</p>

        {loading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded-xl w-full"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {services.map(service => (
              <div key={service.name} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <div>
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                  <p className="text-sm text-gray-500">Uptime: {service.uptime}</p>
                </div>
                <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-xs font-bold text-green-700 uppercase tracking-wide">{service.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
