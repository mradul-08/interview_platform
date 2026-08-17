import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useStudyGroupStore from '../store/studyGroupStore';
import { Check, ChevronRight, ChevronLeft, Users, Lock, Globe, Target, Palette, Info, Eye, Clock, Calendar, SlidersHorizontal } from 'lucide-react';

const steps = [
  { id: 1, name: 'Basic Information', icon: Info },
  { id: 2, name: 'Group Type', icon: Users },
  { id: 3, name: 'Learning Goals', icon: Target },
  { id: 4, name: 'Preferences', icon: SlidersHorizontal },
  { id: 5, name: 'Branding', icon: Palette },
  { id: 6, name: 'Review & Create', icon: Eye },
];

const Stepper = ({ currentStep }) => (
  <nav aria-label="Progress">
    <ol role="list" className="space-y-4 md:flex md:space-y-0 md:space-x-8">
      {steps.map((step, index) => (
        <li key={step.name} className="md:flex-1">
          {currentStep > step.id ? (
            <div className="group flex w-full flex-col border-l-4 border-blue-600 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
              <span className="text-sm font-medium text-blue-600 transition-colors ">{`Step ${step.id}`}</span>
              <span className="text-sm font-medium">{step.name}</span>
            </div>
          ) : currentStep === step.id ? (
            <div className="flex w-full flex-col border-l-4 border-blue-600 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4" aria-current="step">
              <span className="text-sm font-medium text-blue-600">{`Step ${step.id}`}</span>
              <span className="text-sm font-medium">{step.name}</span>
            </div>
          ) : (
            <div className="group flex w-full flex-col border-l-4 border-gray-200 py-2 pl-4 transition-colors md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4">
              <span className="text-sm font-medium text-gray-500 transition-colors">{`Step ${step.id}`}</span>
              <span className="text-sm font-medium">{step.name}</span>
            </div>
          )}
        </li>
      ))}
    </ol>
  </nav>
);

const Step1_BasicInfo = ({ data, updateField }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
    <p className="text-sm text-gray-500">Give your group a name and describe what it's about.</p>
    <div>
      <label htmlFor="name" className="block text-sm font-medium text-gray-700">Group Name</label>
      <input id="name" type="text" value={data.name} onChange={e => updateField('name', e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="e.g., FAANG Interview Prep" />
    </div>
    <div>
      <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
      <textarea id="description" value={data.description} onChange={e => updateField('description', e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" rows="4" placeholder="A short summary of your group's purpose, goals, and who should join."></textarea>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
            <select id="category" value={data.category} onChange={e => updateField('category', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                <option>Software Engineering</option>
                <option>Data Science</option>
                <option>Product Management</option>
                <option>General</option>
            </select>
        </div>
        <div>
            <label htmlFor="skillLevel" className="block text-sm font-medium text-gray-700">Skill Level</label>
            <select id="skillLevel" value={data.skillLevel} onChange={e => updateField('skillLevel', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                <option>Beginner</option>
                <option>Intermediate</option>
                <option>Advanced</option>
                <option>All Levels</option>
            </select>
        </div>
    </div>
  </div>
);

const Step2_GroupType = ({ data, updateField }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium text-gray-900">Group Type</h3>
    <p className="text-sm text-gray-500">Choose who can find and join your group.</p>
    <div className="space-y-3">
      {[{name: 'Public', icon: Globe, description: "Anyone can find and join this group."}, {name: 'Private', icon: Lock, description: "Only members can see who's in the group and what they post. Requires approval to join."}, {name: 'Invite-only', icon: Users, description: "Cannot be found via search. Members can only join if they have an invitation."}].map(type => (
        <div key={type} onClick={() => updateField('privacy', type)} className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${data.privacy === type ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300 hover:border-gray-400'}`}>
          <type.icon className="mr-4 text-gray-500 h-6 w-6 flex-shrink-0" />
          <div>
            <p className="font-medium">{type}</p>
            <p className="text-sm text-gray-500">
              {type === 'Public' && 'Anyone can find and join this group.'}
              {type === 'Private' && 'Only members can see who\'s in the group and what they post.'}
              {type === 'Invite-only' && 'Members can only join if they have an invitation.'}
            </p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Step3_LearningGoals = ({ data, updateField }) => {
  const goals = ['DSA', 'Web Development', 'Interview Preparation', 'Competitive Programming', 'Aptitude'];
  const toggleGoal = (goal) => {
    const newGoals = data.learningGoals.includes(goal)
      ? data.learningGoals.filter(g => g !== goal)
      : [...data.learningGoals, goal];
    updateField('learningGoals', newGoals);
  };
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Learning Goals</h3>
      <p className="text-sm text-gray-500">Select the topics your group will focus on.</p>
      <div className="flex flex-wrap gap-2">
        {goals.map(goal => (
          <button key={goal} type="button" onClick={() => toggleGoal(goal)} className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${data.learningGoals.includes(goal) ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white hover:bg-gray-50 border-gray-300'}`}>
            {goal}
          </button>
        ))}
      </div>
    </div>
  );
};

const Step4_Preferences = ({ data, updateField }) => (
    <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Preferences</h3>
        <p className="text-sm text-gray-500">Set the rules and schedule for your group.</p>
        <div>
            <label htmlFor="maxMembers" className="block text-sm font-medium text-gray-700">Maximum Members</label>
            <input id="maxMembers" type="number" value={data.maxMembers} onChange={e => updateField('maxMembers', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" min="2" max="100" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="weeklyTarget" className="block text-sm font-medium text-gray-700">Weekly Target (hours)</label>
                <div className="flex items-center mt-1">
                    <Clock size={16} className="mr-2 text-gray-400" />
                    <input id="weeklyTarget" type="number" value={data.weeklyTarget} onChange={e => updateField('weeklyTarget', e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" min="1" />
                </div>
            </div>
            <div>
                <label htmlFor="sessionDuration" className="block text-sm font-medium text-gray-700">Preferred Session Duration (minutes)</label>
                <select id="sessionDuration" value={data.sessionDuration} onChange={e => updateField('sessionDuration', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                    <option>30</option>
                    <option>45</option>
                    <option>60</option>
                    <option>90</option>
                    <option>120</option>
                </select>
            </div>
        </div>
        <div>
            <label htmlFor="schedule" className="block text-sm font-medium text-gray-700">Preferred Study Schedule</label>
            <p className="text-xs text-gray-500 mb-2">Select preferred days for group activities.</p>
            {/* This would be a more complex component in a real app */}
            <input id="schedule" type="text" value={data.schedule} onChange={e => updateField('schedule', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="e.g., Weekends, Mon/Wed/Fri evenings" />
        </div>
    </div>
);

const Step5_Branding = ({ data, updateField }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium text-gray-900">Branding</h3>
    <p className="text-sm text-gray-500">Customize your group's appearance (placeholders for now).</p>
    <div>
      <label className="block text-sm font-medium text-gray-700">Group Avatar</label>
      <div className="mt-1 flex items-center">
        <span className="inline-block h-12 w-12 overflow-hidden rounded-full bg-gray-100"><svg className="h-full w-full text-gray-300" fill="currentColor" viewBox="0 0 24 24"><path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" /></svg></span>
        <button type="button" className="ml-5 rounded-md border border-gray-300 bg-white py-2 px-3 text-sm font-medium leading-4 text-gray-700 shadow-sm hover:bg-gray-50">Change</button>
      </div>
    </div>
    <div>
      <label className="block text-sm font-medium text-gray-700">Cover Image</label>
      <div className="mt-1 flex justify-center rounded-md border-2 border-dashed border-gray-300 px-6 pt-5 pb-6">
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div className="flex text-sm text-gray-600"><p className="pl-1">Upload a file</p></div>
          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
        </div>
      </div>
    </div>
  </div>
);

const Step6_Review = ({ data }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium text-gray-900">Review & Create</h3>
    <p className="text-sm text-gray-500">Confirm your group's details before creating it.</p>
    <div className="border-t border-gray-200">
      <dl className="divide-y divide-gray-200">
        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-medium text-gray-500">Group Name</dt><dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{data.name}</dd></div>
        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-medium text-gray-500">Description</dt><dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{data.description}</dd></div>
        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-medium text-gray-500">Privacy</dt><dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{data.privacy}</dd></div>
        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-medium text-gray-500">Learning Goals</dt><dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{data.learningGoals.join(', ')}</dd></div>
        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-medium text-gray-500">Max Members</dt><dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{data.maxMembers}</dd></div>
        <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4"><dt className="text-sm font-medium text-gray-500">Weekly Target</dt><dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">{data.weeklyTarget} hours</dd></div>
      </dl>
    </div>
  </div>
);

const CreateStudyGroupPage = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Software Engineering',
    skillLevel: 'All Levels',
    privacy: 'Public',
    learningGoals: [],
    maxMembers: 20,
    weeklyTarget: 5,
    sessionDuration: 60,
    schedule: '',
  });
  const { createGroup, isLoading, error } = useStudyGroupStore();
  const navigate = useNavigate();

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));    
  };

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, steps.length));
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  const handleSubmit = async (e) => {
    e.preventDefault();    
    const newGroup = await createGroup({
      name: formData.name,
      description: formData.description,
      isPublic: formData.privacy === 'Public',
      topic: formData.learningGoals.join(', '), // Simplified for now
      // Pass all formData fields to the store
      ...formData,
    });
    if (newGroup) {
      navigate(`/study-groups/${newGroup._id}`);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl bg-white rounded-lg shadow-lg">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create a New Study Group</h1>
        <p className="text-sm text-gray-600 mb-8">Follow the steps to set up your new collaborative space.</p>
        <Stepper currentStep={currentStep} />
      </div>

      <form onSubmit={handleSubmit} className="p-6 border-t border-gray-200">
        {currentStep === 1 && <Step1_BasicInfo data={formData} updateField={updateField} />}
        {currentStep === 2 && <Step2_GroupType data={formData} updateField={updateField} />}
        {currentStep === 3 && <Step3_LearningGoals data={formData} updateField={updateField} />}
        {currentStep === 4 && <Step4_Preferences data={formData} updateField={updateField} />}
        {currentStep === 5 && <Step5_Branding data={formData} updateField={updateField} />}
        {currentStep === 6 && <Step6_Review data={formData} />}

        {error && <p className="text-red-500">Error: {error}</p>}

        <div className="mt-8 pt-5 border-t border-gray-200">
          <div className="flex justify-between">
            <button type="button" onClick={prevStep} disabled={currentStep === 1} className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            {currentStep < steps.length ? (
              <button type="button" onClick={nextStep} className="inline-flex items-center gap-1 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button type="submit" disabled={isLoading} className="inline-flex items-center gap-2 rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 disabled:bg-gray-400">
                <Check size={16} />
                <span>{isLoading ? 'Creating...' : 'Create Group'}</span>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateStudyGroupPage;