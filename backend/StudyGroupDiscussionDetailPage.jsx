import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useStudyGroupStore from '../store/studyGroupStore';
import { ArrowLeft, User, Calendar, MessageSquare, ThumbsUp, ThumbsDown, Smile, Loader, AlertTriangle } from 'lucide-react';

// Mock Auth Store for current user
const useAuthStore = () => ({
  user: { _id: 'mock-user-id-123', name: 'Current User' },
});

const ReactionButton = ({ count, icon: Icon, onClick, isActive }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
      isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`}
  >
    <Icon size={16} /> {count}
  </button>
);

const Comment = ({ comment, groupId, discussionId, currentUser, onAddReply, onAddReaction }) => {
  const [replyContent, setReplyContent] = useState('');
  const [showReplyForm, setShowReplyForm] = useState(false);

  const handleReplySubmit = (e) => {
    e.preventDefault();
    if (replyContent.trim()) {
      onAddReply(comment._id, replyContent);
      setReplyContent('');
      setShowReplyForm(false);
    }
  };

  const hasReacted = (reactionType) =>
    comment.reactions?.[reactionType]?.includes(currentUser._id);

  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-3">
      <div className="flex items-center gap-3 text-sm text-gray-700">
        <User size={16} />
        <span className="font-medium">{comment.authorId?.name || 'Unknown'}</span>
        <span className="text-gray-500">•</span>
        <span className="text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
      </div>
      <p className="text-gray-800">{comment.content}</p>
      <div className="flex items-center gap-3">
        <ReactionButton
          count={comment.reactions?.like?.length || 0}
          icon={ThumbsUp}
          onClick={() => onAddReaction(comment._id, 'like')}
          isActive={hasReacted('like')}
        />
        <ReactionButton
          count={comment.reactions?.heart?.length || 0}
          icon={Smile}
          onClick={() => onAddReaction(comment._id, 'heart')}
          isActive={hasReacted('heart')}
        />
        <button
          onClick={() => setShowReplyForm(!showReplyForm)}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600"
        >
          <MessageSquare size={16} /> Reply
        </button>
      </div>

      {showReplyForm && (
        <form onSubmit={handleReplySubmit} className="mt-3 flex gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            className="flex-grow rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600">
            Post
          </button>
        </form>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-8 mt-4 space-y-3 border-l-2 border-gray-200 pl-4">
          {comment.replies.map((reply) => (
            <Comment
              key={reply._id}
              comment={reply} // Replies are also comments in this recursive structure
              groupId={groupId}
              discussionId={discussionId}
              currentUser={currentUser}
              onAddReply={onAddReply} // Pass down for nested replies
              onAddReaction={onAddReaction}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const StudyGroupDiscussionDetailPage = () => {
  const { groupId, discussionId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const {
    currentDiscussion,
    isDetailLoading,
error,
    fetchDiscussionDetails,
    addComment,
    addReply,
    addReaction,
  } = useStudyGroupStore();

  const [newCommentContent, setNewCommentContent] = useState('');

  useEffect(() => {
    if (groupId && discussionId) {
      fetchDiscussionDetails(groupId, discussionId);
    }
  }, [groupId, discussionId, fetchDiscussionDetails]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (newCommentContent.trim()) {
      await addComment(groupId, discussionId, newCommentContent);
      setNewCommentContent('');
    }
  };

  const handleAddReplyToComment = async (commentId, content) => {
    await addReply(groupId, discussionId, commentId, content);
  };

  const handleAddReactionToTarget = async (targetId, targetType, reactionType) => {
    await addReaction(groupId, discussionId, targetId, targetType, reactionType);
  };

  if (isDetailLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin text-blue-500" size={32} />
        <span className="ml-3 text-lg text-gray-700">Loading discussion...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Error Loading Discussion</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Go Back</button>
      </div>
    );
  }

  if (!currentDiscussion) {
    return (
      <div className="text-center p-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">Discussion Not Found</h3>
        <p className="mt-1 text-sm text-gray-500">The discussion you are looking for does not exist.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-600 hover:underline">Go Back</button>
      </div>
    );
  }

  const hasDiscussionReacted = (reactionType) =>
    currentDiscussion.reactions?.[reactionType]?.includes(currentUser._id);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft size={20} /> Back to Discussions
      </button>

      {/* Discussion Post */}
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentDiscussion.title}</h1>
        <div className="flex items-center gap-3 text-sm text-gray-700 mb-4">
          <User size={18} />
          <span className="font-medium">{currentDiscussion.authorId?.name || 'Unknown'}</span>
          <span className="text-gray-500">•</span>
          <span className="text-gray-500">{new Date(currentDiscussion.createdAt).toLocaleString()}</span>
        </div>
        <p className="text-gray-800 text-base leading-relaxed">{currentDiscussion.content}</p>
        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-gray-100">
          <ReactionButton
            count={currentDiscussion.reactions?.like?.length || 0}
            icon={ThumbsUp}
            onClick={() => handleAddReactionToTarget(currentDiscussion._id, 'discussion', 'like')}
            isActive={hasDiscussionReacted('like')}
          />
          <ReactionButton
            count={currentDiscussion.reactions?.heart?.length || 0}
            icon={Smile}
            onClick={() => handleAddReactionToTarget(currentDiscussion._id, 'discussion', 'heart')}
            isActive={hasDiscussionReacted('heart')}
          />
        </div>
      </div>

      {/* Comments Section */}
      <h2 className="text-2xl font-bold text-gray-900 mb-5">Comments ({currentDiscussion.comments?.length || 0})</h2>
      <form onSubmit={handleAddComment} className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-6">
        <textarea
          value={newCommentContent}
          onChange={(e) => setNewCommentContent(e.target.value)}
          placeholder="Write a comment..."
          rows="3"
          className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        ></textarea>
        <button type="submit" className="mt-3 bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 transition-colors">
          Post Comment
        </button>
      </form>

      <div className="space-y-4">
        {currentDiscussion.comments && currentDiscussion.comments.length > 0 ? (
          currentDiscussion.comments.map((comment) => (
            <Comment
              key={comment._id}
              comment={comment}
              groupId={groupId}
              discussionId={discussionId}
              currentUser={currentUser}
              onAddReply={handleAddReplyToComment}
              onAddReaction={(commentId, reactionType) => handleAddReactionToTarget(commentId, 'comment', reactionType)}
            />
          ))
        ) : (
          <p className="text-center text-gray-500 py-8">No comments yet. Be the first to share your thoughts!</p>
        )}
      </div>
    </div>
  );
};

export default StudyGroupDiscussionDetailPage;