import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getGroups } from './api';
import { connectRealtimeSocket } from '../../realtime/socket';
import './studyGroupsPolish.css';
import './studyGroupsHero.css';
import './studyGroupsBannerFix.css';
import './studyGroupsListingFixes.css';

const topics = ['All topics', 'DSA', 'JavaScript', 'React', 'System Design', 'Interview Prep'];

function formatDate(value) {
  if (!value) return 'Recently created';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently created';
  return `Created ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function GroupCard({ group }) {
  const initials = (group.name || 'SG')
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <Link className="sg-card sg-group-card" to={`/dashboard/groups/${group._id || group.id}`}>
      <div
        className="sg-cover sg-custom-cover"
        style={{
          '--sg-cover-image': group.bannerUrl ? `url(${group.bannerUrl})` : 'none',
          '--sg-cover-color': group.accentColor || '#f5a623',
        }}
        aria-hidden="true"
      >
        <span className="sg-avatar">{group.avatarText || initials}</span>
        <span className="sg-status"><span /> Open to join</span>
      </div>
      <div className="sg-card-body">
        <div className="sg-card-heading">
          <div>
            <span className="sg-chip">{group.topic || 'Study group'}</span>
            <h3>{group.name}</h3>
          </div>
        </div>
        <p className="sg-card-copy">{group.description || 'A focused space to learn, practice, and stay accountable together.'}</p>
        <div className="sg-card-footer">
          <span className="sg-meta">{group.memberCount || 0} members · {formatDate(group.createdAt)}</span>
          <span className="sg-text-link">
            View group <span aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

function GroupSkeleton() {
  return <div className="sg-card sg-skeleton-card" aria-hidden="true"><div className="sg-skeleton sg-skeleton-cover" /><div className="sg-card-body"><div className="sg-skeleton sg-skeleton-line short" /><div className="sg-skeleton sg-skeleton-line title" /><div className="sg-skeleton sg-skeleton-line" /><div className="sg-skeleton sg-skeleton-line" /></div></div>;
}

export default function StudyGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('All topics');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestRef = useRef(0);

  const loadGroups = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    setError('');
    try {
      const data = await getGroups();
      if (requestId !== requestRef.current) return;
      setGroups(Array.isArray(data) ? data : data?.groups || []);
    } catch (err) {
      if (requestId !== requestRef.current) return;
      setError(err.response?.data?.message || err.message || 'We could not load study groups right now.');
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadGroups, 250);
    return () => clearTimeout(timer);
  }, [loadGroups]);

  useEffect(() => {
    const socket = connectRealtimeSocket();
    const refresh = () => loadGroups();
    socket.on('group:membership', refresh);
    return () => socket.off('group:membership', refresh);
  }, [loadGroups]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    return groups.filter((group) => {
      const matchesQuery = !query || [group.name, group.topic, group.description].some((value) => String(value || '').toLowerCase().includes(query));
      const matchesTopic = topic === 'All topics' || String(group.topic || '').toLowerCase() === topic.toLowerCase();
      return matchesQuery && matchesTopic;
    });
  }, [groups, search, topic]);

  const resultLabel = useMemo(() => {
    if (loading) return 'Finding groups...';
    return `${filteredGroups.length} ${filteredGroups.length === 1 ? 'group' : 'groups'} found`;
  }, [filteredGroups.length, loading]);

  const pageSize = 5;
  const sortedGroups = useMemo(() => [...filteredGroups].sort((a, b) => {
    if (sortBy === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
    if (sortBy === 'oldest') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
  }), [filteredGroups, sortBy]);
  const totalPages = Math.max(1, Math.ceil(sortedGroups.length / pageSize));
  const pageGroups = sortedGroups.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);


  return (
    <main className="sg-app">
      <div className="sg-main">
        <section className="sg-hero sg-card">
          <div className="sg-hero-copy">
            <span className="sg-eyebrow">STUDY GROUPS</span>
            <h1 className="sg-title">Learn together.<br /><span>Grow consistently.</span></h1>
            <p className="sg-sub">Find people who are preparing for the same goals, share your progress, and make every practice session count.</p>
            <div className="sg-actions">
              <Link className="sg-btn primary" to="/dashboard/groups/create">Create a group <span aria-hidden="true">+</span></Link>
              <Link className="sg-btn ghost" to="/dashboard/groups/join">Join with invite</Link>
            </div>
          </div>
          <div className="sg-hero-art" aria-hidden="true">
            <div className="sg-hero-orbit orbit-one" />
            <div className="sg-hero-orbit orbit-two" />
            <div className="sg-hero-orb"><span>SG</span></div>
            <div className="sg-hero-note note-one">Practice together</div>
            <div className="sg-hero-note note-two">Stay accountable</div>
          </div>
        </section>

        <section className="sg-section" aria-labelledby="discover-title" aria-busy={loading}>
          <div className="sg-section-heading">
            <div><span className="sg-eyebrow">DISCOVER</span><h2 id="discover-title">Find your learning circle</h2><p>Browse active groups or search for a topic that matches your next goal.</p></div>
            <span className="sg-result-count">{resultLabel}</span>
          </div>
          <div className="sg-search-row sg-advanced-search">
            <label className="sg-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by group name or topic" aria-label="Search study groups" /></label>
            <label className="sg-select"><span className="sr-only">Filter by topic</span><select value={topic} onChange={(event) => setTopic(event.target.value)}>{topics.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="sg-select"><span className="sr-only">Sort groups</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="name">Name A–Z</option></select></label>
          </div>

          {error && <div className="sg-state sg-error"><div><strong>Could not load groups</strong><p>{error}</p></div><button className="sg-btn ghost" type="button" onClick={loadGroups}>Try again</button></div>}
          {!error && loading && <div className="sg-grid cards"><GroupSkeleton /><GroupSkeleton /><GroupSkeleton /></div>}
          {!error && !loading && filteredGroups.length > 0 && <>
            <div className="sg-grid cards">{pageGroups.map((group) => <GroupCard key={group._id || group.id} group={group} />)}</div>
            <nav className="sg-pagination" aria-label="Study group pages">
              <button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>← Previous</button>
              <span>Page {page} of {totalPages}</span>
              <button type="button" disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}>Next →</button>
            </nav>
          </>}
          {!error && !loading && filteredGroups.length === 0 && <div className="sg-state sg-empty"><div className="sg-empty-icon" aria-hidden="true">⌕</div><strong>{groups.length ? 'No groups match your filters' : 'No study groups yet'}</strong><p>{groups.length ? 'Try another topic or search term, or create a group for your preparation goal.' : 'Create a group and invite people preparing for the same goal.'}</p><Link className="sg-btn primary" to="/dashboard/groups/create">Create a group</Link></div>}
        </section>

        <section className="sg-how-it-works sg-card" aria-labelledby="how-title">
          <div><span className="sg-eyebrow">MAKE PROGRESS TOGETHER</span><h2 id="how-title">A simpler way to stay consistent</h2></div>
          <div className="sg-steps"><div><span>01</span><strong>Choose a goal</strong><p>Find a group aligned with what you are preparing for.</p></div><div><span>02</span><strong>Show up regularly</strong><p>Use discussions and sessions to keep momentum.</p></div><div><span>03</span><strong>Help each other win</strong><p>Share knowledge, ask questions, and celebrate progress.</p></div></div>
        </section>
      </div>
    </main>
  );
}
