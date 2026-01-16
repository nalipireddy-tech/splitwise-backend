import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../api/api';

const containerStyle = {
  minHeight: '100vh',
  background: '#f7fafc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  padding: '24px'
};

const headerStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  padding: '16px 24px',
  borderRadius: 8,
  marginBottom: 20
};

const card = { background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' };

function Groups() {
  const { user, token, fetchUser } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createData, setCreateData] = useState({ name: '', description: '', categories: '' });
  const [selected, setSelected] = useState(null);
  const [newCategory, setNewCategory] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/groups');
      setGroups(res.data || []);
    } catch (err) {
      // If unauthorized, try a silent refresh of the profile (in case token is stale)
      if (err.response?.status === 401 && localStorage.getItem('token')) {
        try {
          await fetchUser();
          const retry = await api.get('/groups');
          setGroups(retry.data || []);
          setError('');
          return;
        } catch (e) {
          setError('Not authorized — please sign in again');
          setLoading(false);
          return;
        }
      }

      setError(err.response?.data?.message || err.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const categories = createData.categories
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      await api.post('/groups', { name: createData.name, description: createData.description, categories });
      setCreateData({ name: '', description: '', categories: '' });
      fetchGroups();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create group');
    }
  };

  const handleSelect = async (g) => {
    setError('');
    setNewCategory('');
    try {
      const res = await api.get(`/groups/${g._id}`);
      const group = res.data;
      // fetch balances too
      try {
        const bal = await api.get(`/groups/${g._id}/balances`);
        setSelected({ ...group, balances: bal.data.balances, settlements: bal.data.settlements });
      } catch (e) {
        setSelected(group);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load group');
    }
  };

  const handleAddCategory = async () => {
    if (!selected || !newCategory) return;
    try {
      await api.post(`/groups/${selected._id}/categories`, { category: newCategory });
      await fetchGroups();
      const refreshed = (await api.get(`/groups/${selected._id}`)).data;
      setSelected(refreshed);
      setNewCategory('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add category');
    }
  };

  const handleRemoveCategory = async (cat) => {
    if (!selected) return;
    try {
      await api.delete(`/groups/${selected._id}/categories/${encodeURIComponent(cat)}`);
      await fetchGroups();
      const refreshed = (await api.get(`/groups/${selected._id}`)).data;
      setSelected(refreshed);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to remove category');
    }
  };

  // balances are loaded automatically when selecting a group (see handleSelect)

  // Helper to show balance relative to current user
  const renderUserBalance = (b) => {
    if (!user) return null;
    const bal = Number(b.balance || 0);
    if (b.userId === user._id) {
      if (bal > 0) return `You are owed ${bal.toFixed(2)}`;
      if (bal < 0) return `You owe ${Math.abs(bal).toFixed(2)}`;
      return `Settled (0.00)`;
    }
    return `${b.name}: ${bal >= 0 ? `${bal.toFixed(2)} (owed to them)` : `${Math.abs(bal).toFixed(2)} (they owe)`}`;
  };

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <div style={{ maxWidth: 1200, margin: '0 auto', fontSize: 20, fontWeight: 700 }}>Groups</div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
        <div>
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Create Group</h3>
            {error && <div style={{ color: 'red' }}>{error}</div>}
            <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input placeholder="Name" value={createData.name} onChange={e => setCreateData({ ...createData, name: e.target.value })} required style={{ flex: 1, padding: 8 }} />
              <input placeholder="Description" value={createData.description} onChange={e => setCreateData({ ...createData, description: e.target.value })} style={{ flex: 1, padding: 8 }} />
              <input placeholder="Categories" value={createData.categories} onChange={e => setCreateData({ ...createData, categories: e.target.value })} style={{ flex: 1, padding: 8 }} />
              <button type="submit" style={{ padding: '8px 12px' }}>Create</button>
            </form>
          </div>

          <div style={{ height: 20 }} />

          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Your Groups</h3>
            {loading ? <div>Loading...</div> : (
              <>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {groups.map(g => (
                    <li key={g._id} style={{ marginBottom: 8 }}>
                      <button onClick={() => handleSelect(g)} style={{ width: '100%', textAlign: 'left', padding: '8px', borderRadius: 8, background: selected?._id === g._id ? '#f0f4ff' : 'transparent' }}>{g.name}</button>
                    </li>
                  ))}
                </ul>
                {/* removed left-column duplicate prompt; placeholder now appears in the right panel */}
              </>
            )}
          </div>
        </div>

        <div>
          <div style={card}>
            {selected ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{selected.name}</h3>
                    <div style={{ color: '#666' }}>{selected.description}</div>
                  </div>
                  <div />
                </div>

                <div style={{ marginTop: 12 }}>
                  <strong>Categories</strong>
                  <div style={{ marginTop: 8 }}>
                    {(selected.categories || []).length === 0 ? <div style={{ color: '#777' }}>No custom categories</div> : (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{(selected.categories || []).map(c => (
                        <span key={c} style={{ padding: '6px 10px', background: '#f1f5f9', borderRadius: 8 }}>{c} {selected.createdBy === user?._id && <button onClick={() => handleRemoveCategory(c)} style={{ marginLeft: 8 }}>Remove</button>}</span>
                      ))}</div>
                    )}
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      <input placeholder="New category" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                      <button onClick={handleAddCategory}>Add category</button>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <strong>Members</strong>
                  <ul>
                    {(selected.members || []).map(m => (
                      <li key={m.user?._id || m.email}>{m.user ? `${m.user.name} (${m.user.email})` : `${m.email} (invited)`}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input placeholder="Member email" value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} style={{ padding: 8 }} />
                    <button onClick={async () => {
                      if (!newMemberEmail) return;
                      try {
                        await api.post(`/groups/${selected._id}/members`, { email: newMemberEmail });
                        const refreshed = (await api.get(`/groups/${selected._id}`)).data;
                        setSelected(refreshed);
                        setNewMemberEmail('');
                        fetchGroups();
                      } catch (err) {
                        setError(err.response?.data?.message || err.message || 'Failed to add member');
                      }
                    }}>Add member</button>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <strong>Balances</strong>
                  {(!selected.balances || selected.balances.length === 0) ? (
                    <div style={{ color: '#777' }}>No balances to show — either no expenses or everyone is settled (0.00).</div>
                  ) : (
                    <div>
                      <ul>
                        {selected.balances.map(b => (
                          <li key={b.userId}>{renderUserBalance(b)}</li>
                        ))}
                      </ul>

                      {selected.settlements && selected.settlements.length > 0 ? (
                        <div style={{ marginTop: 12 }}>
                          <strong>Suggested Settlements</strong>
                          <ul>
                            {selected.settlements.map((s, idx) => (
                              <li key={idx}>{s.from} → {s.to}: {s.amount.toFixed(2)}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div style={{ marginTop: 12, color: '#666' }}>No settlements required.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 220, color: '#666', flexDirection: 'column' }}>
                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Select a group to view details</div>
                <div style={{ maxWidth: 420, textAlign: 'center' }}>Choose a group from the list on the left to see members, categories and balances.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Groups;
