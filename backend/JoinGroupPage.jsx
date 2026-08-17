import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useStudyGroupStore from '../store/studyGroupStore';
import { Users, Lock, Globe, CheckCircle, XCircle, AlertTriangle, Loader, ArrowLeft } from 'lucide-react';

const InfoPill = ({ icon, text }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
    {icon}
    {text}
  </span>
);

const JoinGroupPage = () => {
  const { groupId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const inviteCode = queryParams.get('code');

  const {
    groupToJoin,
    isDetailLoading,
    error,
    fetchGroupForJoining,
    joinGroup,
    clearJoinState,
  } = useStudyGroupStore();

  const [joinStatus, setJoinStatus] = useState('idle'); // idle, joining, success, error
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    const identifier = groupId || inviteCode;
    if (identifier) {
      fetchGroupForJoining(identifier);
    }
    return () => {
      clearJoinState();
    };
  }, [groupId, inviteCode, fetchGroupForJoining, clearJoinState]);

  const handleJoin = async () => {
    setJoinStatus('joining');
    setJoinError('');
    const result = await joinGroup(groupToJoin._id);
    if (result && result.group) {
      setJoinStatus('success');
      setTimeout(() => {
        navigate(`/study-groups/${groupToJoin._id}`);
      }, 1500);
    } else {
      setJoinStatus('error');
      // The error from the store will be used, but we can set a generic one too.
      setJoinError(error || 'Could not join the group. You may already be a member or the group is full.');
    }
  };

  const renderContent = () => {
    if (isDetailLoading && !groupToJoin) {
      return <div className="flex justify-center items-center p-10"><Loader className="animate-spin" /> <span className="ml-2">Loading group details...</span></div>;
    }

    if (!groupToJoin) {
      return (
        <div className="text-center p-10">
          <XCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Group Not Found</h3>
          <p className="mt-1 text-sm text-gray-500">{error || "The group ID or invite code is invalid or has expired."}</p>
        </div>
      );
    }

    const { name, description, members, isPublic, category, skillLevel } = groupToJoin;

    return (
      <>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
          <p className="mt-2 text-sm text-gray-600">{description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <InfoPill icon={isPublic ? <Globe size={14} /> : <Lock size={14} />} text={isPublic ? 'Public' : 'Private'} />
            <InfoPill icon={<Users size={14} />} text={`${members?.length || 0} members`} />
            {category && <InfoPill icon={<></>} text={category} />}
            {skillLevel && <InfoPill icon={<></>} text={skillLevel} />}
          </div>
        </div>
        <div className="bg-gray-50 p-6">
          {joinStatus === 'idle' && (
            <button onClick={handleJoin} className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition-colors">
              Join Group
            </button>
          )}
          {joinStatus === 'joining' && (
            <button disabled className="w-full bg-blue-400 text-white font-semibold py-2.5 rounded-lg cursor-not-allowed flex items-center justify-center gap-2">
              <Loader className="animate-spin" size={20} /> Joining...
            </button>
          )}
          {joinStatus === 'success' && (
            <div className="text-center font-semibold text-green-600 flex items-center justify-center gap-2">
              <CheckCircle size={20} /> Joined Successfully! Redirecting...
            </div>
          )}
          {(joinStatus === 'error' || error) && (
            <div className="text-center text-red-600">
              <p className="font-semibold flex items-center justify-center gap-2"><AlertTriangle size={20} /> Error Joining Group</p>
              <p className="text-sm">{joinError || error}</p>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-4">
            <button onClick={() => navigate(-1)} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mx-auto">
                <ArrowLeft size={14} /> Back
            </button>
        </div>
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default JoinGroupPage;