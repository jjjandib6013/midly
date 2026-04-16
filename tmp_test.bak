// Quick test: login and fetch wallet
async function test() {
   // Login
   const loginRes = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'juan@midly.com', password: 'password123' })
   });
   const loginData = await loginRes.json();
   console.log('Login:', loginRes.status, JSON.stringify(loginData).substring(0, 100));
   
   if (!loginData.token) { console.log('NO TOKEN - login failed'); process.exit(1); }
   
   // Test wallet endpoint
   const walletRes = await fetch('http://localhost:5000/api/user/wallet', {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
   });
   console.log('Wallet status:', walletRes.status);
   const walletData = await walletRes.json();
   console.log('Wallet data:', JSON.stringify(walletData));
   
   // Test profile endpoint
   const profileRes = await fetch('http://localhost:5000/api/user/profile', {
      headers: { 'Authorization': `Bearer ${loginData.token}` }
   });
   const profileData = await profileRes.json();
   console.log('Profile wallet_balance:', profileData.wallet_balance);
}
test().catch(console.error);
