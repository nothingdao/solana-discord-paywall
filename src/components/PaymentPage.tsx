// src/components/PaymentPage.tsx
// Move the PaymentPage component we created earlier here

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const PaymentPage = () => {
  const { publicKey, sendTransaction } = useWallet();
  const [referralCode, setReferralCode] = useState('');
  const [status, setStatus] = useState('');

  const handlePayment = async () => {
    if (!publicKey) {
      setStatus('Please connect your wallet first');
      return;
    }

    try {
      setStatus('Processing payment...');

      // Create payment transaction
      // This is simplified - you'd need to add actual transaction logic
      const transaction = await createPaymentTransaction(publicKey);

      // Send transaction
      const signature = await sendTransaction(transaction);

      // Verify payment and update Discord role
      const response = await fetch('/api/verifyPayment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature,
          discordId: 'USER_DISCORD_ID', // You'll need to get this from Discord OAuth
          referralCode,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('Payment successful! Discord role added.');
      } else {
        setStatus('Payment failed: ' + result.error);
      }
    } catch (error) {
      setStatus('Error: ' + error.message);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6">Subscribe with Solana</h1>

      <div className="mb-4">
        <WalletMultiButton className="w-full" />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Referral Code (Optional)
        </label>
        <input
          type="text"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="Enter referral code"
        />
      </div>

      <button
        onClick={handlePayment}
        disabled={!publicKey}
        className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
      >
        Pay 1 SOL
      </button>

      {status && (
        <div className="mt-4 p-3 bg-gray-100 rounded">
          {status}
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
