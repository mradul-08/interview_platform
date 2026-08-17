import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStudyGroupStore from '../store/studyGroupStore';
import { Shield, Lock, Bell, AlertTriangle, Trash2, LogOut, UserCog } from 'lucide-react';

const SettingsCard = ({ title, description, children }) => (
  <div className="bg-white rounded-lg shadow-sm border border-gray-200">
    <div className="p-6 border-b border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
    </div>
    <div className="p-6 space-y-4">
      {children}
    </div>
  </div>
);

const GeneralSettings = ({ group, onSave }) => {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);

  return (
    <SettingsCard title="General" description="Update your group's basic information.">
      <div>
        <label htmlFor="group-name" className="block text-sm font-medium text-gray-700">Group Name</label>
        <input type="text" id="group-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
      </div>
      <div>
        <label htmlFor="group-description" className="block text-sm font-medium text-gray-700">Description</label>
        <textarea id="group-description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea>
      </div>
      {/* Placeholder for avatar/cover upload */}
      <div className="flex justify-end">
        <button onClick={() => onSave({ name, description })} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save Changes</button>
      </div>
    </SettingsCard>
  );
};

const PrivacySettings = ({ groupId }) => {
  const { joinRequests, isLoading, fetchJoinRequests, handleJoinRequest } = useStudyGroupStore();

  useEffect(() => {
    if (groupId) fetchJoinRequests(groupId);
  }, [groupId, fetchJoinRequests]);

  return (
    <SettingsCard title="Privacy & Access" description="Control who can join and see your group.">
      {/* Placeholder for public/private toggle */}
      <h4 className="text-md font-semibold text-gray-800">Pending Join Requests ({joinRequests.length})</h4>
      {isLoading && <p>Loading requests...</p>}
      <div className="space-y-3">
        {!isLoading && joinRequests.length === 0 && <p className="text-gray-500">No pending requests.</p>}
        {joinRequests.map(req => (
          <div key={req.userId._id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
            <div>
              <p className="font-semibold">{req.userId.name}</p>
              <p className="text-sm text-gray-500">{req.userId.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleJoinRequest(groupId, req.userId._id, 'APPROVED')} className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600">Approve</button>
              <button onClick={() => handleJoinRequest(groupId, req.userId._id, 'REJECTED')} className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
};

const DangerZone = ({ onLeave, onDelete, onTransfer }) => (
  <div className="bg-white rounded-lg shadow-sm border border-red-300">
    <div className="p-6 border-b border-red-200">
      <h3 className="text-lg font-semibold text-red-800">Danger Zone</h3>
      <p className="mt-1 text-sm text-red-700">These actions are irreversible. Please be certain.</p>
    </div>
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">Leave Group</p>
          <p className="text-sm text-gray-500">You will lose access to all group content.</p>
        </div>
        <button onClick={onLeave} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">Leave</button>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium">Transfer Ownership</p>
          <p className="text-sm text-gray-500">Transfer this group to another member.</p>
        </div>
        <button onClick={onTransfer} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50">Transfer</button>
      </div>
      <div className="flex justify-between items-center">
        <div>
          <p className="font-medium text-red-600">Delete Group</p>
          <p className="text-sm text-gray-500">All group data will be permanently deleted.</p>
        </div>
        <button onClick={onDelete} className="border border-red-500 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50">Delete</button>
      </div>
    </div>
  </div>
);

const StudyGroupSettingsPage = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { currentGroup, updateGroupSettings, leaveGroup, deleteGroup } = useStudyGroupStore();
  const [activeTab, setActiveTab] = useState('general');

  const handleSaveGeneral = (data) => {
    console.log("Saving general settings:", data);
    // updateGroupSettings(groupId, data);
  };

  const handleLeaveGroup = () => {
    if (window.confirm("Are you sure you want to leave this group?")) {
      console.log("Leaving group...");
      // leaveGroup(groupId).then(() => navigate('/study-groups'));
    }
  };

  const handleDeleteGroup = () => {
    if (window.confirm("Are you sure you want to DELETE this group? This action is permanent.")) {
      console.log("Deleting group...");
      // deleteGroup(groupId).then(() => navigate('/study-groups'));
    }
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Shield },
    { id: 'privacy', name: 'Privacy & Access', icon: Lock },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'danger', name: 'Danger Zone', icon: AlertTriangle, isDanger: true },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Group Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* --- Settings Navigation --- */}
        <aside className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? tab.isDanger ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    : tab.isDanger ? 'text-red-600 hover:bg-red-50' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </aside>

        {/* --- Settings Content --- */}
        <main className="lg:col-span-3">
          {activeTab === 'general' && currentGroup && <GeneralSettings group={currentGroup} onSave={handleSaveGeneral} />}
          {activeTab === 'privacy' && <PrivacySettings groupId={groupId} />}
          {activeTab === 'notifications' && <SettingsCard title="Notifications" description="Manage how you receive notifications for this group. (Coming Soon)" />}
          {activeTab === 'danger' && <DangerZone onLeave={handleLeaveGroup} onDelete={handleDeleteGroup} onTransfer={() => alert('Transfer ownership feature coming soon.')} />}
        </div>
      </div>
    </div>
  );
};

export default StudyGroupSettingsPage;