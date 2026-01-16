import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api/api';

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f7fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '24px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    fontSize: '24px',
    fontWeight: '700'
  },
  nav: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center'
  },
  navButton: {
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px'
  },
  greeting: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '24px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    fontSize: '14px',
    color: '#718096',
    marginBottom: '8px',
    fontWeight: '500'
  },
  cardValue: {
    fontSize: '32px',
    fontWeight: '700',
    color: '#1a202c'
  },
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#1a202c',
    marginBottom: '16px'
  },
  infoText: {
    color: '#718096',
    fontSize: '16px',
    textAlign: 'center',
    padding: '40px 20px'
  }
};

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ totalSpent: 0, totalOwed: 0, balance: 0, expenseCount: 0 });
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [showForm, setShowForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: '', amount: '', category: '', group: '' });
  const [groups, setGroups] = useState([]);
  const [newSplits, setNewSplits] = useState([]);

  const handleChangeNew = (e) => {
    setNewExpense({ ...newExpense, [e.target.name]: e.target.value });
  };

  const GLOBAL_CATEGORIES = ['Food', 'Travel', 'Rent', 'Entertainment', 'Utilities', 'Shopping', 'Healthcare', 'Other'];

  const availableCategories = () => {
    if (newExpense.group) {
      const g = groups.find(x => x._id === newExpense.group);
      if (g && Array.isArray(g.categories) && g.categories.length) return g.categories;
    }
    return GLOBAL_CATEGORIES;
  };

  // initialize per-member splits when a group is selected
  useEffect(() => {
    const initSplits = async () => {
      if (!newExpense.group) {
        setNewSplits([]);
        return;
      }
      try {
        const res = await api.get(`/groups/${newExpense.group}`);
        const members = res.data.members || [];
        const splits = members.map(m => ({ user: m.user?._id || m.email, name: m.user?.name || m.email, amount: 0 }));
        setNewSplits(splits);
      } catch (e) {
        setNewSplits([]);
      }
    };
    initSplits();
  }, [newExpense.group]);

  const handleAddExpense = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: newExpense.title,
        amount: parseFloat(newExpense.amount) || 0,
        category: newExpense.category || 'Other',
        group: newExpense.group || null
      };

      if (newSplits && newSplits.length > 0 && newExpense.group) {
        const splitsPayload = newSplits.map(s => ({ user: s.user, amount: parseFloat(s.amount) || 0 }));
        const totalSplits = splitsPayload.reduce((sum, x) => sum + x.amount, 0);
        const amt = parseFloat(newExpense.amount) || 0;
        if (Math.abs(totalSplits - amt) > 0.01) {
          setError('Split amounts must equal total amount');
          return;
        }
        payload.splits = splitsPayload;
        payload.splitType = 'exact';
      }
      await api.post('/expenses', payload);
      // refresh data
      const [summaryRes, expensesRes] = await Promise.all([
        api.get('/expenses/summary/stats'),
        api.get('/expenses')
      ]);
      setSummary(summaryRes.data);
      setExpenses(expensesRes.data.slice(0, 6));
      setNewExpense({ title: '', amount: '', category: '' });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add expense');
    }
  };

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [summaryRes, expensesRes, groupsRes] = await Promise.all([
          api.get('/expenses/summary/stats'),
          api.get('/expenses'),
          api.get('/groups')
        ]);

        if (!mounted) return;

        setSummary(summaryRes.data);
        // show latest 6 expenses
        setExpenses(expensesRes.data.slice(0, 6));
        setGroups(groupsRes.data || []);
      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Failed to load dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();

    return () => { mounted = false; };
  }, []);
  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.logo}> Expense Tracker</div>
          <nav style={styles.nav}>
            <button onClick={() => window.location.href = '/groups'} style={styles.navButton}>
              Groups
            </button>
            <button onClick={() => setShowForm(s => !s)} style={styles.navButton}>
              {showForm ? 'Cancel' : 'Add Expense'}
            </button>
            <button onClick={handleLogout} style={styles.navButton}>
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main style={styles.main}>
        <h1 style={styles.greeting}>Welcome back, {user?.name}! </h1>

        <div style={styles.grid}>
          <div style={styles.card}>
            <div style={styles.cardTitle}>Total Spent</div>
            <div style={styles.cardValue}>{summary.totalSpent.toFixed(2)}</div>
          </div>
          
          <div style={styles.card}>
            <div style={styles.cardTitle}>Total Owed</div>
            <div style={styles.cardValue}>{summary.totalOwed.toFixed(2)}</div>
          </div>
          
          <div style={styles.card}>
            <div style={styles.cardTitle}>Balance</div>
            <div style={styles.cardValue}>{summary.balance.toFixed(2)}</div>
          </div>
          
          <div style={styles.card}>
            <div style={styles.cardTitle}>Total Expenses</div>
            <div style={styles.cardValue}>{summary.expenseCount}</div>
          </div>
        </div>
        <div style={styles.section}>
          {showForm && (
            <form onSubmit={handleAddExpense} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input name="title" value={newExpense.title} onChange={handleChangeNew} placeholder="Title" required style={{ flex: 2, padding: 8 }} />
                  <input name="amount" value={newExpense.amount} onChange={handleChangeNew} placeholder="Amount" required style={{ flex: 1, padding: 8 }} />
                  <select name="group" value={newExpense.group} onChange={handleChangeNew} style={{ flex: 1, padding: 8 }}>
                    <option value="">Personal</option>
                    {groups.map(g => (
                      <option key={g._id} value={g._id}>{g.name}</option>
                    ))}
                  </select>
                  <select name="category" value={newExpense.category} onChange={handleChangeNew} style={{ flex: 1, padding: 8 }}>
                    <option value="">Select category</option>
                    {availableCategories().map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button type="submit" style={{ padding: '8px 12px' }}>Add</button>
                </div>

                {newSplits.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ marginBottom: 8, fontWeight: 600 }}>Splits (enter amounts or auto-split)</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <button type="button" onClick={() => {
                        const amt = parseFloat(newExpense.amount) || 0;
                        if (amt <= 0) return;
                        const cents = Math.round(amt * 100);
                        const per = Math.floor(cents / newSplits.length);
                        let rem = cents - per * newSplits.length;
                        setNewSplits(ns => ns.map(s => {
                          const add = rem > 0 ? 1 : 0; if (rem > 0) rem -= 1;
                          return { ...s, amount: (per + add) / 100 };
                        }));
                      }}>Auto-split equally</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 8 }}>
                      {newSplits.map((s, idx) => (
                        <div key={s.user} style={{ display: 'contents' }}>
                          <div style={{ padding: '8px 0' }}>{s.name}</div>
                          <input value={s.amount} onChange={e => setNewSplits(ns => ns.map((x,i) => i===idx ? { ...x, amount: e.target.value } : x))} style={{ padding: 8 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </form>
          )}
          <h2 style={styles.sectionTitle}>Recent Expenses</h2>
          {loading ? (
            <p style={styles.infoText}>Loading...</p>
          ) : error ? (
            <p style={styles.infoText}>{error}</p>
          ) : expenses.length === 0 ? (
            <p style={styles.infoText}>
              🎉 Your Expense Tracker is Ready!
              <br />
              Start by adding your first expense or creating a group to split expenses with friends.
            </p>
          ) : (
            <div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                    <th style={{ padding: '12px' }}>Title</th>
                    <th style={{ padding: '12px' }}>Amount</th>
                    <th style={{ padding: '12px' }}>Paid By</th>
                    <th style={{ padding: '12px' }}>Date</th>
                    <th style={{ padding: '12px' }}>Group</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp._id} style={{ borderBottom: '1px solid #fafafa' }}>
                      <td style={{ padding: '12px' }}>{exp.title}</td>
                      <td style={{ padding: '12px' }}>{exp.amount.toFixed(2)}</td>
                      <td style={{ padding: '12px' }}>{exp.paidBy?.name || '—'}</td>
                      <td style={{ padding: '12px' }}>{new Date(exp.date).toLocaleDateString()}</td>
                      <td style={{ padding: '12px' }}>{exp.group?.name || 'Personal'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;