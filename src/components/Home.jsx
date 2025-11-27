import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export function Home() {
    const navigate = useNavigate();
    const [text, setText] = useState('');
    const fullText = "Meet your Arsenal.";

    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            setText(fullText.slice(0, index + 1));
            index++;
            if (index > fullText.length) clearInterval(interval);
    );
    }
