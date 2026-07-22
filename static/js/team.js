// Team Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll animation for page load
    const teamPage = document.querySelector('.team-page');
    if (teamPage) {
        teamPage.style.opacity = '0';
        teamPage.style.transform = 'translateY(20px)';
        teamPage.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        
        setTimeout(() => {
            teamPage.style.opacity = '1';
            teamPage.style.transform = 'translateY(0)';
        }, 100);
    }

    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe all cards
    const cards = document.querySelectorAll('.overview-card, .service-item, .member-card');
    cards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });

    // Member card hover effect enhancement
    const memberCards = document.querySelectorAll('.member-card');
    memberCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // Add click event for member cards (optional expansion)
    memberCards.forEach(card => {
        card.addEventListener('click', function() {
            const memberName = this.querySelector('h3').textContent;
            const memberRole = this.querySelector('.member-role').textContent;
            const memberDesc = this.querySelector('p').textContent;
            
            // You can add modal or expansion functionality here
            console.log(`Selected: ${memberRole} ${memberName} - ${memberDesc}`);
        });
    });

    // Smooth scroll for internal links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});
