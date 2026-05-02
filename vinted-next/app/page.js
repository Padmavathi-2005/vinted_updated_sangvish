'use client';

import React, { useContext, useEffect } from 'react';
import HeroSection from '@/components/home/HeroSection';
import CategoriesSection from '@/components/home/CategoriesSection';
import ListingsSection from '@/components/home/ListingsSection';
import SustainabilitySection from '@/components/home/SustainabilitySection';
import Meta from '@/components/common/Meta';
import AuthContext from '@/context/AuthContext';
import '@/app/styles/Home.css';

export default function Home() {
    const { user } = useContext(AuthContext);

    useEffect(() => {
        // Scroll animation observer
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, observerOptions);

        const animatedElements = document.querySelectorAll('.animate-on-scroll');
        animatedElements.forEach(el => observer.observe(el));

        return () => {
            animatedElements.forEach(el => observer.unobserve(el));
        };
    }, []);

    return (
        <div className="home-page">
            <Meta 
                title="Home"
                description="Explore the best marketplace for pre-loved fashion. Buy and sell clothes, accessories, and more in our sustainable community."
            />
            <HeroSection />
            <CategoriesSection />
            <ListingsSection />
            <SustainabilitySection />
        </div>
    );
}
