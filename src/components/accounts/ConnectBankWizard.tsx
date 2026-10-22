'use client';

import React, { useState } from 'react';
import {
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Check,
  Search,
  Building2,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface ConnectBankWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SUPPORTED_BANKS = [
  { code: 'HDFC', name: 'HDFC Bank', category: 'Private Bank', color: 'bg-blue-600' },
  { code: 'ICICI', name: 'ICICI Bank', category: 'Private Bank', color: 'bg-orange-600' },
  { code: 'SBI', name: 'State Bank of India', category: 'Public Sector', color: 'bg-sky-600' },
  { code: 'AXIS', name: 'Axis Bank', category: 'Private Bank', color: 'bg-rose-700' },
  { code: 'KOTAK', name: 'Kotak Mahindra Bank', category: 'Private Bank', color: 'bg-red-600' },
  { code: 'BOB', name: 'Bank of Baroda', category: 'Public Sector', color: 'bg-amber-600' },
  { code: 'PNB', name: 'Punjab National Bank', category: 'Public Sector', color: 'bg-yellow-700' },
  { code: 'INDUSIND', name: 'IndusInd Bank', category: 'Private Bank', color: 'bg-red-800' },
  { code: 'FEDERAL', name: 'Federal Bank', category: 'Private Bank', color: 'bg-blue-700' },
  { code: 'IDFC', name: 'IDFC First Bank', category: 'Private Bank', color: 'bg-purple-700' },
  { code: 'YES', name: 'Yes Bank', category: 'Private Bank', color: 'bg-cyan-700' },
  { code: 'CANARA', name: 'Canara Bank', category: 'Public Sector', color: 'bg-blue-800' },
];

export const ConnectBankWizard: React.FC<ConnectBankWizardProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [consentDuration, setConsentDuration] = useState('1_YEAR');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Discovered Accounts (Step 4)
  const [discoveredAccounts, setDiscoveredAccounts] = useState<any[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const handleSelectBank = (bank: any) => {
    setSelectedBank(bank);
    setError('');
    setStep(2);
  };

  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileNumber || mobileNumber.replace(/\D/g, '').length < 10) {
      setError('Please enter a valid 10-digit mobile number linked with your bank.');
      return;
    }
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
    }, 800);
  };

  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) val = val.slice(-1);
    const updated = [...otp];
    updated[index] = val;
    setOtp(updated);

    // Auto-focus next input
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Simulate account discovery under user consent
      setTimeout(() => {
        setIsLoading(false);
        const code = selectedBank?.code || 'HDFC';
        const accounts = [
          {
            id: `disc_${code.toLowerCase()}_sav`,
            name: `${selectedBank?.name} Savings Account`,
            maskedNumber: '•••• 9821',
            type: 'SAVINGS',
            balance: code === 'HDFC' ? '1,42,850.50' : '88,420.00',
          },
          {
            id: `disc_${code.toLowerCase()}_card`,
            name: `${selectedBank?.name} Platinum Credit Card`,
            maskedNumber: '•••• 4012',
            type: 'CREDIT_CARD',
            balance: '24,890.00',
          },
        ];
        setDiscoveredAccounts(accounts);
        setSelectedAccountIds(accounts.map((a) => a.id));
        setStep(4);
      }, 1000);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.message || 'Verification failed');
    }
  };

  const handleCompleteConnection = async () => {
    setIsLoading(true);
    setError('');

    try {
      // Trigger sync with selected institution
      const res = await fetch('/api/bank/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institutionCode: selectedBank?.code || 'HDFC' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Connection failed');
      }

      setStep(5);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to complete bank synchronization.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedBank(null);
    setSearchQuery('');
    setMobileNumber('');
    setOtp(['', '', '', '', '', '']);
    setError('');
    onClose();
  };

  const filteredBanks = SUPPORTED_BANKS.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Link Bank Account"
      description="Connect your bank accounts securely via RBI-regulated Account Aggregator (AA) consent."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Step Progress Bar */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1">
          <span className={step >= 1 ? 'text-blue-600 font-bold' : ''}>1. Select Bank</span>
          <span>&rarr;</span>
          <span className={step >= 2 ? 'text-blue-600 font-bold' : ''}>2. Consent Terms</span>
          <span>&rarr;</span>
          <span className={step >= 3 ? 'text-blue-600 font-bold' : ''}>3. Mobile OTP</span>
          <span>&rarr;</span>
          <span className={step >= 4 ? 'text-blue-600 font-bold' : ''}>4. Select Accounts</span>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-600 text-xs rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        {/* STEP 1: SELECT BANK */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across 50+ supported banks (HDFC, SBI, ICICI...)"
                className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {filteredBanks.map((bank) => (
                <button
                  key={bank.code}
                  type="button"
                  onClick={() => handleSelectBank(bank)}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 text-left transition-all group flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className={`w-8 h-8 rounded-lg ${bank.color} text-white font-bold text-xs flex items-center justify-center shadow-sm`}>
                      {bank.code.slice(0, 3)}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-medium">{bank.code}</span>
                  </div>
                  <div className="mt-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {bank.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">{bank.category}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Consent is managed through authorized RBI Account Aggregator specifications.</span>
            </div>
          </div>
        )}

        {/* STEP 2: CONSENT TERMS & MOBILE ENTRY */}
        {step === 2 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="flex items-center gap-3 p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-100 dark:border-blue-900/60">
              <div className={`w-10 h-10 rounded-xl ${selectedBank?.color} text-white font-bold text-sm flex items-center justify-center shadow-sm shrink-0`}>
                {selectedBank?.code.slice(0, 3)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">{selectedBank?.name}</h3>
                <p className="text-[11px] text-blue-600 font-medium">Account Aggregator Consent Flow</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Registered Mobile Number
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400 font-mono">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  className="w-full text-sm font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg pl-12 pr-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter the mobile number linked with your {selectedBank?.name} account.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Consent Validity Period
              </label>
              <select
                value={consentDuration}
                onChange={(e) => setConsentDuration(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white"
              >
                <option value="1_YEAR">1 Year (Recommended for ongoing expense tracking)</option>
                <option value="6_MONTHS">6 Months</option>
                <option value="3_MONTHS">3 Months</option>
              </select>
            </div>

            <div className="space-y-2 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold">
                <Lock className="w-3.5 h-3.5 text-emerald-600" /> Read-Only Encryption Guarantees:
              </div>
              <ul className="list-disc pl-4 space-y-1">
                <li>Zero access to NetBanking passwords, UPI PINs, or OTPs.</li>
                <li>Permits read-only statement download and daily balance refresh.</li>
                <li>You can revoke consent anytime in Account Settings.</li>
              </ul>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button type="submit" size="sm" isLoading={isLoading}>
                Request Verification OTP <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        )}

        {/* STEP 3: OTP VERIFICATION */}
        {step === 3 && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center py-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 mx-auto flex items-center justify-center mb-2">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Enter Verification OTP</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                A 6-digit consent OTP was sent to +91 {mobileNumber}
              </p>
            </div>

            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  className="w-10 h-12 text-center text-lg font-bold font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ))}
            </div>

            <div className="text-center text-xs text-slate-400">
              Didn&apos;t receive code?{' '}
              <button
                type="button"
                onClick={() => setOtp(['4', '8', '2', '1', '9', '0'])}
                className="text-blue-600 font-semibold hover:underline"
              >
                Auto-fill Demo OTP (482190)
              </button>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(2)}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button type="submit" size="sm" isLoading={isLoading}>
                Verify & Discover Accounts <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </form>
        )}

        {/* STEP 4: SELECT DISCOVERED ACCOUNTS */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Discovered Accounts at {selectedBank?.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Select the accounts you want to link and sync into your financial ledger:
              </p>
            </div>

            <div className="space-y-2.5">
              {discoveredAccounts.map((acc) => {
                const isSelected = selectedAccountIds.includes(acc.id);
                return (
                  <div
                    key={acc.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedAccountIds(selectedAccountIds.filter((i) => i !== acc.id));
                      } else {
                        setSelectedAccountIds([...selectedAccountIds, acc.id]);
                      }
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                        {acc.type === 'CREDIT_CARD' ? (
                          <CreditCard className="w-4 h-4 text-purple-600" />
                        ) : (
                          <Landmark className="w-4 h-4 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{acc.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{acc.maskedNumber} • {acc.type}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold font-mono text-slate-900 dark:text-white">₹{acc.balance}</p>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded border-slate-300 text-blue-600 mt-1"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(3)}>
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
              <Button
                size="sm"
                onClick={handleCompleteConnection}
                disabled={selectedAccountIds.length === 0}
                isLoading={isLoading}
              >
                Confirm & Sync Transactions
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS CONFIRMATION */}
        {step === 5 && (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center animate-bounce">
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Bank Accounts Successfully Connected!
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your accounts at {selectedBank?.name} are now linked and your historical transactions have been synced to your ledger.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
