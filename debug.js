/**
 * Debug utility for troubleshooting React components
 * 
 * This script can be included in the browser console to help
 * debug issues with React components like the modal not showing.
 */

(function() {
  console.log('Debug script loaded');
  
  // Function to find React instances in DOM
  function findReact(dom) {
    const key = Object.keys(dom).find(key => {
      return key.startsWith("__reactFiber$") || 
             key.startsWith("__reactInternalInstance$") ||
             key.startsWith("_reactInternal");
    });
    return key ? dom[key] : null;
  }

  // Function to inject CSS for debugging visibility issues
  function injectDebugStyles() {
    const style = document.createElement('style');
    style.id = 'debug-styles';
    style.innerHTML = `
      /* Highlight modal overlay */
      .modal {
        outline: 5px solid red !important;
      }
      
      /* Highlight modal content */
      .modal-content {
        outline: 5px solid blue !important;
      }
      
      /* Make sure the modal is really on top */
      .modal {
        z-index: 99999 !important;
      }
    `;
    document.head.appendChild(style);
    console.log('Debug styles injected');
  }
  
  // Function to inspect modal state
  function checkModalState() {
    const loginButtonEl = document.querySelector('.login-button');
    const modalEl = document.querySelector('.modal');
    
    console.log('Login button found:', !!loginButtonEl);
    console.log('Modal element found:', !!modalEl);
    
    if (modalEl) {
      console.log('Modal style:', {
        display: window.getComputedStyle(modalEl).display,
        zIndex: window.getComputedStyle(modalEl).zIndex,
        position: window.getComputedStyle(modalEl).position
      });
    }
    
    // Try to find React component instance
    if (loginButtonEl) {
      const reactInstance = findReact(loginButtonEl);
      console.log('React instance for login button:', reactInstance);
    }
  }
  
  // Add all debugging functions to global window object
  window.hnDebug = {
    injectDebugStyles,
    checkModalState,
    findReact,
    toggleModal: function() {
      const userContext = window.__USER_CONTEXT__;
      if (userContext && userContext.openModal) {
        console.log('Toggling modal from debug script');
        userContext.openModal();
      } else {
        console.error('User context not found or missing openModal function');
      }
    }
  };
  
  // Expose userContext for debugging
  const originalRender = React.createElement;
  React.createElement = function() {
    const element = originalRender.apply(this, arguments);
    if (element && element.type && element.type.name === 'UserProvider') {
      const originalRender = element.type;
      element.type = function(props) {
        const result = originalRender(props);
        window.__USER_CONTEXT__ = result.props.value;
        return result;
      };
    }
    return element;
  };
  
  console.log('Debug utilities ready. Call window.hnDebug.checkModalState() to check modal state');
})();