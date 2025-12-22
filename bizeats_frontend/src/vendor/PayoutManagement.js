// PayoutManagement.jsx - WITH API INTEGRATION
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import "../assets/css/vendor/PayoutManagement.css";
import API_ENDPOINTS from "../components/config/apiConfig";
import fetchData from "../components/services/apiService";

const PayoutManagement = () => {
  const { restaurant_id } = useParams(); // Get restaurant_id from URL params
  const [activeTab, setActiveTab] = useState('settlement');
  const [payoutData, setPayoutData] = useState({
    summary: {
      totalEarnings: 0,
      pendingSettlement: 0,
      lastPayout: 0,
      lastPayoutDate: '',
      nextPayoutDate: '',
      payoutMethod: '',
      accountNumber: '',
      upiId: '',
      walletBalance: 0,
      payoutSchedule: 'Every Tuesday by 2 PM',
      minPayoutAmount: 1000,
      currentCycleEarnings: 0,
      currentCycleOrders: 0
    },
    payoutCycles: [],
    earnings: [],
    paymentHistory: [],
    withdrawalOptions: [],
    settlement: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState('current');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Utility Functions
  const getNextTuesday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilTuesday = dayOfWeek <= 2 ? 2 - dayOfWeek : 9 - dayOfWeek;
    const nextTuesday = new Date(today);
    nextTuesday.setDate(today.getDate() + daysUntilTuesday);
    nextTuesday.setHours(0, 0, 0, 0);
    return nextTuesday;
  };

  const getLastTuesday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysSinceTuesday = dayOfWeek >= 2 ? dayOfWeek - 2 : 6 - (1 - dayOfWeek);
    const lastTuesday = new Date(today);
    lastTuesday.setDate(today.getDate() - daysSinceTuesday);
    lastTuesday.setHours(0, 0, 0, 0);
    return lastTuesday;
  };

  const getCurrentPayoutCycle = () => {
    const lastTuesday = getLastTuesday();
    const nextTuesday = getNextTuesday();
    
    const today = new Date();
    const isTuesday = today.getDay() === 2;
    const payoutTime = new Date(today);
    payoutTime.setHours(14, 0, 0, 0);
    
    if (isTuesday && today > payoutTime) {
      lastTuesday.setDate(lastTuesday.getDate() + 7);
      nextTuesday.setDate(nextTuesday.getDate() + 7);
    }
    
    return {
      start: lastTuesday,
      end: nextTuesday,
      label: `${lastTuesday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${nextTuesday.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    };
  };

  const getPayoutCycleStatus = () => {
    const today = new Date();
    const nextTuesday = getNextTuesday();
    const isTuesday = today.getDay() === 2;
    
    if (isTuesday) {
      const payoutTime = new Date(today);
      payoutTime.setHours(14, 0, 0, 0);
      
      if (today < payoutTime) {
        return { status: 'processing', message: 'Payout processing today by 2 PM', timeLeft: 'Today' };
      } else {
        return { status: 'completed', message: 'Payout completed', timeLeft: 'Next week' };
      }
    }
    
    const daysUntilPayout = Math.ceil((nextTuesday - today) / (1000 * 60 * 60 * 24));
    return { 
      status: 'upcoming', 
      message: `Next payout in ${daysUntilPayout} day${daysUntilPayout !== 1 ? 's' : ''}`,
      timeLeft: `${daysUntilPayout} day${daysUntilPayout !== 1 ? 's' : ''}`
    };
  };

  const getDaysUntilPayout = () => {
    const nextTuesday = getNextTuesday();
    const today = new Date();
    const timeDiff = nextTuesday.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    // Here you would typically refetch data based on date range
    fetchPayoutData(range);
  };

  const handleWithdraw = () => {
    const payoutStatus = getPayoutCycleStatus();
    if (payoutStatus.status === 'processing') {
      alert('💰 Payout is being processed today. Your funds will be transferred by 2 PM.');
    } else if (payoutData.summary.pendingSettlement < payoutData.summary.minPayoutAmount) {
      alert(`Minimum withdrawal amount is ${formatCurrency(payoutData.summary.minPayoutAmount)}. You currently have ${formatCurrency(payoutData.summary.pendingSettlement)}.`);
    } else {
      alert(`✅ Withdrawal request submitted. Your funds will be transferred next Tuesday by 2 PM.`);
    }
  };

  const formatCurrency = (amount) => {
    const numAmount = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(numAmount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-IN', options);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'paid':
        return 'status-completed';
      case 'processing':
      case 'pending':
        return 'status-pending';
      case 'failed':
        return 'status-failed';
      default:
        return '';
    }
  };

  const getMethodIcon = (method) => {
    switch (method?.toLowerCase()) {
      case 'bank transfer':
        return '🏦';
      case 'upi':
        return '📱';
      case 'wallet':
        return '👛';
      default:
        return '💳';
    }
  };

  // Transform API response to match component structure
  const transformApiData = (apiData) => {
    if (!apiData) return null;

    return {
      summary: {
        totalEarnings: parseFloat(apiData.summary?.total_earnings) || 0,
        pendingSettlement: parseFloat(apiData.summary?.pending_settlement) || 0,
        lastPayout: parseFloat(apiData.summary?.last_payout) || 0,
        lastPayoutDate: apiData.summary?.last_payout_date || '',
        nextPayoutDate: apiData.summary?.next_payout_date || getNextTuesday().toISOString().split('T')[0],
        payoutMethod: apiData.summary?.payout_method || 'Bank Transfer',
        accountNumber: apiData.summary?.account_number?.slice(-4) || '1234',
        upiId: apiData.summary?.upi_id || 'vendor@upi',
        walletBalance: parseFloat(apiData.summary?.wallet_balance) || 0,
        payoutSchedule: apiData.summary?.payout_schedule || 'Every Tuesday by 2 PM',
        minPayoutAmount: parseFloat(apiData.summary?.min_payout_amount) || 1000,
        currentCycleEarnings: parseFloat(apiData.summary?.current_cycle_earnings) || 0,
        currentCycleOrders: apiData.summary?.current_cycle_orders || 0
      },
      payoutCycles: (apiData.payout_cycles || []).map(cycle => ({
        id: cycle.id || Math.random(),
        cycleLabel: cycle.cycle_label || `Cycle ${cycle.id || ''}`,
        startDate: cycle.start_date || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: cycle.end_date || new Date().toISOString(),
        status: cycle.status || 'pending',
        orders: cycle.orders || 0,
        totalAmount: parseFloat(cycle.total_amount) || 0,
        commission: parseFloat(cycle.commission) || 0,
        tax: parseFloat(cycle.tax) || 0,
        netAmount: parseFloat(cycle.net_amount) || 0,
        paidDate: cycle.paid_date,
        paidTime: cycle.paid_time,
        bankName: cycle.bank_name || 'HDFC Bank',
        reference: cycle.reference || 'N/A'
      })),
      earnings: (apiData.earnings || []).map(earning => ({
        id: earning.id || Math.random(),
        date: earning.date || new Date().toISOString(),
        day: new Date(earning.date).toLocaleDateString('en-IN', { weekday: 'long' }) || 'Monday',
        orders: earning.orders || 0,
        orderAmount: parseFloat(earning.order_amount) || 0,
        commission: parseFloat(earning.commission) || 0,
        platformFee: parseFloat(earning.platform_fee) || 0,
        tax: parseFloat(earning.tax) || 0,
        netEarnings: parseFloat(earning.net_earnings) || 0,
        payoutStatus: earning.payout_status || 'pending'
      })),
      paymentHistory: (apiData.payment_history || []).map(payment => ({
        id: payment.id || Math.random(),
        date: payment.date || new Date().toISOString(),
        amount: parseFloat(payment.amount) || 0,
        status: payment.status || 'completed',
        method: payment.method || 'Bank Transfer',
        reference: payment.reference || `REF${Math.floor(Math.random() * 10000)}`,
        description: payment.description || 'Weekly Payout',
        cycle: payment.cycle || getCurrentPayoutCycle().label,
        bankName: payment.bank_name || 'HDFC Bank',
        accountLast4: payment.account_last4 || '1234',
        upiId: payment.upi_id || 'vendor@upi'
      })),
      withdrawalOptions: apiData.withdrawal_options || [
        { id: 1, method: 'Bank Transfer', icon: '🏦', dailyLimit: '₹50,000', processingTime: '2-4 hours', fee: '₹0', minAmount: 1000, isDefault: true },
        { id: 2, method: 'UPI', icon: '📱', dailyLimit: '₹1,00,000', processingTime: 'Instant', fee: '₹0', minAmount: 100, isDefault: false },
        { id: 3, method: 'Wallet', icon: '👛', dailyLimit: '₹25,000', processingTime: 'Instant', fee: '₹5', minAmount: 100, isDefault: false }
      ],
      settlement: apiData.settlement || []
    };
  };

  // Fetch payout data from API
  const fetchPayoutData = async (range = 'current') => {
    try {
      setLoading(true);
      setError(null);
      
      if (!restaurant_id) {
        throw new Error('Restaurant ID is required');
      }

      const accessToken = localStorage.getItem("access");
      if (!accessToken) {
        throw new Error('Authentication required. Please login again.');
      }
      
      const response = await fetchData(
        API_ENDPOINTS.VENDOR_PAYOUT.FETCH_DATA(restaurant_id, range),
        "GET",
        null,
        accessToken
      );

      if (response) {
        const transformedData = transformApiData(response);
        setPayoutData(transformedData);
      } else {
        throw new Error('No data received from server');
      }
    } catch (error) {
      console.error('Error fetching payout data:', error);
      setError(error.message || 'Failed to load payout data');
      
      // Set fallback data
      const fallbackData = transformApiData({});
      setPayoutData(fallbackData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutData();
  }, [restaurant_id]);

  // Settlement Tab Component
  const SettlementTab = () => {
    const payoutStatus = getPayoutCycleStatus();
    const currentCycle = getCurrentPayoutCycle();
    const daysUntilPayout = getDaysUntilPayout();
    
    return (
      <div className="tab-content">
        <div className="section-header">
          <h3>Weekly Settlement</h3>
          <div className="header-actions">
            <div className="date-range-selector">
              <select 
                value={dateRange} 
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="date-select"
              >
                <option value="current">Current Cycle</option>
                <option value="last_week">Last Week</option>
                <option value="last_month">Last Month</option>
                <option value="last_3_months">Last 3 Months</option>
              </select>
            </div>
            <button className="withdraw-btn" onClick={handleWithdraw}>
              💰 Request Withdrawal
            </button>
          </div>
        </div>
        
        {/* Payout Schedule Banner */}
        <div className="payout-schedule-banner">
          <div className="schedule-info">
            <div className="schedule-icon">
              📅
            </div>
            <div className="schedule-details">
              <h4>Weekly Payout Schedule</h4>
              <div className="schedule-status">
                <span className={`status-indicator ${payoutStatus.status}`}>
                  {payoutStatus.status === 'completed' ? '✅' : payoutStatus.status === 'processing' ? '🔄' : '⏰'}
                  {payoutStatus.message}
                </span>
                <span className="next-payout">
                  📅 Next: {formatDate(payoutData.summary.nextPayoutDate)}
                </span>
              </div>
            </div>
          </div>
          <div className="countdown-timer">
            <div className="countdown-label">Next Payout In</div>
            <div className="countdown-value">
              <span className="days">{daysUntilPayout}</span>
              <span className="unit">day{daysUntilPayout !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        
        <div className="summary-cards">
          <div className="summary-card earnings-card">
            <div className="card-icon">
              💰
            </div>
            <div className="card-content">
              <h4>Current Cycle Earnings</h4>
              <p className="amount">{formatCurrency(payoutData.summary.pendingSettlement)}</p>
              <span className="card-info">
                🍽️ {payoutData.summary.currentCycleOrders} orders • {currentCycle.label}
              </span>
            </div>
          </div>
          
          <div className="summary-card next-payout-card">
            <div className="card-icon">
              📅
            </div>
            <div className="card-content">
              <h4>Next Payout Date</h4>
              <p className="amount">{formatDate(payoutData.summary.nextPayoutDate)}</p>
              <span className="card-info">
                ⏰ By 2:00 PM
              </span>
            </div>
          </div>
          
          <div className="summary-card last-payout-card">
            <div className="card-icon">
              📊
            </div>
            <div className="card-content">
              <h4>Last Payout</h4>
              <p className="amount">{formatCurrency(payoutData.summary.lastPayout)}</p>
              <span className="card-info">
                {formatDate(payoutData.summary.lastPayoutDate)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="table-container">
          <h4 className="table-title">Detailed Settlement Breakdown</h4>
          {payoutData.payoutCycles.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Cycle</th>
                    <th>🍽️ Orders</th>
                    <th>💵 Order Amount</th>
                    <th>📊 Commission</th>
                    <th>🏛️ Tax</th>
                    <th>💰 Net Amount</th>
                    <th>📋 Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutData.payoutCycles.map((cycle) => (
                    <tr key={cycle.id}>
                      <td data-label="Cycle">
                        <div className="cycle-cell">
                          <div className="cycle-range">{cycle.cycleLabel}</div>
                        </div>
                      </td>
                      <td data-label="Orders">
                        <span className="order-count">{cycle.orders}</span>
                      </td>
                      <td data-label="Order Amount">{formatCurrency(cycle.totalAmount)}</td>
                      <td data-label="Commission">{formatCurrency(cycle.commission)}</td>
                      <td data-label="Tax">{formatCurrency(cycle.tax)}</td>
                      <td data-label="Net Amount">
                        <strong className="net-amount-cell">{formatCurrency(cycle.netAmount)}</strong>
                      </td>
                      <td data-label="Status">
                        <span className={`status-badge ${getStatusColor(cycle.status)}`}>
                          {cycle.status === 'paid' ? '✅ Paid' : '🔄 Processing'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data-message">
              <div className="no-data-icon">📊</div>
              <p>No settlement data available for this period.</p>
              <button className="retry-btn" onClick={() => fetchPayoutData()}>
                🔄 Refresh Data
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Earnings Tab Component
  const EarningsTab = () => {
    const currentCycle = getCurrentPayoutCycle();
    const isTuesday = new Date().getDay() === 2;
    
    // Calculate totals for the current cycle
    const currentCycleData = payoutData.earnings.filter(item => 
      new Date(item.date) >= currentCycle.start && new Date(item.date) <= currentCycle.end
    );
    
    const totalOrders = currentCycleData.reduce((sum, item) => sum + item.orders, 0);
    const totalOrderAmount = currentCycleData.reduce((sum, item) => sum + item.orderAmount, 0);
    const totalCommission = currentCycleData.reduce((sum, item) => sum + item.commission, 0);
    const totalPlatformFee = currentCycleData.reduce((sum, item) => sum + item.platformFee, 0);
    const totalTax = currentCycleData.reduce((sum, item) => sum + item.tax, 0);
    const totalNetEarnings = currentCycleData.reduce((sum, item) => sum + item.netEarnings, 0);
    
    return (
      <div className="tab-content">
        <div className="section-header">
          <h3>Daily Earnings</h3>
          <div className="header-actions">
            <div className="current-cycle-badge">
              📅 Current Cycle: {currentCycle.label}
            </div>
            <div className="date-range-selector">
              <select 
                value={dateRange} 
                onChange={(e) => handleDateRangeChange(e.target.value)}
                className="date-select"
              >
                <option value="this_week">This Week</option>
                <option value="last_week">Last Week</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="cycle-info-banner">
          <div className="cycle-dates">
            📅
            <span>Cycle: {formatDate(currentCycle.start)} - {formatDate(currentCycle.end)}</span>
          </div>
          <div className="payout-day">
            ⏰
            <span>Payout Day: Every Tuesday by 2 PM</span>
          </div>
          {isTuesday && (
            <div className="today-payout-notice">
              🔔
              <span>Today is payout day! Funds will be transferred by 2 PM.</span>
            </div>
          )}
        </div>
        
        <div className="earnings-summary">
          <div className="summary-card-large">
            <div className="summary-icon">
              💰
            </div>
            <div className="summary-content">
              <h4>Current Cycle Total</h4>
              <p className="summary-amount">{formatCurrency(totalNetEarnings)}</p>
              <div className="summary-breakdown">
                <span className="breakdown-item">
                  🍽️ {totalOrders} orders
                </span>
                <span className="breakdown-item">
                  📅 {Math.ceil((currentCycle.end - currentCycle.start) / (1000 * 60 * 60 * 24))} days
                </span>
                <span className="breakdown-item">
                  ✅ {payoutData.earnings.filter(item => item.payoutStatus === 'paid').length} days paid
                </span>
              </div>
            </div>
          </div>
          
          <div className="earnings-breakdown">
            <div className="breakdown-card">
              <h4>Order Amount</h4>
              <p className="breakdown-amount">{formatCurrency(totalOrderAmount)}</p>
              <div className="breakdown-trend positive">
                📈 Calculated daily
              </div>
            </div>
            
            <div className="breakdown-card">
              <h4>Commission</h4>
              <p className="breakdown-amount">{formatCurrency(totalCommission)}</p>
              <div className="breakdown-percentage">
                {totalOrderAmount > 0 ? (totalCommission / totalOrderAmount * 100).toFixed(1) : '0.0'}% of order value
              </div>
            </div>
            
            <div className="breakdown-card">
              <h4>Platform Fees</h4>
              <p className="breakdown-amount">{formatCurrency(totalPlatformFee + totalTax)}</p>
              <div className="breakdown-percentage">
                {totalOrderAmount > 0 ? ((totalPlatformFee + totalTax) / totalOrderAmount * 100).toFixed(1) : '0.0'}% of order value
              </div>
            </div>
            
            <div className="breakdown-card">
              <h4>Net Earnings</h4>
              <p className="breakdown-amount net-earnings">{formatCurrency(totalNetEarnings)}</p>
              <div className="breakdown-percentage">
                Available for Tuesday payout
              </div>
            </div>
          </div>
        </div>
        
        <div className="table-container">
          <h4 className="table-title">Daily Earnings Breakdown</h4>
          {payoutData.earnings.length > 0 ? (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>📅 Date</th>
                    <th>📆 Day</th>
                    <th>🍽️ Orders</th>
                    <th>💵 Order Amount</th>
                    <th>📊 Commission</th>
                    <th>🏪 Platform Fee</th>
                    <th>🏛️ Tax</th>
                    <th>💰 Net Earnings</th>
                    <th>📋 Payout Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payoutData.earnings.map((item) => (
                    <tr key={item.id}>
                      <td data-label="Date">
                        <div className="date-cell">
                          <div className="date-day">{new Date(item.date).getDate()}</div>
                          <div className="date-month">{new Date(item.date).toLocaleDateString('en-IN', { month: 'short' })}</div>
                        </div>
                      </td>
                      <td data-label="Day">
                        <span className={`day-badge ${item.day === 'Tuesday' ? 'payout-day' : ''}`}>
                          {item.day}
                        </span>
                      </td>
                      <td data-label="Orders">
                        <span className="order-count">{item.orders}</span>
                      </td>
                      <td data-label="Order Amount">{formatCurrency(item.orderAmount)}</td>
                      <td data-label="Commission">{formatCurrency(item.commission)}</td>
                      <td data-label="Platform Fee">{formatCurrency(item.platformFee)}</td>
                      <td data-label="Tax">{formatCurrency(item.tax)}</td>
                      <td data-label="Net Earnings">
                        <strong className="net-earning">{formatCurrency(item.netEarnings)}</strong>
                      </td>
                      <td data-label="Payout Status">
                        <span className={`status-badge ${getStatusColor(item.payoutStatus)}`}>
                          {item.payoutStatus === 'paid' ? '✅ Paid' : '⏰ Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-data-message">
              <div className="no-data-icon">📊</div>
              <p>No earnings data available for this period.</p>
              <button className="retry-btn" onClick={() => fetchPayoutData()}>
                🔄 Refresh Data
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Payment History Tab Component
  const PaymentHistoryTab = () => (
    <div className="tab-content">
      <div className="section-header">
        <h3>Payment History</h3>
        <div className="header-actions">
          <div className="payout-schedule-info">
            📅 Payouts every Tuesday by 2 PM
          </div>
          <button className="filter-btn">
            🔍 Filter
          </button>
        </div>
      </div>
      
      <div className="current-method-card">
        <div className="method-header">
          <h4>Current Payout Settings</h4>
          <div className="schedule-badge">
            ⏰ {payoutData.summary.payoutSchedule}
          </div>
        </div>
        <div className="method-details">
          <div className="method-icon-large">
            {getMethodIcon(payoutData.summary.payoutMethod)}
          </div>
          <div className="method-info">
            <h5>{payoutData.summary.payoutMethod}</h5>
            {payoutData.summary.payoutMethod === 'Bank Transfer' && (
              <>
                <p className="bank-name">HDFC Bank</p>
                <p className="account-info">Account ending with ••••{payoutData.summary.accountNumber}</p>
              </>
            )}
            {payoutData.summary.payoutMethod === 'UPI' && (
              <p className="account-info">UPI ID: {payoutData.summary.upiId}</p>
            )}
            {payoutData.summary.payoutMethod === 'Wallet' && (
              <p className="account-info">Wallet Balance: {formatCurrency(payoutData.summary.walletBalance)}</p>
            )}
            <div className="method-stats">
              <span className="stat">
                ✅ Verified
              </span>
              <span className="stat">
                📅 Tuesday Payouts
              </span>
              <span className="stat">
                ⏰ By 2:00 PM
              </span>
              <span className="stat">
                💰 Min: {formatCurrency(payoutData.summary.minPayoutAmount)}
              </span>
            </div>
          </div>
          <button className="change-method-btn">
            ⚙️ Change Method
          </button>
        </div>
      </div>
      
      <div className="table-container">
        <h4 className="table-title">Payment History (Tuesday Payouts)</h4>
        {payoutData.paymentHistory.length > 0 ? (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>📅 Payout Date</th>
                  <th>📊 Cycle</th>
                  <th>📝 Description</th>
                  <th>💳 Method</th>
                  <th>💰 Amount</th>
                  <th>📋 Status</th>
                  <th>📥 Receipt</th>
                </tr>
              </thead>
              <tbody>
                {payoutData.paymentHistory.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Payout Date">
                      <div className="payout-date-cell">
                        <div className="payout-day">{new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short' })}</div>
                        <div className="payout-date">{formatDate(item.date)}</div>
                        <div className="payout-time">By 2:00 PM</div>
                      </div>
                    </td>
                    <td data-label="Cycle">
                      <span className="cycle-badge">{item.cycle}</span>
                    </td>
                    <td data-label="Description">
                      <div className="description-cell">
                        <div className="desc-title">{item.description}</div>
                        <div className="desc-ref">Ref: {item.reference}</div>
                        {item.bankName && <div className="desc-bank">{item.bankName}</div>}
                        {item.upiId && <div className="desc-bank">UPI: {item.upiId}</div>}
                      </div>
                    </td>
                    <td data-label="Method">
                      <span className="payment-method">
                        {getMethodIcon(item.method)} {item.method}
                      </span>
                    </td>
                    <td data-label="Amount">
                      <strong className="payment-amount">{formatCurrency(item.amount)}</strong>
                    </td>
                    <td data-label="Status">
                      <span className={`status-badge ${getStatusColor(item.status)}`}>
                        ✅ {item.status}
                      </span>
                    </td>
                    <td data-label="Receipt">
                      <button className="action-btn receipt-btn">
                        📥 Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data-message">
            <div className="no-data-icon">📊</div>
            <p>No payment history available.</p>
            <button className="retry-btn" onClick={() => fetchPayoutData()}>
              🔄 Refresh Data
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">🍽️</div>
        <p>Loading your payout data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">
          ⚠️
        </div>
        <h3>Unable to Load Payout Data</h3>
        <p>{error}</p>
        <button className="retry-btn" onClick={fetchPayoutData}>
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className="payout-management">
      <div className="payout-header">
        <div className="header-content">
          <h1>💰 Vendor Payout Management</h1>
          <p>Weekly payouts every Tuesday by 2 PM • Track your settlements and earnings</p>
          {restaurant_id && (
            <div className="restaurant-info">
              🍽️ Restaurant ID: {restaurant_id}
            </div>
          )}
        </div>
        <div className="header-actions">
          <button className="help-btn" onClick={() => alert('Tuesday Payout Help:\n\n📅 Payouts are processed every Tuesday by 2 PM\n💰 Minimum payout amount: ₹1,000\n📊 Current cycle: Tuesday to Tuesday\n📞 Contact support for any issues')}>
            ❓ Payout Help
          </button>
          <button className="notification-btn">
            🔔
            <span className="notification-count">{payoutData.paymentHistory.filter(p => p.status === 'paid').length}</span>
          </button>
          <button className="refresh-btn" onClick={fetchPayoutData} title="Refresh Data">
            🔄
          </button>
        </div>
      </div>
      
      <div className="payout-container">
        <div className="mobile-tabs-toggle" onClick={() => setShowMobileMenu(!showMobileMenu)}>
          {showMobileMenu ? '▲' : '▼'}
          <span>{activeTab === 'settlement' ? 'Weekly Settlement' : activeTab === 'earnings' ? 'Daily Earnings' : 'Payment History'}</span>
          {showMobileMenu ? '▲' : '▼'}
        </div>
        
        <div className={`tabs-navigation ${showMobileMenu ? 'show' : ''}`}>
          <button 
            className={`tab-btn ${activeTab === 'settlement' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('settlement');
              setShowMobileMenu(false);
            }}
          >
            📊
            <span>Weekly Settlement</span>
            <span className="tab-badge">Tue</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'earnings' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('earnings');
              setShowMobileMenu(false);
            }}
          >
            💰
            <span>Daily Earnings</span>
            <span className="tab-badge">{payoutData.earnings.length}</span>
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'paymentHistory' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('paymentHistory');
              setShowMobileMenu(false);
            }}
          >
            📝
            <span>Payment History</span>
            <span className="tab-badge">{payoutData.paymentHistory.length}</span>
          </button>
        </div>
        
        <div className="tabs-content">
          {activeTab === 'settlement' && <SettlementTab />}
          {activeTab === 'earnings' && <EarningsTab />}
          {activeTab === 'paymentHistory' && <PaymentHistoryTab />}
        </div>
      </div>
      
      <div className="quick-actions-mobile">
        <button className="quick-action" onClick={handleWithdraw}>
          💰
          <span>Withdraw</span>
        </button>
        <button className="quick-action" onClick={() => setActiveTab('settlement')}>
          📊
          <span>Settlement</span>
        </button>
        <button className="quick-action" onClick={() => setActiveTab('paymentHistory')}>
          📝
          <span>History</span>
        </button>
      </div>
    </div>
  );
};

export default PayoutManagement;