document.addEventListener('DOMContentLoaded', () => {
    const sidebarLinks = document.querySelectorAll('.sidebar a');
    const sections = document.querySelectorAll('.content section');

    // Function to update active link
    const updateActiveLink = () => {
        let currentSectionId = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100; // Adjust offset as needed
            if (window.scrollY >= sectionTop) {
                currentSectionId = section.getAttribute('id');
            }
        });

        sidebarLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${currentSectionId}`) {
                link.classList.add('active');
            }
        });
    };

    // Initial call and on scroll
    updateActiveLink();
    window.addEventListener('scroll', updateActiveLink);

    // Smooth scroll for sidebar links (if CSS scroll-behavior is not enough or for older browsers)
    sidebarLinks.forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            // If you want to prevent default anchor click and handle scrolling purely with JS:
            // e.preventDefault();
            // const targetElement = document.querySelector(targetId);
            // if (targetElement) {
            //     window.scrollTo({
            //         top: targetElement.offsetTop - 50, // Adjust offset if you have a fixed header
            //         behavior: 'smooth'
            //     });
            // }

            // For basic active class setting on click (simpler than scroll-based)
            sidebarLinks.forEach(link => link.classList.remove('active'));
            this.classList.add('active');
        });
    });
});