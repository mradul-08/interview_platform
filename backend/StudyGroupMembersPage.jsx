import React from 'react';
import useStudyGroupStore from '../store/studyGroupStore';

const StudyGroupMembersPage = () => {
  const { members, currentGroup, isDetailLoading } = useStudyGroupStore();

  if (isDetailLoading) {
    return <p>Loading members...</p>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Members of {currentGroup?.name} ({members.length})</h2>
      <div className="space-y-3">
        {members.map(member => (
          <div key={member.userId._id} className="flex items-center justify-between p-3 bg-white rounded shadow-sm">
            <div>
              <p className="font-semibold">{member.userId.name}</p>
              <p className="text-sm text-gray-500">{member.userId.email}</p>
            </div>
            <span className="text-sm font-medium text-gray-600 bg-gray-200 px-2 py-1 rounded-full">
              {member.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StudyGroupMembersPage;