import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

function Navbar() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const navLinks = [
        { label: 'Home', href: '#home' },
        { label: 'Departments', href: '#departments' },
        { label: 'Impact', href: '#impact' },
    ];

    const handleNavClick = (e, href) => {
        e.preventDefault();
        const el = document.querySelector(href);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <nav className={`pm-navbar ${scrolled ? 'pm-navbar-scrolled' : ''}`}>
            <div className="pm-navbar-container">

                {/* Logo */}
                <a href="#home" className="pm-navbar-logo" onClick={(e) => handleNavClick(e, '#home')}>
                    <span className="pm-navbar-logo-icon">
                        <i className="fas fa-map"></i>
                    </span>
                    <div className="pm-navbar-logo-text">
                        <span className="pm-navbar-logo-main">
                            Project<span className="pm-navbar-logo-accent">Mayaa</span>
                        </span>
                        <span className="pm-navbar-logo-tagline">
                            Engineering • Business • Innovation
                        </span>
                    </div>
                </a>

                {/* Desktop Nav Links */}
                <div className="pm-navbar-links">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="pm-nav-link"
                            onClick={(e) => handleNavClick(e, link.href)}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                {/* Login Button */}
                <motion.a
                    href="/login"
                    className="pm-navbar-login"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={(e) => { e.preventDefault(); navigate('/login'); }}
                >
                    <i className="fas fa-sign-in-alt"></i>
                    <span>Login</span>
                </motion.a>

            </div>
        </nav>
    );
}

export default Navbar;
