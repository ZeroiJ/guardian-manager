import React from 'react';

const LoginButton = () => {
    const handleLogin = () => {
        window.location.href = 'http://localhost:5000/auth/login';
    };

    return (
        <button
            onClick={handleLogin}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
            Login with Bungie
        </button>
    );
};

export default LoginButton;
