import React, { useEffect } from 'react';
import { useParams, Link, NavLink, Outlet } from 'react-router-dom';
import useStudyGroupStore from '../store/studyGroupStore';
import { Users, Lock, Globe, Share2, MoreHorizontal, Settings, LogOut, UserPlus, BarChart, BookOpen, TrendingUp, Trophy, FolderOpen } from 'lucide-react';
// A placeholder for an auth store to get the current user
// import { useAuthStore } from '../../auth/store/authStore';

// --- Mock Auth Store ---
// In a real app, this would come from your authentication context or store
const useAuthStore = () => ({
  user: { id: 'mock-user-id' }, // Replace with actual user ID
});
// -----------------------

const StudyGroupDetailsPage = () => {
  const { groupId } = useParams();
  const { dashboardData, isDetailLoading, error, fetchGroupDashboard, joinGroup, leaveGroup, members } = useStudyGroupStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (groupId) {
      fetchGroupDashboard(groupId);
    }
  }, [groupId, fetchGroupDashboard]);

  const handleJoin = () => joinGroup(groupId);
  const handleLeave = () => leaveGroup(groupId);

  const renderMembershipButton = () => {
    if (!dashboardData?.group || isDetailLoading) return null;
    
    const membership = members.find(m => m.userId._id === user.id);
    
    if (membership?.status === 'APPROVED') {
      return (
        <button onClick={handleLeave} className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors shadow-sm">
          <LogOut size={16} />
          <span>Leave Group</span>
        </button>
      );
    }

    // A full implementation would check for a pending request here
    return <button onClick={handleJoin} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors shadow-sm"><UserPlus size={16} /><span>Join Group</span></button>;
  };
  
  if (isDetailLoading) return <p className="p-4">Loading group details...</p>;
  if (error && !dashboardData) return <p className="p-4 text-red-500">Error: {error}</p>;
  if (!dashboardData?.group) return <p className="p-4">Group not found.</p>;

  const group = dashboardData.group;
  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`;

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* --- Premium Header --- */}
      <div className="border-b border-gray-200">
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-r from-blue-50 to-indigo-100">
          {/* In a real app, this would be an <img /> or a background-image */}
        </div>

        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start -mt-16">
            {/* Avatar and Group Info */}
            <div className="flex items-end space-x-4">
              <div className="w-32 h-32 bg-white rounded-lg shadow-lg border-4 border-white flex items-center justify-center">
                {/* Placeholder for Group Avatar */}
                <span className="text-4xl font-bold text-gray-400">{group.name.charAt(0)}</span>
              </div>
              <div className="pb-2">
                <h1 className="text-3xl font-bold text-gray-900">{group.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                  <span className="flex items-center gap-1.5">
                    {group.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                    {group.isPublic ? 'Public' : 'Private'}
                  </span>
                  <span className="flex items-center gap-1.5"><Users size={14} /> {members.length} members</span>
                  <span className="flex items-center gap-1.5">
                    <BarChart size={14} /> 
                    {group.skillLevel || 'All Levels'}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 mt-4 md:mt-0 pb-2">
              <button className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-sm">
                <Share2 size={16} />
                <span>Invite</span>
              </button>
              {renderMembershipButton()}
              <Link to={`/study-groups/${groupId}/settings`} className="p-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-100"><Settings size={20} /></Link>
              <button className="p-2 text-gray-600 bg-white border rounded-lg hover:bg-gray-100"><MoreHorizontal size={20} /></button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex space-x-2 mt-4">
            <NavLink to={`/study-groups/${groupId}`} end className={navLinkClass}>Overview</NavLink>
            <NavLink to={`/study-groups/${groupId}/discussions`} className={navLinkClass}>Discussions</NavLink>
            <NavLink to={`/study-groups/${groupId}/tasks`} className={navLinkClass}>Tasks & Goals</NavLink>
            <NavLink to={`/study-groups/${groupId}/resources`} className={navLinkClass}>Resources</NavLink>
            <NavLink to={`/study-groups/${groupId}/resources`} className={navLinkClass}>Resources</NavLink>
            <NavLink to={`/study-groups/${groupId}/sessions`} className={navLinkClass}>Study Rooms</NavLink>
            <NavLink to={`/study-groups/${groupId}/members`} className={navLinkClass}>Members</NavLink>
            <NavLink to={`/study-groups/${groupId}/leaderboard`} className={navLinkClass}>Leaderboard</NavLink>
            <NavLink to={`/study-groups/${groupId}/progress`} className={navLinkClass}>Progress</NavLink>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="container mx-auto p-4">
        <Outlet />
      </div>
    </div>
  );
};

export default StudyGroupDetailsPage;