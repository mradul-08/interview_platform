import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import useStudyGroupStore from '../store/studyGroupStore';
import GroupCard from '../components/GroupCard';

const StudyGroupsPage = () => {
  const { groups, isLoading, error, fetchGroups } = useStudyGroupStore();

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Discover Study Groups</h1>
        <Link to="/study-groups/create" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Create Group
        </Link>
      </div>

      {isLoading && <p>Loading groups...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {!isLoading && groups.map((group) => (
          <GroupCard key={group._id} group={group} />
        ))}
      </div>
       { !isLoading && groups.length === 0 && (
        <p>No public groups found. Why not create one?</p>
      )}
    </div>
  );
};

export default StudyGroupsPage;