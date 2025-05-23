// main.js

// Initialize AOS (already included in HTML, but ensuring it's called)
AOS.init({
    duration: 800,
    easing: 'ease-in-out',
    once: true
});

// Document Ready
$(document).ready(function () {
    // Mobile Menu Toggle
    $('.menu-toggle').click(function () {
        $(this).toggleClass('active');
        $('.nav-links').toggleClass('active');
    });

    // Close mobile menu when clicking a link
    $('.nav-links li a').click(function () {
        $('.menu-toggle').removeClass('active');
        $('.nav-links').removeClass('active');
    });

    // Hero Slider (using Slick Carousel)
    $('.hero-slider').slick({
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 5000,
        dots: true,
        arrows: false,
        fade: true,
        pauseOnHover: false
    });

    // Testimonials Slider
    $('.testimonials-slider').slick({
        slidesToShow: 3,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 4000,
        dots: true,
        arrows: false,
        responsive: [
            {
                breakpoint: 1024,
                settings: {
                    slidesToShow: 2
                }
            },
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 1
                }
            }
        ]
    });

    // Stats Counter Animation
    $('.counter').each(function () {
        var $this = $(this),
            countTo = $this.attr('data-count');

        $({ countNum: $this.text() }).animate(
            {
                countNum: countTo
            },
            {
                duration: 2000,
                easing: 'swing',
                step: function () {
                    $this.text(Math.floor(this.countNum));
                },
                complete: function () {
                    $this.text(this.countNum);
                }
            }
        );
    });

    // Navbar Scroll Effect
    $(window).scroll(function () {
        if ($(this).scrollTop() > 50) {
            $('.navbar').addClass('scrolled');
        } else {
            $('.navbar').removeClass('scrolled');
        }
    });

    // Back to Top Button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').addClass('active');
        } else {
            $('.back-to-top').removeClass('active');
        }
    });

    $('.back-to-top').click(function (e) {
        e.preventDefault();
        $('html, body').animate({ scrollTop: 0 }, 600);
    });

    // Contact Form Submission (Basic Example)
    $('#contactForm').submit(function (e) {
        e.preventDefault();

        var name = $('#name').val();
        var email = $('#email').val();
        var subject = $('#subject').val();
        var message = $('#message').val();

        // Basic validation
        if (name && email && subject && message) {
            // Simulate form submission (replace with actual AJAX call to backend)
            alert('Thank you, ' + name + '! Your message has been sent.');
            $(this)[0].reset(); // Reset form
        } else {
            alert('Please fill in all fields.');
        }
    });

    // Newsletter Form Submission
    $('.newsletter-form').submit(function (e) {
        e.preventDefault();
        var email = $(this).find('input[type="email"]').val();

        if (email) {
            // Simulate newsletter subscription
            alert('Thank you for subscribing!');
            $(this)[0].reset();
        } else {
            alert('Please enter a valid email address.');
        }
    });
});