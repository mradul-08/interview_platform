import React from 'react';
import useStudyGroupStore from '../store/studyGroupStore';
import { Link, useParams } from 'react-router-dom';
import { Activity, ArrowRight, BarChart3, Calendar, CheckCircle, Clock, MessageSquare, Target, Users, Zap } from 'lucide-react';

const Widget = ({ title, icon, children, viewAllLink }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-md font-semibold text-gray-800">{title}</h3>
      </div>
      {viewAllLink && (
        <Link to={viewAllLink} className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
          View all <ArrowRight size={14} />
        </Link>
      )}
    </div>
    <div className="p-4 flex-grow">
      {children}
    </div>
  </div>
);

const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-gray-50 p-3 rounded-lg flex items-start gap-3">
    <div className={`p-2 rounded-full ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const StudyGroupOverviewPage = () => {
  const { groupId } = useParams();
  const { dashboardData, discussions } = useStudyGroupStore();

  if (!dashboardData) {
    return <p>Loading overview...</p>;
  }

  // Mock data for a richer UI, to be replaced by real data from dashboardData
  const stats = {
    streak: 5,
    problemsSolved: 78,
    studyHours: 12,
    activeMembers: dashboardData.members?.length || 0,
  };
  
  const recentDiscussions = discussions.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* --- Statistics Row --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Group Streak" value={`${stats.streak} days`} icon={<Zap size={20} className="text-orange-800" />} color="bg-orange-100" />
        <StatCard title="Problems Solved" value={stats.problemsSolved} icon={<CheckCircle size={20} className="text-green-800" />} color="bg-green-100" />
        <StatCard title="Study Hours" value={stats.studyHours} icon={<Clock size={20} className="text-blue-800" />} color="bg-blue-100" />
        <StatCard title="Active Members" value={stats.activeMembers} icon={<Users size={20} className="text-indigo-800" />} color="bg-indigo-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- Main Column --- */}
        <div className="lg:col-span-2 space-y-6">
          <Widget title="Activity Feed" icon={<Activity size={18} className="text-gray-600" />}>
            <div className="text-center text-gray-500 py-8">
              <p>Activity Feed coming soon!</p>
              <p className="text-sm">This will show recent actions from group members.</p>
            </div>
          </Widget>
          <Widget title="Recent Discussions" icon={<MessageSquare size={18} className="text-gray-600" />} viewAllLink={`/study-groups/${groupId}/discussions`}>
            {recentDiscussions.length > 0 ? (
              <ul className="space-y-3">
                {recentDiscussions.map(d => (
                  <li key={d._id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50">
                    <div>
                      <Link to={`/study-groups/${groupId}/discussions/${d._id}`} className="font-medium text-gray-800 hover:underline">{d.title}</Link>
                      <p className="text-xs text-gray-500">by {d.authorId?.name || 'Unknown'}</p>
                    </div>
                    <span className="text-xs text-gray-500 flex items-center gap-1"><MessageSquare size={12} /> {d.replies?.length || 0}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <p>No discussions started yet.</p>
                <Link to={`/study-groups/${groupId}/discussions`} className="text-sm font-medium text-blue-600 hover:underline">Start the first one!</Link>
              </div>
            )}
          </Widget>
        </div>

        {/* --- Sidebar Column --- */}
        <div className="space-y-6">
          <Widget title="Upcoming Sessions" icon={<Calendar size={18} className="text-gray-600" />} viewAllLink={`/study-groups/${groupId}/sessions`}>
            {dashboardData.upcomingSession ? (
              <div>
                <p className="font-bold">{dashboardData.upcomingSession.title}</p>
                <p className="text-sm text-gray-600">{new Date(dashboardData.upcomingSession.scheduledTime).toLocaleString()}</p>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">
                <p>No sessions scheduled.</p>
                <Link to={`/study-groups/${groupId}/sessions`} className="text-sm font-medium text-blue-600 hover:underline">Schedule one</Link>
              </div>
            )}
          </Widget>
          <Widget title="Weekly Goals" icon={<Target size={18} className="text-gray-600" />} viewAllLink={`/study-groups/${groupId}/tasks`}>
            <div className="text-center text-gray-500 py-4">
              <p>Group goals feature coming soon.</p>
            </div>
          </Widget>
          <Widget title="Member Highlights" icon={<Users size={18} className="text-gray-600" />} viewAllLink={`/study-groups/${groupId}/members`}>
            <ul className="space-y-2">
              {dashboardData.members?.slice(0, 4).map(member => (
                <li key={member.userId._id} className="flex items-center gap-3">
                  <span className="inline-block h-8 w-8 overflow-hidden rounded-full bg-gray-100">
                    <svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{member.userId.name}</p>
                    <p className="text-xs text-gray-500 capitalize">{member.role.toLowerCase()}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Widget>
        </div>
      </div>
    </div>
  );
};

export default StudyGroupOverviewPage;