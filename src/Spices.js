import React, { useState, useEffect } from 'react';
import serviceUrl from './config';

const Spices = ({ userInfo, updateUserBalance }) => {
    const [depositAmount, setDepositAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [transactionHistory, setTransactionHistory] = useState([]);

    useEffect(() => {
        // if (userInfo) {
        //     // Fetch transaction history
        //     fetch(`${serviceUrl}/transactions/${userInfo.public_key}`)
        //         .then(response => response.json())
        //         .then(data => setTransactionHistory(data.transactions))
        //         .catch(error => console.error('Error fetching transaction history:', error));
        // }
    }, [userInfo]);

    const handleDeposit = () => {
        fetch(`${serviceUrl}/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userInfo.token}` // Adjust based on your auth setup
            },
            body: JSON.stringify({ amount: depositAmount })
        })
        .then(response => response.json())
        .then(data => {
            updateUserBalance(data.newBalance);
            setTransactionHistory(data.transactions);
            setDepositAmount('');
        })
        .catch(error => console.error('Error making deposit:', error));
    };

    const handleWithdraw = () => {
        fetch(`${serviceUrl}/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userInfo.token}` // Adjust based on your auth setup
            },
            body: JSON.stringify({ amount: withdrawAmount })
        })
        .then(response => response.json())
        .then(data => {
            updateUserBalance(data.newBalance);
            setTransactionHistory(data.transactions);
            setWithdrawAmount('');
        })
        .catch(error => console.error('Error making withdrawal:', error));
    };

    return (
        <div>
            <h2>Spices ✨</h2>
            <hr></hr>
            <h3>Balance: <b>{userInfo.balance} </b>spices</h3> <span>(* spice is the fuel to locomize all activities in community)</span>
            <div>
                <input
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Amount to deposit"
                />
                <button onClick={handleDeposit}>Deposit</button>
            </div>
            <div>
                <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Amount to withdraw"
                />
                <button onClick={handleWithdraw}>Withdraw</button>
            </div>
            <hr></hr>
            <h3>Transaction History</h3>
            <ul>
                {transactionHistory.map((transaction, index) => (
                    <li key={index}>{transaction.description}: {transaction.amount} ✨</li>
                ))}
            </ul>
        </div>
    );
};

export default Spices;
