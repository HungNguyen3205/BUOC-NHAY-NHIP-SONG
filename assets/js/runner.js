
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function getScrollProgress() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return clamp(window.scrollY / maxScroll, 0, 1);
}

document.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("runnerVideo");
    const hero = document.getElementById("hero");
    const poster = document.querySelector(".runner-poster");
    const energy = document.querySelector(".runner-energy");

    if (!video || !hero) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
        video.pause();
        video.hidden = true;
        if (poster) {
            poster.classList.add("is-visible");
        }
        return;
    }

    const playVideo = () => {
        video.play().then(() => {
            video.classList.add("is-ready");
            if (poster) {
                poster.classList.add("is-hidden");
            }
        }).catch(() => {
            // Auto-play was prevented or error
            video.classList.add("is-ready"); // We can still try to show it in case controls are needed, but it's muted so should play
            if (poster) {
                poster.classList.add("is-visible");
            }
        });
    };

    if (video.readyState >= 3) {
        playVideo();
    } else {
        video.addEventListener("canplay", playVideo);
    }

    video.addEventListener("error", () => {
        video.hidden = true;
        if (poster) {
            poster.classList.add("is-visible");
        }
    });

    // Scroll animation for subtle parallax
    let isTicking = false;
    window.addEventListener("scroll", () => {
        if (!isTicking) {
            window.requestAnimationFrame(() => {
                const progress = getScrollProgress();
                
                // Subtle zoom for video
                const scale = 1 + (progress * 0.04);
                
                // Subtle translation for energy
                const energyY = progress * 50; 
                const energyX = progress * -20;
                
                if (video.classList.contains("is-ready")) {
                    video.style.transform = `scale(${scale})`;
                }
                
                if (energy) {
                    energy.style.transform = `translate3d(${energyX}px, ${energyY}px, 0)`;
                }
                
                isTicking = false;
            });
            isTicking = true;
        }
    }, { passive: true });
});

