(function () {
    'use strict';
    const hero = document.querySelector('.people-hero');
    if (!hero) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    hero.querySelector('.people-hero-action').addEventListener('click', event => {
        const target = document.getElementById('directory-results');
        if (!target) return;
        event.preventDefault();
        target.focus({ preventScroll: true });
        target.scrollIntoView({ behavior: motion.matches ? 'auto' : 'smooth', block: 'start' });
    });

    const canvas = document.getElementById('people-particles');
    const context = canvas && canvas.getContext('2d');
    if (!context) return;
    const toggle = document.getElementById('people-particles-toggle');
    const mouse = { x: 0, y: 0, active: false, radius: 200 };
    let width = 1, height = 1, particles = [], frame = null, previousTime = null;
    let paused = motion.matches, visible = true;

    function draw() {
        context.fillStyle = 'black';
        context.fillRect(0, 0, width, height);
        for (const particle of particles) {
            context.beginPath();
            context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            context.fillStyle = 'rgba(191,128,255,0.8)';
            context.fill();
        }
        const linkDistance = Math.min(142, Math.sqrt(width * height / 49));
        for (let a = 0; a < particles.length; a++) {
            for (let b = a + 1; b < particles.length; b++) {
                const p = particles[a], q = particles[b];
                const distance = Math.hypot(p.x - q.x, p.y - q.y);
                if (distance >= linkDistance) continue;
                const opacity = Math.max(0, 1 - distance * distance / 20000);
                const nearMouse = mouse.active && Math.hypot(p.x - mouse.x, p.y - mouse.y) < mouse.radius;
                context.strokeStyle = nearMouse ? `rgba(255,255,255,${opacity})` : `rgba(200,150,255,${opacity})`;
                context.lineWidth = 1;
                context.beginPath();
                context.moveTo(p.x, p.y);
                context.lineTo(q.x, q.y);
                context.stroke();
            }
        }
    }
    function animate(time) {
        const step = previousTime === null ? 0 : Math.min((time - previousTime) / 16.67, 2);
        previousTime = time;
        for (const particle of particles) {
            if (mouse.active) {
                let dx = mouse.x - particle.x, dy = mouse.y - particle.y;
                let distance = Math.hypot(dx, dy);
                if (distance < mouse.radius) {
                    // The original divides by zero when the cursor lands on a particle.
                    if (distance < 0.01) { dx = 1; dy = 0; distance = 1; }
                    const force = (mouse.radius - distance) / mouse.radius * 5 * step;
                    particle.x -= dx / distance * force;
                    particle.y -= dy / distance * force;
                }
            }
            particle.x += particle.vx * step;
            particle.y += particle.vy * step;
            if (particle.x < 0 || particle.x > width) {
                particle.vx *= -1;
                particle.x = Math.max(0, Math.min(width, particle.x));
            }
            if (particle.y < 0 || particle.y > height) {
                particle.vy *= -1;
                particle.y = Math.max(0, Math.min(height, particle.y));
            }
        }
        draw();
        frame = requestAnimationFrame(animate);
    }
    function updateToggle() {
        toggle.hidden = false;
        toggle.textContent = paused ? 'Play animation' : 'Pause animation';
        toggle.setAttribute('aria-pressed', String(paused));
    }
    function syncAnimation() {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        previousTime = null;
        if (!paused && !document.hidden && visible && !hero.hidden) frame = requestAnimationFrame(animate);
        else draw();
        updateToggle();
    }
    function resize() {
        width = Math.max(1, hero.clientWidth);
        height = Math.max(1, hero.clientHeight);
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        particles = Array.from({ length: Math.min(180, Math.max(30, Math.ceil(width * height / 9000))) }, () => ({
            x: Math.random() * width, y: Math.random() * height,
            vx: Math.random() * 0.4 - 0.2, vy: Math.random() * 0.4 - 0.2,
            radius: Math.random() * 2 + 1
        }));
        draw();
    }
    hero.addEventListener('pointermove', event => {
        const bounds = hero.getBoundingClientRect();
        mouse.x = event.clientX - bounds.left;
        mouse.y = event.clientY - bounds.top;
        mouse.active = true;
    });
    function releasePointer() { mouse.active = false; }
    hero.addEventListener('pointerleave', releasePointer);
    hero.addEventListener('pointercancel', releasePointer);
    hero.addEventListener('pointerup', event => {
        if (event.pointerType !== 'mouse') releasePointer();
    });
    window.addEventListener('blur', releasePointer);
    toggle.addEventListener('click', () => { paused = !paused; syncAnimation(); });
    motion.addEventListener('change', () => { paused = motion.matches; syncAnimation(); });
    document.addEventListener('visibilitychange', syncAnimation);
    hero.addEventListener('hero-visibility-change', () => { resize(); syncAnimation(); });
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
    else window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        syncAnimation();
    }).observe(hero);
    resize();
    syncAnimation();
})();
