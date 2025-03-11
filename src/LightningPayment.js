import React, { useState } from 'react';

const LightningPayment = ({ token }) => {
    const [amount, setAmount] = useState('');
    const [invoice, setInvoice] = useState('');
    const [status, setStatus] = useState('');

    const handlePayment = async () => {
        try {
            setStatus('Processing...');
            const response = await fetch('https://api.getalby.com/payments/bolt11', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // Adjust based on your auth setup
                },
                body: JSON.stringify({
                    "invoice": invoice,
                }),
            });

            if (!response.ok) {
                throw new Error('Payment failed');
            }

            const data = await response.json();
            setStatus(`Payment successful: ${data.payment_hash}`);
        } catch (error) {
            setStatus(`Error: ${error.message}`);
        }
    };

    const handleGenerateInvoice = async () => {
        try {
            setStatus('Generating invoice...');
            const response = await fetch('https://api.getalby.com/invoices', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`, // Adjust based on your auth setup
                },
                body: JSON.stringify({
                    "amount": amount,
                    "memo": "desposit to HERE",
                }),
            });

            if (!response.ok) {
                throw new Error('Invoice generation failed');
            }

            const data = await response.json();
            setInvoice(data.payment_request);
            setStatus('Invoice generated');
        } catch (error) {
            setStatus(`Error: ${error.message}`);
        }
    };

    return (
        <div>
            <h2>Lightning Payment</h2>
            <div>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount in satoshis"
                />
                <button onClick={handleGenerateInvoice}>Generate Invoice</button>
            </div>
            {invoice && (
                <div>
                    <p>Invoice: {invoice}</p>
                    <button onClick={handlePayment}>Pay Invoice</button>
                </div>
            )}
            {status && <p>{status}</p>}
        </div>
    );
};

export default LightningPayment;
