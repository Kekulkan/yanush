
import React, { useEffect } from 'react';

const SecurityShield: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Block F12
      if (e.key === 'F12') {
        e.preventDefault();
      }
      // Block Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C
      if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) {
        e.preventDefault();
      }
      // Block Ctrl+U (View Source)
      if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
      }
    };

    // Constant console clearing
    const scrubber = setInterval(() => {
      // This is a common trick to discourage console usage
      if (window.console && window.console.clear) {
        // Only clear if not in a designated debug mode (which we don't have)
        // console.clear(); 
      }
    }, 1000);

    // Override console.log to prevent leakage
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    if (process.env.NODE_ENV === 'production') {
        console.log = () => {};
        console.warn = () => {};
        console.info = () => {};
    }

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(scrubber);
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  return <div className="select-none">{children}</div>;
};

export default SecurityShield;

