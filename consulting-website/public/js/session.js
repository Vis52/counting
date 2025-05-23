document.addEventListener('DOMContentLoaded', () => {
    const sessionId = getCookie('session_id');
    const pageUrl = window.location.pathname;
    const startTime = Date.now();
    let isActive = true;
    let inactiveTime = 0;
    let lastActivityTime = Date.now();
    
    // Track when user is active
    ['mousemove', 'keypress', 'scroll', 'click'].forEach(eventType => {
        document.addEventListener(eventType, () => {
            if (!isActive) {
                inactiveTime += Date.now() - lastActivityTime;
                isActive = true;
            }
            lastActivityTime = Date.now();
        });
    });
    
    // Check for inactivity (no events for 60 seconds)
    const inactivityCheck = setInterval(() => {
        if (isActive && Date.now() - lastActivityTime > 60000) {
            isActive = false;
        }
    }, 5000);
    
    // Send periodic updates (every 10 seconds)
    const interval = setInterval(() => {
        const currentTime = Date.now();
        const timeSpent = Math.floor((currentTime - startTime) / 1000);
        const activeTime = timeSpent - Math.floor(inactiveTime / 1000);
        
        fetchWithRetry('/track-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                sessionId, 
                pageUrl, 
                timeSpent,
                activeTime
            })
        });
    }, 10000);
    
    // Send final time when leaving
    window.addEventListener('beforeunload', () => {
        clearInterval(interval);
        clearInterval(inactivityCheck);
        const currentTime = Date.now();
        const totalTime = Math.floor((currentTime - startTime) / 1000);
        const activeTime = totalTime - Math.floor(inactiveTime / 1000);
        
        navigator.sendBeacon('/track-exit', JSON.stringify({ 
            sessionId,
            pageUrl,
            timeSpent: totalTime,
            activeTime
        }));
    });
    
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
            const cookieValue = parts.pop().split(';').shift();
            return cookieValue || null; // Handle empty cookie values
        }
        return null; // Return null for non-existent cookies
    }

    async function fetchWithRetry(url, options, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (response.ok) return response;
                console.warn(`Attempt ${i + 1} failed:`, response.statusText);
            } catch (err) {
                console.warn(`Attempt ${i + 1} failed:`, err);
            }
        }
        console.error('All retry attempts failed.');
    }
});