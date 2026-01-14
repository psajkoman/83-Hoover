'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import Link from 'next/link';

type Leave = {
  id: string;
  status: 'AWAY' | 'RETURNED' | 'DENIED';
  start_date: string;
  end_date: string;
};

const statusColors = {
  AWAY: 'bg-orange-500/20 text-orange-400',
  RETURNED: 'bg-green-500/20 text-green-400',
  DENIED: 'bg-red-500/20 text-red-400',
};

export default function LeavesSection() {
  const { data: session, status } = useSession();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLeaves = async () => {
      if (status !== 'authenticated') return;
      
      try {
        const response = await fetch('/api/leaves?scope=my');
        if (!response.ok) throw new Error('Failed to fetch leaves');
        const data = await response.json();
        setLeaves(data.leaves || []);
      } catch (err) {
        console.error('Error fetching leaves:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaves();
  }, [status]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-white mb-4">My Leaves</h3>
      
      {leaves.length === 0 ? (
        <p className="text-gray-400">No leaves found.</p>
      ) : (
        <div className="space-y-2">
          {leaves.map((leave) => (
            <Link 
              key={leave.id}
              href={`/leaves/${leave.id}`}
              className="block p-3 bg-gray-800/50 hover:bg-gray-800/70 rounded-md transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-white">
                  {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${statusColors[leave.status] || 'bg-gray-500/20'}`}>
                  {leave.status.charAt(0) + leave.status.slice(1).toLowerCase()}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
