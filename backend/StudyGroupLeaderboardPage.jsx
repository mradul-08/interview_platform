import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import useStudyGroupStore from '../store/studyGroupStore';
import { Trophy, Star, Award, Clock, CheckCircle } from 'lucide-react';

// Mock data for leaderboard. In a real app, this would come from the store.
const mockLeaderboardData = [
  { id: 'user-1', name: 'Alex Johnson', xp: 1250, problemsSolved: 75, studyHours: 30, streak: 15, rank: 1 },
  { id: 'user-2', name: 'Maria Garcia', xp: 1100, problemsSolved: 60, studyHours: 25, streak: 12, rank: 2 },
  { id: 'user-3', name: 'Sam Lee', xp: 980, problemsSolved: 50, studyHours: 20, streak: 10, rank: 3 },
  { id: 'user-4', name: 'David Kim', xp: 820, problemsSolved: 45, studyHours: 18, streak: 8, rank: 4 },
  { id: 'user-5', name: 'Emily Chen', xp: 700, problemsSolved: 40, studyHours: 15, streak: 7, rank: 5 },
  { id: 'user-6', name: 'Chris Green', xp: 650, problemsSolved: 38, studyHours: 14, streak: 6, rank: 6 },
  { id: 'user-7', name: 'Anna White', xp: 580, problemsSolved: 35, studyHours: 12, streak: 5, rank: 7 },
];

const StudyGroupLeaderboardPage = () => {
  const { groupId } = useParams();
  // const { leaderboard, isLoading, error, fetchLeaderboard } = useStudyGroupStore();
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // fetchLeaderboard(groupId);
    // Mocking fetch
    setTimeout(() => {
      setLeaderboard(mockLeaderboardData);
      setIsLoading(false);
    }, 500);
  }, [groupId]);

  if (isLoading) {
    return <p className="p-4 text-gray-700">Loading leaderboard...</p>;
  }

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-10 bg-white rounded-lg shadow-sm border border-gray-200">
        <Trophy size={40} className="mx-auto text-gray-400" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">No Leaderboard Data Yet</h3>
        <p className="mt-1 text-sm text-gray-500">Start studying and solving problems to climb the ranks!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Group Leaderboard</h1>
      <p className="text-sm text-gray-600">See how you and your fellow members stack up!</p>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">XP/Points</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problems Solved</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Study Hours</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Streak</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leaderboard.map((member, index) => (
              <tr key={member.id} className={`${index < 3 ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {member.rank === 1 && <Award size={20} className="text-yellow-500 mr-2" />}
                    {member.rank === 2 && <Award size={20} className="text-gray-400 mr-2" />}
                    {member.rank === 3 && <Award size={20} className="text-amber-700 mr-2" />}
                    <span className={`text-sm font-medium ${index < 3 ? 'text-blue-800' : 'text-gray-900'}`}>{member.rank}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                      {member.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.xp}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.problemsSolved}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.studyHours}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{member.streak} days</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudyGroupLeaderboardPage;