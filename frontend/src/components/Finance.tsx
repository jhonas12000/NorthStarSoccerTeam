import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth-context';

type TransactionType = 'income' | 'expense';
type OverviewPeriod = 'monthly' | 'quarterly' | 'annually' | 'custom';
type Transaction = {
  id: string;
  type: TransactionType;
  amountCents: number;
  category: string;
  description: string;
  date: string;
  memberId?: string;
  months?: number;
  monthsPaid?: string[];
};
type FinanceSummary = { incomeCents: number; expenseCents: number; balanceCents: number };
type FinanceMember = { id: string; firstName: string; lastName: string; membershipStartMonth?: string };

const emptySummary: FinanceSummary = { incomeCents: 0, expenseCents: 0, balanceCents: 0 };
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const localDateString = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateRangeFor = (period: OverviewPeriod, customStart: string, customEnd: string) => {
  if (period === 'custom') return { startDate: customStart, endDate: customEnd };

  const now = new Date();
  const year = now.getFullYear();
  const month = period === 'annually'
    ? 0
    : period === 'quarterly'
      ? Math.floor(now.getMonth() / 3) * 3
      : now.getMonth();
  const start = new Date(year, month, 1);
  const end = period === 'monthly'
    ? new Date(year, month + 1, 0)
    : period === 'quarterly'
      ? new Date(year, month + 3, 0)
      : new Date(year, 11, 31);

  return { startDate: localDateString(start), endDate: localDateString(end) };
};
const periodNames: Record<OverviewPeriod, string> = {
  monthly: 'This month',
  quarterly: 'This quarter',
  annually: 'This year',
  custom: 'Custom range',
};
const currency = (amountCents: number) => new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
}).format(amountCents / 100);
const monthLabel = (monthKey: string) => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
};
const currentMonthKey = () => new Date().toISOString().slice(0, 7);
const monthsInYear = (year: number) => Array.from({ length: 12 }, (_, index) => `${year}-${String(index + 1).padStart(2, '0')}`);

export default function Finance() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const isTransactionPage = pathname.replace(/\/$/, '').endsWith('/transaction');
  const paymentHistoryMatch = pathname.match(/^\/finance\/members\/([^/]+)\/payments\/?$/);
  const paymentMemberId = paymentHistoryMatch?.[1] ? decodeURIComponent(paymentHistoryMatch[1]) : '';
  const isPaymentHistoryPage = Boolean(paymentMemberId);
  const { user, loading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState(emptySummary);
  const [period, setPeriod] = useState<OverviewPeriod>('monthly');
  const [customStart, setCustomStart] = useState(() => {
    const now = new Date();
    return localDateString(new Date(now.getFullYear(), now.getMonth(), 1));
  });
  const [customEnd, setCustomEnd] = useState(today);
  const [type, setType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today);
  const [members, setMembers] = useState<FinanceMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState(() => searchParams.get('memberId') || '');
  const [paymentMember, setPaymentMember] = useState<FinanceMember | null>(null);
  const [payments, setPayments] = useState<Transaction[]>([]);
  const [totalPaidCents, setTotalPaidCents] = useState(0);
  const [unallocatedMonthsCount, setUnallocatedMonthsCount] = useState(0);
  const [paymentYear, setPaymentYear] = useState(() => new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentNotice, setPaymentNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const dateRange = dateRangeFor(period, customStart, customEnd);
  const { startDate, endDate } = dateRange;
  const validDateRange = Boolean(startDate && endDate && startDate <= endDate);
  const membershipStartMonth = paymentMember?.membershipStartMonth || currentMonthKey();
  const displayedMonths = monthsInYear(paymentYear);
  const currentMonth = currentMonthKey();
  const paidMonthSet = new Set(payments.flatMap((payment) => payment.monthsPaid || []));
  const membershipStartYear = Number(membershipStartMonth.slice(0, 4));
  const paymentYears = Array.from(
    { length: Math.max(1, new Date().getFullYear() - membershipStartYear + 2) },
    (_, index) => new Date().getFullYear() - index,
  );
  const payableSelectedMonths = selectedMonths.filter((month) => (
    displayedMonths.includes(month)
    && !paidMonthSet.has(month)
    && month >= membershipStartMonth
  ));
  const paidMonthCountThisYear = displayedMonths.filter((month) => paidMonthSet.has(month)).length;

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    if (user.role !== 'finance' && user.role !== 'admin') {
      navigate('/member', { replace: true });
      return;
    }

  }, [authLoading, navigate, user]);

  useEffect(() => {
    if (authLoading || !user || (user.role !== 'finance' && user.role !== 'admin')) return;
    if (isPaymentHistoryPage) return;
    if (!validDateRange) return;

    let active = true;
    const query = new URLSearchParams({ startDate, endDate });
    fetch(`/api/finance?${query}`, { credentials: 'same-origin' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load finance records.');
        return result;
      })
      .then((result: { summary: FinanceSummary; transactions: Transaction[] }) => {
        if (active) {
          setSummary(result.summary);
          setTransactions(result.transactions);
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load finance records.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [authLoading, endDate, isPaymentHistoryPage, startDate, user, validDateRange]);

  useEffect(() => {
    if (!isPaymentHistoryPage || authLoading || !user || (user.role !== 'finance' && user.role !== 'admin')) return;

    let active = true;
    const loadPaymentHistory = async () => {
      try {
        const response = await fetch(`/api/finance/members/${encodeURIComponent(paymentMemberId)}/payments`, { credentials: 'same-origin' });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load payment history.');
        if (active) {
          setPaymentMember(result.member);
          setTotalPaidCents(result.totalPaidCents);
          setUnallocatedMonthsCount(result.unallocatedMonthsCount || 0);
          setPayments(result.payments);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load payment history.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadPaymentHistory();

    return () => { active = false; };
  }, [authLoading, isPaymentHistoryPage, paymentMemberId, user]);

  const recordMembershipPayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPaymentError('');
    setPaymentNotice('');
    if (payableSelectedMonths.length < 1 || payableSelectedMonths.length > 48) {
      setPaymentError('Select at least one unpaid due month to record.');
      return;
    }

    setRecordingPayment(true);
    try {
      const response = await fetch(`/api/finance/members/${encodeURIComponent(paymentMemberId)}/payments/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ monthsPaid: payableSelectedMonths }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to record payment.');

      const transaction = result.transaction as Transaction;
      setPayments((current) => [transaction, ...current]);
      setTotalPaidCents((current) => current + transaction.amountCents);
      setSelectedMonths([]);
      setPaymentNotice(`Payment recorded: ${payableSelectedMonths.map(monthLabel).join(', ')}.`);
    } catch (recordError) {
      setPaymentError(recordError instanceof Error ? recordError.message : 'Unable to record payment.');
    } finally {
      setRecordingPayment(false);
    }
  };

  useEffect(() => {
    if (!isTransactionPage || authLoading || !user || (user.role !== 'finance' && user.role !== 'admin')) return;

    let active = true;
    fetch('/api/members', { credentials: 'same-origin' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load members.');
        return result.members as FinanceMember[];
      })
      .then((result) => {
        if (active) {
          setMembers(result);
          const requestedMemberId = searchParams.get('memberId');
          if (requestedMemberId && result.some((member) => member.id === requestedMemberId)) {
            setSelectedMemberId(requestedMemberId);
          }
        }
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load members.');
      });

    return () => { active = false; };
  }, [authLoading, isTransactionPage, searchParams, user]);

  const addTransaction = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    const amountCents = Math.round(Number(amount) * 100);
    if (!Number.isSafeInteger(amountCents) || amountCents < 1) {
      setError('Enter an amount greater than zero.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/finance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          type,
          amountCents,
          category,
          description,
          date,
          memberId: type === 'income' ? selectedMemberId || undefined : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Unable to save the transaction.');

      const transaction = result.transaction as Transaction;
      if (transaction.date >= startDate && transaction.date <= endDate) {
        setTransactions((current) => [transaction, ...current].slice(0, 10));
        setSummary((current) => {
          const incomeCents = current.incomeCents + (type === 'income' ? amountCents : 0);
          const expenseCents = current.expenseCents + (type === 'expense' ? amountCents : 0);
          return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents };
        });
      }
      setAmount('');
      setCategory('');
      setDescription('');
      setDate(today());
      setSuccess(`${type === 'income' ? 'Income' : 'Expense'} recorded successfully.`);
      if (type === 'income' && selectedMemberId) setLoading(true);
      navigate(type === 'income' && selectedMemberId
        ? `/finance/members/${encodeURIComponent(selectedMemberId)}/payments`
        : '/finance');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the transaction.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || (user.role !== 'finance' && user.role !== 'admin')) {
    return <p role="status" className="px-4 py-24 text-center text-slate-600">Loading finance…</p>;
  }

  return (
    <section className="min-h-[60vh] bg-slate-50 px-4 py-10 sm:py-14">
      <div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl bg-blue-950 p-4 text-white shadow-lg md:sticky md:top-24">
          <p className="px-3 pb-3 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Finance workspace</p>
          <nav aria-label="Finance menu" className="flex flex-col gap-1">
            <Link to="/finance" aria-current={!isTransactionPage && !isPaymentHistoryPage ? 'page' : undefined} className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${!isTransactionPage && !isPaymentHistoryPage ? 'bg-white/10 text-white hover:bg-white/15' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}>
              Overview
            </Link>
            <Link to={isPaymentHistoryPage ? `/finance/transaction?memberId=${encodeURIComponent(paymentMemberId)}` : '/finance/transaction'} aria-current={isTransactionPage ? 'page' : undefined} className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${isTransactionPage ? 'bg-white/10 text-white hover:bg-white/15' : 'text-blue-100 hover:bg-white/10 hover:text-white'}`}>
              Transaction
            </Link>
          </nav>
          <p className="mt-5 border-t border-white/15 px-3 pt-4 text-xs leading-5 text-blue-200">
            Signed in as {user.firstName}
          </p>
        </aside>

        <div className="min-w-0 space-y-6">
          <header>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-600">Finance</p>
            <h1 className="mt-2 text-3xl font-extrabold text-blue-950">{isPaymentHistoryPage ? 'Member payment history' : 'Income and expenses'}</h1>
            <p className="mt-2 text-slate-600">
              {isTransactionPage
                ? 'Record an income or expense.'
                : isPaymentHistoryPage
                  ? 'Review all recorded income payments for this member.'
                  : 'Review income, expenses, and the latest activity for the selected period.'}
            </p>
          </header>

          {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-red-800">{error}</p>}
          {success && <p role="status" className="rounded-md bg-emerald-50 p-3 text-emerald-800">{success}</p>}

          {!isTransactionPage && !isPaymentHistoryPage && <>
          <section id="finance-overview" className="scroll-mt-24 space-y-4" aria-labelledby="finance-overview-heading">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="finance-overview-heading" className="text-xl font-bold text-blue-950">Financial overview</h2>
                <p className="mt-1 text-sm text-slate-500">Showing totals for {periodNames[period].toLowerCase()}.</p>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Overview date range">
                {(['monthly', 'quarterly', 'annually', 'custom'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={period === option}
                    onClick={() => {
                      setError('');
                      setLoading(true);
                      setPeriod(option);
                    }}
                    className={`rounded-md px-3 py-2 text-sm font-semibold transition ${period === option ? 'bg-blue-950 text-white' : 'bg-white text-blue-950 shadow-sm hover:bg-blue-50'}`}
                  >
                    {option === 'annually' ? 'Annually' : option[0].toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {period === 'custom' && (
              <div className="flex flex-wrap items-end gap-3 rounded-xl bg-white p-4 shadow-sm">
                <label className="text-sm font-semibold text-blue-950" htmlFor="finance-start-date">
                  From
                  <input id="finance-start-date" type="date" value={customStart} max={customEnd} onChange={(event) => {
                    const value = event.target.value;
                    setCustomStart(value);
                    setError('');
                    setLoading(Boolean(value && customEnd && value <= customEnd));
                  }} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 font-normal" />
                </label>
                <label className="text-sm font-semibold text-blue-950" htmlFor="finance-end-date">
                  To
                  <input id="finance-end-date" type="date" value={customEnd} min={customStart} onChange={(event) => {
                    const value = event.target.value;
                    setCustomEnd(value);
                    setError('');
                    setLoading(Boolean(customStart && value && customStart <= value));
                  }} className="mt-1 block rounded-md border border-slate-300 px-3 py-2 font-normal" />
                </label>
              </div>
            )}
            {!validDateRange && <p role="alert" className="text-sm text-red-700">Choose a valid date range.</p>}
            <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard label="Total income" amount={validDateRange ? summary.incomeCents : 0} tone="text-emerald-700" />
            <SummaryCard label="Total expenses" amount={validDateRange ? summary.expenseCents : 0} tone="text-red-700" />
            <SummaryCard label="Net balance" amount={validDateRange ? summary.balanceCents : 0} tone="text-blue-950" />
            </div>
            {loading && <p role="status" className="text-sm text-slate-500">Updating totals…</p>}
          </section>

          <section id="finance-transactions" className="scroll-mt-24 rounded-2xl bg-white p-6 shadow-lg" aria-labelledby="transaction-list-heading">
            <h2 id="transaction-list-heading" className="text-xl font-bold text-blue-950">10 most recent transactions</h2>
            {validDateRange && transactions.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-136 text-left text-sm">
                  <thead className="border-b border-slate-200 text-slate-600">
                    <tr><th className="px-2 py-3">Date</th><th className="px-2 py-3">Type</th><th className="px-2 py-3">Details</th><th className="px-2 py-3 text-right">Amount</th></tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 10).map((transaction) => (
                      <tr key={transaction.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-3 whitespace-nowrap">{new Date(`${transaction.date}T00:00:00`).toLocaleDateString()}</td>
                        <td className={`px-2 py-3 capitalize ${transaction.type === 'income' ? 'text-emerald-700' : 'text-red-700'}`}>{transaction.type}</td>
                        <td className="px-2 py-3"><span className="block font-semibold text-blue-950">{transaction.category}</span><span className="text-slate-500">{transaction.description}</span></td>
                        <td className="px-2 py-3 text-right font-semibold whitespace-nowrap">{currency(transaction.amountCents)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-slate-50 p-5 text-slate-600">No transactions found for this period.</p>
            )}
          </section>
          </>}

          {isTransactionPage && (
            <form onSubmit={addTransaction} className="max-w-2xl space-y-4 rounded-2xl bg-white p-6 shadow-lg sm:p-8">
              <h2 className="text-xl font-bold text-blue-950">Record a transaction</h2>
              <label className="block text-sm font-semibold text-blue-950" htmlFor="finance-type">
                Type
                <select id="finance-type" value={type} onChange={(event) => setType(event.target.value as TransactionType)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 font-normal">
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                </select>
              </label>
              <div>
                <label className="block text-sm font-semibold text-blue-950" htmlFor="finance-amount">Amount (USD)</label>
                <div className="mt-1 flex items-center rounded-md border border-slate-300 px-3">
                  <span aria-hidden="true">$</span>
                  <input id="finance-amount" type="number" min="0.01" max="1000000" step="0.01" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0.00" className="w-full border-0 px-2 py-3 outline-none" />
                </div>
              </div>
              {type === 'income' && (
                <label className="block text-sm font-semibold text-blue-950" htmlFor="finance-member">
                  Member (optional)
                  <select id="finance-member" value={selectedMemberId} onChange={(event) => setSelectedMemberId(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-3 font-normal">
                    <option value="">Not linked to a member</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-sm font-semibold text-blue-950" htmlFor="finance-category">
                Category
                <input id="finance-category" required maxLength={80} value={category} onChange={(event) => setCategory(event.target.value)} placeholder="e.g. Registration fees" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-3 font-normal" />
              </label>
              <label className="block text-sm font-semibold text-blue-950" htmlFor="finance-description">
                Description
                <input id="finance-description" required maxLength={240} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What was this transaction for?" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-3 font-normal" />
              </label>
              <label className="block text-sm font-semibold text-blue-950" htmlFor="finance-date">
                Date
                <input id="finance-date" type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-3 font-normal" />
              </label>
              <button type="submit" disabled={saving} className="w-full rounded-md bg-amber-400 px-5 py-3 font-bold text-blue-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70">
                {saving ? 'Saving…' : 'Save transaction'}
              </button>
            </form>
          )}

          {isPaymentHistoryPage && (
            <section className="rounded-2xl bg-white p-6 shadow-lg sm:p-8" aria-labelledby="member-payment-heading">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 id="member-payment-heading" className="text-xl font-bold text-blue-950">
                    {paymentMember ? `${paymentMember.firstName} ${paymentMember.lastName}` : 'Member payments'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">Total recorded: {currency(totalPaidCents)}</p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-blue-950">Membership months</h3>
                    <p className="mt-1 text-sm text-slate-500">{paidMonthCountThisYear} of 12 months paid in {paymentYear}.</p>
                  </div>
                  <label className="text-sm font-semibold text-blue-950" htmlFor="membership-payment-year">
                    Year
                    <select id="membership-payment-year" value={paymentYear} onChange={(event) => {
                      setPaymentYear(Number(event.target.value));
                      setSelectedMonths([]);
                      setPaymentError('');
                    }} className="ml-2 rounded-md border border-slate-300 bg-white px-3 py-2">
                      {paymentYears.map((year) => <option key={year} value={year}>{year}</option>)}
                    </select>
                  </label>
                </div>
                <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-label={`${paymentYear} membership months`}>
                  {displayedMonths.map((month) => {
                    const isPaid = paidMonthSet.has(month);
                    const isBeforeMembership = month < membershipStartMonth;
                    const isUpcoming = month > currentMonth;
                    const isSelected = payableSelectedMonths.includes(month);
                    const canRecordPayment = !isPaid && !isBeforeMembership;

                    return (
                      <li key={month}>
                        {canRecordPayment ? (
                          <label className={`flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${isSelected ? 'border-blue-800 bg-blue-50 text-blue-950' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${monthLabel(month)} for payment`}
                              checked={isSelected}
                              onChange={(event) => setSelectedMonths((current) => event.target.checked
                                ? [...current, month]
                                : current.filter((selectedMonth) => selectedMonth !== month))}
                              className="h-4 w-4 accent-blue-950"
                            />
                            <span>{monthLabel(month)}</span>
                            <span className={`ml-auto text-xs font-bold ${isUpcoming ? 'text-blue-700' : 'text-amber-700'}`}>{isUpcoming ? 'Upcoming' : 'Due'}</span>
                          </label>
                        ) : (
                          <div className={`flex min-h-14 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${isPaid ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-100 bg-slate-50 text-slate-400'}`}>
                            {isPaid ? <span aria-hidden="true" className="font-black">✓</span> : <span aria-hidden="true" className="w-3" />}
                            <span>{monthLabel(month)}</span>
                            <span className={`ml-auto text-xs font-bold ${isPaid ? 'text-emerald-800' : 'text-slate-400'}`}>
                              {isPaid ? 'Paid' : isBeforeMembership ? 'Not enrolled' : 'Upcoming'}
                            </span>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {unallocatedMonthsCount > 0 && (
                  <p className="mt-3 text-sm text-amber-800">
                    {unallocatedMonthsCount} month{unallocatedMonthsCount === 1 ? '' : 's'} in older payment records do not identify specific months. Review those records before charging overlapping months.
                  </p>
                )}
              </div>
              <form onSubmit={recordMembershipPayment} className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <div>
                  <h3 className="text-sm font-semibold text-blue-950">Record selected months</h3>
                  <p className="mt-1 text-sm text-slate-500">Select the due months above. Each month adds $30 to income.</p>
                  <p className="mt-2 text-sm font-semibold text-blue-950">
                    {payableSelectedMonths.length} month{payableSelectedMonths.length === 1 ? '' : 's'} selected · Total: {currency(payableSelectedMonths.length * 3000)}
                  </p>
                </div>
                <button type="submit" disabled={recordingPayment || loading || payableSelectedMonths.length === 0} className="rounded-md bg-amber-400 px-5 py-3 font-bold text-blue-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-70">
                  {recordingPayment ? 'Recording…' : 'Record payment'}
                </button>
              </form>
              {paymentError && <p role="alert" className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-800">{paymentError}</p>}
              {paymentNotice && <p role="status" className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-800">{paymentNotice}</p>}
              {loading ? (
                <p role="status" className="mt-5 text-slate-600">Loading payment history…</p>
              ) : payments.length ? (
                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-136 text-left text-sm">
                    <thead className="border-b border-slate-200 text-slate-600">
                      <tr><th className="px-2 py-3">Date</th><th className="px-2 py-3">Category</th><th className="px-2 py-3">Description</th><th className="px-2 py-3 text-right">Amount</th></tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-2 py-3 whitespace-nowrap">{new Date(`${payment.date}T00:00:00`).toLocaleDateString()}</td>
                          <td className="px-2 py-3">{payment.category}</td>
                          <td className="px-2 py-3">
                            <span className="block">{payment.description}</span>
                            {payment.monthsPaid?.length ? (
                              <span className="block text-xs text-slate-500">{payment.monthsPaid.map(monthLabel).join(', ')}</span>
                            ) : payment.months ? (
                              <span className="block text-xs text-amber-700">Month allocation not recorded</span>
                            ) : null}
                          </td>
                          <td className="px-2 py-3 text-right font-semibold text-emerald-700 whitespace-nowrap">{currency(payment.amountCents)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-5 rounded-lg bg-slate-50 p-5 text-slate-600">No recorded payments for this member yet.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </section>
  );
}

function SummaryCard({ label, amount, tone }: { label: string; amount: number; tone: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-md">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-extrabold ${tone}`}>{currency(amount)}</p>
    </div>
  );
}
