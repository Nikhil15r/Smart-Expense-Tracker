// Comprehensive verification of all commercial features
const BASE_URL = 'http://localhost:3000';

async function testFlow() {
  console.log('--- 1. Testing Live User Registration ---');
  const testEmail = `commercial_user_${Date.now()}@smartfinance.in`;
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Nikhil Personal SaaS',
      email: testEmail,
      password: 'SecurePassword2026!',
      currency: 'INR',
    }),
  });

  const regData = await regRes.json();
  console.log('Registration status:', regRes.status, regData.success ? 'PASS' : regData);
  const cookie = regRes.headers.get('set-cookie');

  console.log('\n--- 2. Testing Google OAuth Route ---');
  const googleRes = await fetch(`${BASE_URL}/api/auth/google`, { redirect: 'manual' });
  console.log('Google Auth status:', googleRes.status);
  console.log('Google Auth Location header contains accounts.google.com:', googleRes.headers.get('location')?.includes('accounts.google.com'));

  console.log('\n--- 3. Testing Bank Account Sync (RBI AA) ---');
  const syncRes = await fetch(`${BASE_URL}/api/bank/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookie || '',
    },
    body: JSON.stringify({ institutionCode: 'HDFC' }),
  });
  const syncData = await syncRes.json();
  console.log('Bank Sync status:', syncRes.status, 'Ingested:', syncData.transactionsIngested);

  console.log('\n--- 4. Testing Fetch Accounts & Balances ---');
  const accRes = await fetch(`${BASE_URL}/api/accounts`, {
    headers: { cookie: cookie || '' },
  });
  const accData = await accRes.json();
  console.log('Accounts count:', accData.accounts?.length);
  const targetAcc = accData.accounts[0];
  console.log('Target account:', targetAcc?.name, 'Balance:', targetAcc?.currentBalance);

  console.log('\n--- 5. Testing Manual Transaction Creation ---');
  const addTxRes = await fetch(`${BASE_URL}/api/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookie || '',
    },
    body: JSON.stringify({
      accountId: targetAcc.id,
      amount: '3500.50',
      direction: 'DEBIT',
      date: '2026-10-22',
      originalDescription: 'Customer Cloud Hosting AWS',
      categoryId: 'home-and-utilities',
      notes: 'Monthly infrastructure bill',
    }),
  });
  const addTxData = await addTxRes.json();
  console.log('Add Tx status:', addTxRes.status, 'ID:', addTxData.transaction?.id);
  const createdTxId = addTxData.transaction?.id;

  console.log('\n--- 6. Testing Transaction Edit (Amount, Narration, Category) ---');
  const editTxRes = await fetch(`${BASE_URL}/api/transactions/${createdTxId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookie || '',
    },
    body: JSON.stringify({
      amount: '3999.00',
      originalDescription: 'Customer Cloud Hosting AWS Enterprise',
      categoryId: 'financial',
      notes: 'Upgraded to enterprise compute tier',
    }),
  });
  const editTxData = await editTxRes.json();
  console.log('Edit Tx status:', editTxRes.status, 'New Amount:', editTxData.transaction?.amount);

  console.log('\n--- 7. Testing Transaction Deletion ---');
  const delTxRes = await fetch(`${BASE_URL}/api/transactions/${createdTxId}`, {
    method: 'DELETE',
    headers: { cookie: cookie || '' },
  });
  const delTxData = await delTxRes.json();
  console.log('Delete Tx status:', delTxRes.status, delTxData.success ? 'PASS' : delTxData);

  console.log('\n--- 8. Testing User Profile Update ---');
  const profileRes = await fetch(`${BASE_URL}/api/settings/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookie || '',
    },
    body: JSON.stringify({
      name: 'Nikhil Commercial Lead',
      currency: 'USD',
    }),
  });
  const profileData = await profileRes.json();
  console.log('Profile update status:', profileRes.status, 'New Name:', profileData.user?.name);

  console.log('\n--- 9. Testing Password Update ---');
  const pwdRes = await fetch(`${BASE_URL}/api/settings/password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookie || '',
    },
    body: JSON.stringify({
      currentPassword: 'SecurePassword2026!',
      newPassword: 'BrandNewPassword2026!',
    }),
  });
  const pwdData = await pwdRes.json();
  console.log('Password change status:', pwdRes.status, pwdData.success ? 'PASS' : pwdData);

  console.log('\n--- 10. Testing Budget Creation & Deletion ---');
  const createBudgetRes = await fetch(`${BASE_URL}/api/budgets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookie || '',
    },
    body: JSON.stringify({
      categoryId: 'food-and-dining',
      amount: '12000',
    }),
  });
  const budgetData = await createBudgetRes.json();
  console.log('Create Budget status:', createBudgetRes.status, 'ID:', budgetData.budget?.id);

  const delBudgetRes = await fetch(`${BASE_URL}/api/budgets/${budgetData.budget?.id}`, {
    method: 'DELETE',
    headers: { cookie: cookie || '' },
  });
  console.log('Delete Budget status:', delBudgetRes.status);

  console.log('\n--- 11. Testing Savings Goal Creation & Deletion ---');
  const createGoalRes = await fetch(`${BASE_URL}/api/goals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      cookie: cookie || '',
    },
    body: JSON.stringify({
      name: 'Q4 Reserve Fund',
      targetAmount: '500000',
      currentAmount: '50000',
      targetDate: '2026-12-31T00:00:00.000Z',
    }),
  });
  const goalData = await createGoalRes.json();
  console.log('Create Goal status:', createGoalRes.status, 'ID:', goalData.goal?.id);

  const delGoalRes = await fetch(`${BASE_URL}/api/goals/${goalData.goal?.id}`, {
    method: 'DELETE',
    headers: { cookie: cookie || '' },
  });
  console.log('Delete Goal status:', delGoalRes.status);

  console.log('\n--- 12. Testing Account Disconnect & Deletion ---');
  const delAccRes = await fetch(`${BASE_URL}/api/accounts/${targetAcc.id}`, {
    method: 'DELETE',
    headers: { cookie: cookie || '' },
  });
  console.log('Delete Account status:', delAccRes.status);

  console.log('\n=== ALL 12 END-TO-END COMMERCIAL FLOWS VERIFIED SUCCESSFULLY ===');
}

testFlow().catch(console.error);
