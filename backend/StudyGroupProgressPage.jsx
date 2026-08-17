import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { CheckCircle, Clock, Target, Activity, Calendar } from 'lucide-react';

// Mock data for analytics. In a real app, this would come from the store.
const weeklyActivityData = [
  { day: 'Mon', hours: 2 },
  { day: 'Tue', hours: 3 },
  { day: 'Wed', hours: 1.5 },
  { day: 'Thu', hours: 4 },
  { day: 'Fri', hours: 2.5 },
  { day: 'Sat', hours: 5 },
  { day: 'Sun', hours: 1 },
];

const monthlyActivityData = [
  { date: 'Aug 1', problems: 5 },
  { date: 'Aug 5', problems: 8 },
  { date: 'Aug 10', problems: 12 },
  { date: 'Aug 15', problems: 7 },
  { date: 'Aug 20', problems: 15 },
];

const tasksData = [
  { name: 'Done', value: 12 },
  { name: 'In Progress', value: 5 },
  { name: 'To Do', value: 8 },
];

const COLORS = ['#4ade80', '#60a5fa', '#a1a1aa']; // green-400, blue-400, gray-400

const StatCard = ({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
    {icon}
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  </div>
);

const ChartCard = ({ title, icon, children }) => (
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    </div>
    <div style={{ width: '100%', height: 300 }}>
      {children}
    </div>
  </div>
);

const StudyGroupProgressPage = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Group Progress & Analytics</h1>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Problems Solved" value="128" icon={<CheckCircle size={32} className="text-green-500" />} />
        <StatCard title="Total Study Hours" value="42" icon={<Clock size={32} className="text-blue-500" />} />
        <StatCard title="Sessions Completed" value="15" icon={<Calendar size={32} className="text-purple-500" />} />
        <StatCard title="Tasks Completed" value="27" icon={<Target size={32} className="text-orange-500" />} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Weekly Activity" icon={<Activity size={20} className="text-gray-600" />}>
          <ResponsiveContainer>
            <BarChart data={weeklyActivityData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip wrapperClassName="rounded-md border-gray-200 shadow-sm" cursor={{ fill: 'rgba(243, 244, 246, 0.5)' }} />
              <Legend iconSize={10} />
              <Bar dataKey="hours" fill="#8884d8" name="Study Hours" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Task Completion" icon={<Target size={20} className="text-gray-600" />}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={tasksData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                fontSize={12}
              >
                {tasksData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip wrapperClassName="rounded-md border-gray-200 shadow-sm" />
              <Legend iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="Monthly Problem Solving" icon={<Calendar size={20} className="text-gray-600" />}>
            <ResponsiveContainer>
              <LineChart data={monthlyActivityData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip wrapperClassName="rounded-md border-gray-200 shadow-sm" />
                <Legend iconSize={10} />
                <Line type="monotone" dataKey="problems" name="Problems Solved" stroke="#82ca9d" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

export default StudyGroupProgressPage;