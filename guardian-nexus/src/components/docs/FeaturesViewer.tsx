import React, { useMemo } from 'react';
import { parseFeatures } from '../../utils/markdownParser';
// @ts-ignore
import readmeRaw from '../../../README.md?raw';

export const FeaturesViewer: React.FC = () => {
    const features = useMemo(() => parseFeatures(readmeRaw), []);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, idx) => (
                <div key={idx} className="bg-[#111] border border-white/10 p-4 rounded-lg hover:border-[#f5dc56]/50 transition-colors group">
                    <h3 className="font-bold text-[#f5dc56] mb-2 text-lg group-hover:text-[#fff] transition-colors">{feature.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
                </div>
            ))}
        </div>
    );
};
