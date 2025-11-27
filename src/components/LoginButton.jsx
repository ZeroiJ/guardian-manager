import React from 'react';

const LoginButton = () => {
    const handleLogin = () => {
        window.location.href = '/api/auth/login';
    };

    return (
        <button
            onClick={handleLogin}
            className="bg-tavus-pink text-black font-sans font-bold uppercase tracking-wider py-4 px-8 border-2 border-black shadow-neo hover:shadow-neo-hover hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-200"
        >
            Login with Bungie
        </button>
    );
};

export default LoginButton;
