import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight, FiMap, FiUsers, FiBriefcase, FiBookOpen } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Navbar from "@/components/common/Navbar";

function LandingPage() {

    const navigate = useNavigate();

    const currentYear = new Date().getFullYear();

    const fadeInUp = {
        initial: { opacity: 0, y: 60 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true },
        transition: { duration: 0.6 }
    };

    const staggerContainer = {
        initial: { opacity: 0 },
        whileInView: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        },
        viewport: { once: true }
    };

    // 18 Departments data (clickable)
    const departments = [
        { code: 'AERO', name: 'Aero Engineering' },
        { code: 'AGRI', name: 'Agricultural Engineering' },
        { code: 'AI&DS', name: 'Artificial Intelligence & Data Science' },
        { code: 'AI&ML', name: 'Artificial Intelligence & Machine Learning' },
        { code: 'BME', name: 'Bio Medical Engineering' },
        { code: 'CIVIL', name: 'Civil Engineering' },
        { code: 'CSE', name: 'Computer Science and Engineering' },
        { code: 'CSBS', name: 'Computer Science & Business System' },
        { code: 'ECE', name: 'Electronics & Communication Engineering' },
        { code: 'EEE', name: 'Electrical and Electronics Engineering' },
        { code: 'FOOD TECH', name: 'Food Technology' },
        { code: 'IT', name: 'Information Technology' },
        { code: 'MBA', name: 'Master in Business Administration' },
        { code: 'MCA', name: 'Master in Computer Application' },
        { code: 'MECH', name: 'Mechanical Engineering' },
        { code: 'M.Tech CSE', name: 'M.Tech CSE' },
        { code: 'PCT', name: 'PetroChemical Technology' },
        { code: 'SFE', name: 'Safety and Fire Engineering' }
    ];



    // Impact section data with icons
    const impactItems = [
        { icon: <FiUsers size={24} />, title: 'Students', description: 'Discover careers and startup ideas inside your own branch.' },
        { icon: <FiBriefcase size={24} />, title: 'Startups', description: 'Find underserved domains & technical gaps.' },
        { icon: <FiMap size={24} />, title: 'Industries', description: 'Source talent with specific domain alignment.' },
        { icon: <FiBookOpen size={24} />, title: 'Researchers', description: 'Identify applied research opportunities.' }
    ];

    return (
        <div className="landing-page">
            <Navbar />
            {/* Hero Section - Updated with grey background */}
            <section className="hero hero-grey" id="home">
                <div className="hero-bg">
                    <div className="hero-bg-blob hero-blob-1"></div>
                    <div className="hero-bg-blob hero-blob-2"></div>
                </div>

                <div className="hero-content">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="hero-title">
                            Project <span className="hero-title-span">Mayaa</span>
                        </h1>
                        <p className="hero-subtitle">
                            140 business domains | 18 engineering departments
                        </p>
                        <p className="hero-description">
                            Bridging technical depth with market opportunities — a clear map from engineering to industry.
                        </p>
                        <div className="hero-buttons">
                            <motion.a
                                href="#departments"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="btn btn-primary btn-large"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const element = document.getElementById("departments");
                                    if (element) {
                                        element.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                        });
                                    }
                                }}
                            >
                                Explore domains
                            </motion.a>

                            <motion.a
                                href="#departments"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="btn btn-outline btn-large"
                                onClick={(e) => {
                                    e.preventDefault();
                                    const element = document.getElementById("departments");
                                    if (element) {
                                        element.scrollIntoView({
                                            behavior: "smooth",
                                            block: "start",
                                        });
                                    }
                                }}
                            >
                                Departments
                            </motion.a>
                        </div>

                    </motion.div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="about">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="about-header"
                    >
                        <h2 className="about-title">Mapping the unseen</h2>
                        <p className="about-subtitle">
                            Project Mayaa systematically connects every engineering discipline with real‑world business domains.
                        </p>
                    </motion.div>

                    <div className="about-grid">
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                        >
                            <h3 className="about-content-title">Why it matters</h3>
                            <p className="about-content-text">
                                Engineering graduates often miss the business side of their skills. We map 140+ domains — from aerospace to biotech — to actual industries, startups, and innovation gaps.
                            </p>
                            <div className="about-stats">
                                <div className="stat-item">
                                    <span className="stat-number">140+</span>
                                    <span className="stat-label">domains</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-number">18</span>
                                    <span className="stat-label">departments</span>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6 }}
                            className="about-card"
                        >
                            <h3 className="about-card-title">Vision & mission</h3>
                            <div className="about-card-items">
                                <div className="about-card-item">
                                    <span className="dot"></span>
                                    <p className="about-card-text">
                                        <span className="about-card-bold">Vision:</span> Every engineer able to spot business opportunities in their own domain.
                                    </p>
                                </div>
                                <div className="about-card-item">
                                    <span className="dot"></span>
                                    <p className="about-card-text">
                                        <span className="about-card-bold">Mission:</span> Build the first complete map between engineering education and market needs.
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Departments Section */}
            <section id="departments" className="departments">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="departments-header"
                    >
                        <h2 className="departments-title">18 departments</h2>
                    </motion.div>

                    <motion.div
                        variants={staggerContainer}
                        initial="initial"
                        whileInView="whileInView"
                        viewport={{ once: true }}
                        className="departments-grid"
                    >
                        {departments.map((dept, index) => (
                            <motion.a
                                key={index}
                                variants={fadeInUp}
                                whileHover={{ y: -4 }}
                                className="department-card"
                                onClick={() => navigate(`/login`)}
                                style={{ cursor: "pointer" }}
                            >
                                <span className="department-code">{dept.code}</span>
                                <span className="department-name">{dept.name}</span>
                            </motion.a>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Impact Section */}
            <section id="impact" className="impact">
                <div className="container">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="impact-header"
                    >
                        <h2 className="impact-title">Who benefits</h2>
                        <p className="impact-subtitle">Designed for the whole engineering ecosystem.</p>
                    </motion.div>

                    <div className="impact-grid">
                        {impactItems.map((item, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.9 }}
                                whileInView={{ opacity: 1, scale: 1 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ y: -5 }}
                                className="impact-card"
                            >
                                <div className="impact-icon" style={{ color: 'hsl(var(--accent))' }}>
                                    {item.icon}
                                </div>
                                <h3 className="impact-card-title">{item.title}</h3>
                                <p className="impact-card-text">{item.description}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>



            {/* Footer */}
            <footer id="contact" className="footer">
                <div className="container">
                    <div className="footer-grid">
                        {/* Brand Section */}
                        <div className="footer-brand">
                            <h3 className="footer-logo">Project Mayaa</h3>
                            <p className="footer-tagline">
                                Bridging the gap between engineering excellence and business innovation.
                            </p>
                            <div className="footer-social">
                                <a href="#" className="social-link" aria-label="LinkedIn">
                                    <i className="fab fa-linkedin-in"></i>
                                </a>
                                <a href="#" className="social-link" aria-label="Twitter">
                                    <i className="fab fa-twitter"></i>
                                </a>
                                <a href="#" className="social-link" aria-label="GitHub">
                                    <i className="fab fa-github"></i>
                                </a>
                                <a href="#" className="social-link" aria-label="Medium">
                                    <i className="fab fa-medium-m"></i>
                                </a>
                            </div>
                        </div>

                        {/* Quick Links */}
                        <div className="footer-links-section">
                            <h4 className="footer-heading">Quick Links</h4>
                            <ul className="footer-links">
                                <li><a href="#about" className="footer-link">About Us</a></li>
                                <li><a href="#departments" className="footer-link">Departments</a></li>
                                <li><a href="#projects" className="footer-link">Projects</a></li>
                                <li><a href="#team" className="footer-link">Our Team</a></li>
                            </ul>
                        </div>

                        {/* Resources */}
                        <div className="footer-links-section">
                            <h4 className="footer-heading">Resources</h4>
                            <ul className="footer-links">
                                <li><a href="#" className="footer-link">Blog</a></li>
                                <li><a href="#" className="footer-link">Case Studies</a></li>
                                <li><a href="#" className="footer-link">Whitepapers</a></li>
                                <li><a href="#" className="footer-link">FAQs</a></li>
                            </ul>
                        </div>

                        {/* Contact Info */}
                        <div className="footer-contact">
                            <h4 className="footer-heading">Get in Touch</h4>
                            <ul className="contact-info">
                                <li>
                                    <i className="fas fa-envelope contact-icon"></i>
                                    <a href="mailto:hello@projectmayaa.com" className="contact-link">hello@projectmayaa.com</a>
                                </li>
                                <li>
                                    <i className="fas fa-phone contact-icon"></i>
                                    <a href="tel:+1234567890" className="contact-link">+1 (234) 567-890</a>
                                </li>
                                <li>
                                    <i className="fas fa-map-marker-alt contact-icon"></i>
                                    <span className="contact-text">San Francisco, CA</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Bottom Bar */}
                    <div className="footer-bottom">
                        <div className="copyright">
                            © {currentYear} Project Mayaa. All rights reserved.
                        </div>
                        <div className="legal-links">
                            <a href="#" className="legal-link">Privacy Policy</a>
                            <span className="separator">•</span>
                            <a href="#" className="legal-link">Terms of Service</a>
                            <span className="separator">•</span>
                            <a href="#" className="legal-link">Cookie Policy</a>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

export default LandingPage;
