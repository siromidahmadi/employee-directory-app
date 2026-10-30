/* Plain-JS motion adaptations of the referenced TextPrism and TypingLoopText.
   Retains The People's copy and typography. No Framer/React runtime is loaded. */
(function () {
    'use strict';
    const hero = document.querySelector('.people-hero');
    const heading = document.getElementById('people-hero-title');
    const description = hero?.querySelector('.people-hero-description');
    if (!heading || !description) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const copy = document.createElement('span');
    copy.className = 'prism-copy';
    copy.setAttribute('aria-hidden', 'true');
    copy.append(...Array.from(heading.childNodes));
    copy.querySelector('span')?.classList.add('prism-accent');
    const accessible = copy.cloneNode(true);
    accessible.querySelectorAll('br').forEach(br => br.replaceWith(document.createTextNode(' ')));
    heading.setAttribute('aria-label', accessible.textContent.replace(/\s+/g, ' ').trim());
    heading.append(copy);
    const walker = document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    const characters = [];
    for (const textNode of textNodes) {
        const fragment = document.createDocumentFragment();
        for (const word of textNode.textContent.split(/(\s+)/)) {
            if (/^\s*$/.test(word)) { fragment.append(document.createTextNode(word)); continue; }
            const wordSpan = document.createElement('span');
            wordSpan.className = 'prism-word';
            for (const letter of Array.from(word)) {
                const span = document.createElement('span');
                span.className = 'prism-char';
                span.textContent = letter;
                wordSpan.append(span);
                characters.push(span);
            }
            fragment.append(wordSpan);
        }
        textNode.replaceWith(fragment);
    }
    const sentence = description.textContent.trim();
    description.classList.add('typing-loop');
    const readable = document.createElement('span');
    readable.className = 'visually-hidden';
    readable.textContent = sentence;
    const reserve = document.createElement('span');
    reserve.className = 'typing-reserve';
    reserve.setAttribute('aria-hidden', 'true');
    reserve.textContent = sentence;
    const visual = document.createElement('span');
    visual.className = 'typing-copy';
    visual.setAttribute('aria-hidden', 'true');
    const typed = document.createElement('span');
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.textContent = '|';
    visual.append(typed, cursor);
    description.replaceChildren(readable, reserve, visual);
    // Magic UI MorphingText's blur/opacity blend, scoped to the three tagline phrases.
    const note = hero.querySelector('.people-hero-note');
    const phrases = ['A face.', 'A story.', 'A new connection.'];
    const morphVisual = document.createElement('span');
    morphVisual.className = 'tagline-morph-visual';
    morphVisual.setAttribute('aria-hidden', 'true');
    const morphFrom = document.createElement('span');
    const morphTo = document.createElement('span');
    morphFrom.textContent = phrases[0];
    morphTo.textContent = phrases[1];
    morphVisual.append(morphFrom, morphTo);
    if (note) {
        const accessibleNote = document.createElement('span');
        accessibleNote.className = 'visually-hidden';
        accessibleNote.textContent = note.textContent;
        note.classList.add('tagline-morph');
        note.replaceChildren(accessibleNote, morphVisual);
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('tagline-filter');
        svg.setAttribute('aria-hidden', 'true');
        svg.innerHTML = '<defs><filter id="people-tagline-threshold"><feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 255 -140"/></filter></defs>';
        note.append(svg);
    }
    function drawMorph() {
        const morphDuration = 2.4, holdDuration = 1.2;
        const cycle = morphDuration + holdDuration;
        const time = elapsed / 1000;
        const index = Math.floor(time / cycle) % phrases.length;
        const fraction = Math.max(0, Math.min(1, (time % cycle - holdDuration) / morphDuration));
        morphFrom.textContent = phrases[index];
        morphTo.textContent = phrases[(index + 1) % phrases.length];
        morphFrom.style.filter = `blur(${fraction === 1 ? 100 : Math.min(8 / (1 - fraction) - 8, 100)}px)`;
        morphTo.style.filter = `blur(${fraction === 0 ? 100 : Math.min(8 / fraction - 8, 100)}px)`;
        morphFrom.style.opacity = String(Math.pow(1 - fraction, .4));
        morphTo.style.opacity = String(Math.pow(fraction, .4));
    }
    const letters = Array.from(sentence);
    let frame = null, last = null, elapsed = 0, visible = true;
    let count = 0, deleting = false, nextLetterAt = 0;
    function clearPrism() { for (const char of characters) { char.style.transform = ''; char.style.textShadow = ''; } }
    function draw(now) {
        frame = null;
        if (motion.matches || !visible || document.hidden) return;
        const dt = last === null ? 0 : Math.min(now - last, 100);
        last = now;
        elapsed += dt;
        // TextPrism's 8-character/second, four-character-wide bouncing sweep.
        const passLength = characters.length + 4;
        const passTime = passLength / 8;
        const t = (elapsed / 1000) % (passTime * 2 + 1);
        const wave = t < passTime ? t * 8 : t < passTime + .5 ? passLength + 100
            : t < passTime * 2 + .5 ? passLength - (t - passTime - .5) * 8 : -100;
        characters.forEach((char, index) => {
            const delta = wave - index;
            const effect = delta >= 0 && delta < 4 ? Math.sin(delta / 4 * Math.PI) : 0;
            const split = effect * 5;
            char.style.transform = effect ? `translateY(${-effect * 3}px) scale(${1 + effect * .04})` : '';
            char.style.textShadow = split > .15
                ? `${-split}px ${split * .3}px ${effect * 1.5}px rgba(0,200,255,.7), ${split}px ${-split * .3}px ${effect * 1.5}px rgba(255,0,128,.7), 0 0 ${10 * effect}px rgba(255,255,255,${effect * .25})` : '';
        });
        drawMorph();
        // TypingLoopText's 70ms typing, 40ms deletion, and 1.5s full-text pause.
        if (elapsed >= nextLetterAt) {
            if (!deleting && count < letters.length) { count++; nextLetterAt = elapsed + 70; }
            else if (!deleting) { deleting = true; nextLetterAt = elapsed + 1500; }
            else if (count > 0) { count--; nextLetterAt = elapsed + 40; }
            else { deleting = false; nextLetterAt = elapsed + 250; }
            typed.textContent = letters.slice(0, count).join('');
        }
        frame = requestAnimationFrame(draw);
    }
    function sync() {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null; last = null;
        hero.dataset.motionPaused = String(motion.matches || !visible || document.hidden);
        cursor.hidden = motion.matches;
        if (motion.matches) {
            clearPrism(); typed.textContent = sentence;
            morphFrom.textContent = phrases.join(' ');
            morphFrom.style.filter = 'none'; morphFrom.style.opacity = '1';
            morphTo.style.opacity = '0';
            return;
        }
        if (visible && !document.hidden) frame = requestAnimationFrame(draw);
    }
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        sync();
    }).observe(hero);
    window.addEventListener('pagehide', () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; });
    window.addEventListener('pageshow', sync);
    sync();
})();
