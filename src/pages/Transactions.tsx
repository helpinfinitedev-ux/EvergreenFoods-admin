import { useEffect, useState } from 'react';
import { adminAPI } from '../api';

export default function Transactions() {
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [filter, setFilter] = useState({
        type: '',
        startDate: '',
        endDate: ''
    });

    useEffect(() => {
        loadTransactions(1, false);
    }, []);

    const loadTransactions = async (nextPage: number, append: boolean) => {
        try {
            if (append) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }
            const params: any = {};
            if (filter.type) params.type = filter.type;
            if (filter.startDate) params.startDate = filter.startDate;
            if (filter.endDate) params.endDate = filter.endDate;
            params.page = nextPage;

            const response = await adminAPI.getTransactions(params);
            const data = response.data || {};
            const rows = data.rows || [];
            setTransactions((prev) => (append ? [...prev, ...rows] : rows));
            setPage(data.page || nextPage);
            setTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error('Failed to load transactions', err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleFilter = () => {
        setPage(1);
        loadTransactions(1, false);
    };

    const handleLoadMore = () => {
        if (loadingMore || page >= totalPages) return;
        loadTransactions(page + 1, true);
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    return (
        <div style={{ padding: '30px' }}>
            <h1 style={{ marginBottom: '30px', fontSize: '28px', fontWeight: '700' }}>
                Transaction Logs
            </h1>

            {/* Filters */}
            <div style={{
                background: 'white',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'end' }}>
                    <div style={{ flex: '1', minWidth: '200px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                            Transaction Type
                        </label>
                        <select
                            value={filter.type}
                            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                        >
                            <option value="">All Types</option>
                            <option value="BUY">Buy</option>
                            <option value="SELL">Sell</option>
                            <option value="SHOP_BUY">Shop Buy</option>
                            <option value="FUEL">Fuel</option>
                            <option value="PALTI">Palti</option>
                            <option value="WEIGHT_LOSS">Weight Loss</option>
                            <option value="DEBIT_NOTE">Debit Note</option>
                            <option value="CREDIT_NOTE">Credit Note</option>
                        </select>
                    </div>

                    <div style={{ flex: '1', minWidth: '150px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={filter.startDate}
                            onChange={(e) => setFilter({ ...filter, startDate: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div style={{ flex: '1', minWidth: '150px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                            End Date
                        </label>
                        <input
                            type="date"
                            value={filter.endDate}
                            onChange={(e) => setFilter({ ...filter, endDate: e.target.value })}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <button
                        onClick={handleFilter}
                        style={{
                            padding: '10px 24px',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '14px'
                        }}
                    >
                        Apply Filter
                    </button>
                </div>
            </div>

            {/* Table */}
            <div style={{
                background: 'white',
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                overflow: 'auto'
            }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                    <thead>
                        <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <th style={thStyle}>Date</th>
                            <th style={thStyle}>Type</th>
                            <th style={thStyle}>Driver</th>
                            <th style={thStyle}>Amount</th>
                            <th style={thStyle}>Unit</th>
                            <th style={thStyle}>Rate</th>
                            <th style={thStyle}>Total</th>
                            <th style={thStyle}>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                                    No transactions found
                                </td>
                            </tr>
                        ) : (
                            transactions.map((tx) => (
                                <tr key={tx.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <td style={tdStyle}>
                                        {new Date(tx.date).toLocaleDateString('en-IN', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            padding: '4px 10px',
                                            background: getTypeColor(tx.type),
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: '500',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>{tx.driver?.name || '-'}</td>
                                    <td style={tdStyle}>{Number(tx.amount).toFixed(2)}</td>
                                    <td style={tdStyle}>{tx.unit}</td>
                                    <td style={tdStyle}>{tx.rate ? `₹${Number(tx.rate).toFixed(2)}` : '-'}</td>
                                    <td style={tdStyle}>{tx.totalAmount ? `₹${Number(tx.totalAmount).toFixed(2)}` : '-'}</td>
                                    <td style={tdStyle}>{tx.details || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <button
                    onClick={handleLoadMore}
                    disabled={loadingMore || page >= totalPages}
                    style={{
                        padding: '10px 18px',
                        background: loadingMore || page >= totalPages ? '#e5e7eb' : '#f3f4f6',
                        color: loadingMore || page >= totalPages ? '#9ca3af' : '#374151',
                        border: '1px solid #d1d5db',
                        borderRadius: '10px',
                        cursor: loadingMore || page >= totalPages ? 'not-allowed' : 'pointer',
                        fontWeight: '700',
                        fontSize: '13px'
                    }}
                >
                    {loadingMore ? 'Loading...' : page >= totalPages ? 'No More Transactions' : 'Load More'}
                </button>
            </div>
        </div>
    );
}

function getTypeColor(type: string): string {
    const colors: Record<string, string> = {
        'BUY': '#dbeafe',
        'SELL': '#d1fae5',
        'SHOP_BUY': '#e0e7ff',
        'FUEL': '#fef3c7',
        'PALTI': '#fce7f3',
        'WEIGHT_LOSS': '#fee2e2',
        'DEBIT_NOTE': '#fecaca',
        'CREDIT_NOTE': '#bbf7d0'
    };
    return colors[type] || '#f3f4f6';
}

const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151'
};

const tdStyle: React.CSSProperties = {
    padding: '16px',
    fontSize: '14px',
    color: '#6b7280'
};
