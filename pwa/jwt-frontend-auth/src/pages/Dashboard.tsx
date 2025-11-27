import React from 'react';
import { useAuth } from '../auth/useAuth';

const Dashboard: React.FC = () => {
    const { user } = useAuth();

    return (
        <div>
            <h1>Dashboard</h1>
            {user ? (
                <div>
                    <h2>Welcome, {user.name}!</h2>
                    <p>This is your dashboard where you can manage your account.</p>
                </div>
            ) : (
                <p>Please log in to access your dashboard.</p>
            )}
        </div>
    );
};

export default Dashboard;