import { useEffect, useRef } from 'react';

// Calls onOutside() whenever the user clicks anywhere outside the element the
// returned ref is attached to. Used to close the ⋮ menus and the filter menu.
// (Replaces the document.body click listeners in the old admin_*.js files.)
function useClickOutside(onOutside) {
    const ref = useRef(null);
    const callbackRef = useRef(onOutside);

    // Always call the latest onOutside without re-adding the listener
    useEffect(() => {
        callbackRef.current = onOutside;
    });

    useEffect(() => {
        function handleClick(event) {
            if (ref.current && !ref.current.contains(event.target)) {
                callbackRef.current();
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return ref;
}

export default useClickOutside;
