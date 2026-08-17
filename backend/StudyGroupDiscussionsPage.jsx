import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, MessageSquare, User, Calendar, ThumbsUp, ThumbsDown, Smile } from 'lucide-react'; // Using lucide-react for icons
import useStudyGroupStore from '../store/studyGroupStore';

const StudyGroupDiscussionsPage = () => {
  const { groupId } = useParams();
  const { discussions, isLoading, error, fetchDiscussions, createDiscussion } = useStudyGroupStore();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (groupId) {
      fetchDiscussions(groupId);
    }
  }, [groupId, fetchDiscussions]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    await createDiscussion(groupId, { title, content });
    setTitle('');
    setContent('');
    setShowForm(false);
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Discussions</h2>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors shadow-sm">
          <Plus size={18} />
          <span>{showForm ? 'Cancel' : 'Start Discussion'}</span>
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md mb-6 space-y-4 border border-gray-200">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
            <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" placeholder="A clear and concise title for your discussion" />
          </div>
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Content</label>
            <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm" rows="5" placeholder="Share your thoughts, questions, or ideas..."></textarea>
          </div>
          <button type="submit" disabled={isLoading} className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-400">
            {isLoading ? 'Posting...' : 'Post Discussion'}
          </button>
        </form>
      )}

      {isLoading && discussions.length === 0 && <p>Loading discussions...</p>}
      {error && <p className="text-red-500">Error: {error}</p>}

      <div className="space-y-3">
        {discussions.length > 0 ? (
          discussions.map(discussion => (
            <div key={discussion._id} className="bg-white p-5 border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Link to={`./${discussion._id}`} className="text-xl font-semibold text-gray-900 hover:text-blue-600 hover:underline">
                    {discussion.title}
                  </Link>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{discussion.content}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500 mt-3">
                    <span className="flex items-center gap-1.5"><User size={14} /> {discussion.authorId?.name || 'Unknown'}</span>
                    <span className="flex items-center gap-1.5"><Calendar size={14} /> {new Date(discussion.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 text-sm text-gray-600 ml-4">
                  {/* Placeholder for reactions count */}
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <ThumbsUp size={14} /> {discussion.reactions?.like || 0}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare size={14} />
                    <span>{discussion.replies?.length || 0}</span>
                  </div>
                  {/* Placeholder for reactions */}
                </div>
              </div>
            </div>
          ))
        ) : (
          !isLoading && !error && <p className="text-center text-gray-500 py-10">No discussions yet. Be the first to start one!</p>
        )}
      </div>
    </div>
  );
};

export default StudyGroupDiscussionsPage;