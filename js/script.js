// Mobile Navigation Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navButtons = document.querySelector('.nav-buttons');

if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
        if (navButtons) navButtons.classList.toggle('active');
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-menu a, .nav-buttons a').forEach(n => n.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        if (navButtons) navButtons.classList.remove('active');
    }));
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// Simple scroll effect for navbar
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (window.scrollY > 100) {
            navbar.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
            navbar.style.background = 'rgba(255, 255, 255, 0.98)';
        } else {
            navbar.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
            navbar.style.background = '#fff';
        }
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('TeTWIT website loaded successfully');
    
    // Member Registration Form
    const memberForm = document.getElementById('memberForm');
    const memberFormMessage = document.getElementById('memberFormMessage');
    
    if (memberForm) {
        memberForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(memberForm);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('/api/members', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    memberFormMessage.textContent = result.message;
                    memberFormMessage.className = 'form-message success';
                    memberForm.reset();
                } else {
                    memberFormMessage.textContent = result.message;
                    memberFormMessage.className = 'form-message error';
                }
            } catch (error) {
                memberFormMessage.textContent = 'An error occurred. Please try again.';
                memberFormMessage.className = 'form-message error';
            }
        });
    }
    
    // Partnership Form
    const partnershipForm = document.getElementById('partnershipForm');
    const partnershipFormMessage = document.getElementById('partnershipFormMessage');
    
    if (partnershipForm) {
        partnershipForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(partnershipForm);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch('/api/partnerships', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    partnershipFormMessage.textContent = result.message;
                    partnershipFormMessage.className = 'form-message success';
                    partnershipForm.reset();
                } else {
                    partnershipFormMessage.textContent = result.message;
                    partnershipFormMessage.className = 'form-message error';
                }
            } catch (error) {
                partnershipFormMessage.textContent = 'An error occurred. Please try again.';
                partnershipFormMessage.className = 'form-message error';
            }
        });
    }
});