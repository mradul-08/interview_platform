import React from 'react';
import { Link } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';

const GroupCard = ({ group, isCompact = false }) => {
  if (isCompact) {
    return (
      <Link to={`/study-groups/${group._id}`} className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-400 transition-all">
        <div>
          <p className="font-semibold text-gray-800">{group.name}</p>
          <p className="text-sm text-gray-500">{group.topic || 'General'}</p>
        </div>
        <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-sm text-gray-500"><Users size={14} /> {group.memberCount || 0}</span>
            <ArrowRight size={16} className="text-gray-400" />
        </div>
      </Link>
    );
  }

  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-white">
      <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
      <p className="text-gray-600 mb-2">Topic: {group.topic || 'General'}</p>
      <p className="text-gray-700 mb-4 truncate">{group.description || 'No description available.'}</p>
      <Link to={`/study-groups/${group._id}`} className="text-blue-500 hover:underline">
        View Details
      </Link>
    </div>
  );
};

export default GroupCard;