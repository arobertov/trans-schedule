import React from 'react';
import { useAuth } from '../auth/useAuth';

const Profile: React.FC = () => {
    const { user } = useAuth();

    return (
        <div>
            <h1>User Profile</h1>
            {user ? (
                <div>
                    <p><strong>Name:</strong> {user.name}</p>
                    <p><strong>Email:</strong> {user.email}</p>
                    {/* Add more user details as needed */}
                </div>
            ) : (
                <p>Please log in to view your profile.</p>
            )}
        </div>
    );
};

export default Profile;