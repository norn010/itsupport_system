import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ActivityTimeline = ({ ticketId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [ticketId]);

  const fetchActivities = async () => {
    try {
      const { data } = await axios.get(`/api/tickets/${ticketId}/activity`);
      setActivities(data);
    } catch (error) {
      console.error('Failed to fetch activity logs', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (actionType) => {
    switch (actionType) {
      case 'ticket_created': return '📝';
      case 'status_changed': return '🔄';
      case 'priority_changed': return '⚡';
      case 'staff_assigned': return '👤';
      default: return '📌';
    }
  };

  if (loading) return <div className="text-center py-4 text-sm text-gray-500">Loading timeline...</div>;

  if (activities.length === 0) return <div className="text-sm text-gray-500 italic mt-4">No activity recorded yet.</div>;

  return (
    <div className="mt-6 border-l-4 border-l-indigo-500 bg-indigo-50/30 p-4 rounded-r-lg shadow-sm">
      <h2 className="text-xl font-bold mb-6 text-indigo-800 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Activity Timeline
      </h2>

      <div className="relative border-l-2 border-indigo-200 ml-3 space-y-6">
        {activities.map((log) => (
          <div key={log.id} className="relative pl-6">
            {/* Timeline Dot */}
            <span className="absolute -left-[18px] top-1 bg-white border-2 border-indigo-300 w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm">
              {getIcon(log.action_type)}
            </span>
            
            <div className="bg-white p-3 rounded shadow-sm border border-indigo-100">
              <div className="flex justify-between">
                <span className="font-semibold text-gray-800 text-sm">
                  {log.description}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                By: <span className="font-medium">{log.actor_name}</span> ({log.actor_type})
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityTimeline;
