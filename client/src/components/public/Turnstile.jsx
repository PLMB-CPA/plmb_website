import { useEffect, useRef } from 'react';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadTurnstile() {
    if (window.turnstile) return Promise.resolve();
    return new Promise((resolve, reject) => {
        let script = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
        if (!script) {
            script = document.createElement('script');
            script.src = SCRIPT_SRC;
            script.async = true;
            document.head.appendChild(script);
        }
        script.addEventListener('load', () => resolve());
        script.addEventListener('error', () => reject(new Error('Turnstile failed to load')));
    });
}

function Turnstile({ siteKey, onToken, resetSignal }) {
    const containerRef = useRef(null);
    const widgetId = useRef(null);

    useEffect(() => {
        let cancelled = false;
        loadTurnstile()
            .then(() => {
                if (cancelled || !containerRef.current) return;
                widgetId.current = window.turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    callback: (token) => onToken(token),
                    'expired-callback': () => onToken(''),
                    'error-callback': () => onToken(''),
                });
            })
            .catch(() => onToken(''));
        return () => {
            cancelled = true;
            if (widgetId.current !== null && window.turnstile) window.turnstile.remove(widgetId.current);
            widgetId.current = null;
        };
    }, [siteKey, onToken]);

    useEffect(() => {
        if (resetSignal && widgetId.current !== null && window.turnstile) {
            window.turnstile.reset(widgetId.current);
        }
    }, [resetSignal]);

    return <div className="inquiry-captcha" ref={containerRef} />;
}

export default Turnstile;
