const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const inverseLerp = (value, min, max) => clamp((value - min) / (max - min), 0, 1);

function getIntroProgress(section) {
    const rect = section.getBoundingClientRect();
    const scrollable = Math.max(section.offsetHeight - window.innerHeight, 1);
    return clamp(-rect.top / scrollable, 0, 1);
}

document.addEventListener("DOMContentLoaded", () => {
    const introSection = document.getElementById("introVideo");
    const video = document.getElementById("introRunnerVideo");
    const brand = document.querySelector(".intro-brand");
    const overlay = document.querySelector(".intro-video-overlay");
    const skipBtn = document.getElementById("introSkipButton");
    const scrollIndicator = document.querySelector(".intro-scroll");
    
    if (!introSection || !video) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Handle skip
    if (skipBtn) {
        skipBtn.addEventListener("click", () => {
            const hero = document.getElementById("hero");
            if (hero) {
                hero.scrollIntoView({
                    behavior: reduceMotion ? "auto" : "smooth",
                    block: "start"
                });
            }
        });
    }

    // Attempt video playback
    if (!reduceMotion) {
        const playVideo = async () => {
            try {
                await video.play();
                video.hidden = false;
            } catch (error) {
                console.warn("Không thể tự động phát video intro:", error);
                video.hidden = true;
            }
        };

        if (video.readyState >= 3) {
            playVideo();
        } else {
            video.addEventListener("canplay", playVideo);
        }

        video.addEventListener("error", () => {
            console.error("Lỗi tải video intro.");
            video.hidden = true;
        });
    } else {
        video.pause();
        video.hidden = true;
    }

    // Scroll Logic
    let isTicking = false;

    window.addEventListener("scroll", () => {
        if (!isTicking) {
            window.requestAnimationFrame(() => {
                const progress = getIntroProgress(introSection);
                
                if (reduceMotion) {
                    if (progress > 0.1) {
                        document.body.classList.remove("is-intro-active");
                        document.body.classList.add("is-intro-complete");
                    } else {
                        document.body.classList.add("is-intro-active");
                        document.body.classList.remove("is-intro-complete");
                    }
                    isTicking = false;
                    return;
                }

                // Video scale: 1 -> 0.94
                const scale = 1 - (progress * 0.06);
                
                // Video opacity: 1 up to 0.65, then down to 0
                const videoOpacityProgress = inverseLerp(progress, 0.65, 1);
                const videoOpacity = 1 - videoOpacityProgress;

                // Brand opacity: 1 down to 0 between 0.25 and 0.65
                const brandOpacityProgress = inverseLerp(progress, 0.25, 0.65);
                const brandOpacity = 1 - brandOpacityProgress;

                // Brand translateY: -50% to -65%
                const brandY = -50 - (progress * 15);

                // Video border-radius: 0 to 28px near end
                const borderRadiusProgress = inverseLerp(progress, 0.5, 1);
                const borderRadius = borderRadiusProgress * 28;

                // Scroll indicator opacity
                const scrollIndicatorOpacity = 1 - inverseLerp(progress, 0, 0.1);

                if (video) {
                    video.style.transform = `scale(${scale})`;
                    video.style.opacity = videoOpacity;
                    video.style.borderRadius = `${borderRadius}px`;
                }

                if (brand) {
                    brand.style.transform = `translateY(${brandY}%)`;
                    brand.style.opacity = brandOpacity;
                }

                if (scrollIndicator) {
                    scrollIndicator.style.opacity = scrollIndicatorOpacity;
                    scrollIndicator.style.pointerEvents = scrollIndicatorOpacity === 0 ? "none" : "auto";
                }

                // Toggle header visibility classes
                if (progress >= 0.95) {
                    document.body.classList.remove("is-intro-active");
                    document.body.classList.add("is-intro-complete");
                } else {
                    document.body.classList.add("is-intro-active");
                    document.body.classList.remove("is-intro-complete");
                    
                    // If we scroll back up, ensure it plays if possible
                    if (progress < 0.1 && video.paused && !reduceMotion) {
                        video.play().catch(() => {});
                    }
                }

                isTicking = false;
            });
            isTicking = true;
        }
    }, { passive: true });
    
    // Initial call to set initial states
    window.dispatchEvent(new Event('scroll'));
});
