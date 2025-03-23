// Simple debug script to include in HTML
document.addEventListener('DOMContentLoaded', function() {
  // Simple function to show modal problems
  window.debugModal = function() {
    // Add debug outlines
    const style = document.createElement('style');
    style.innerHTML = `
      .modal { 
        outline: 5px solid red !important; 
        z-index: 99999 !important;
      }
      .modal-content { outline: 5px solid blue !important; }
      .login-button { outline: 3px solid green !important; }
    `;
    document.head.appendChild(style);
    
    // Log button and modal presence
    console.log('Login button:', document.querySelector('.login-button'));
    console.log('Modal:', document.querySelector('.modal'));
    
    // Try to manually trigger modal
    const loginBtn = document.querySelector('.login-button');
    if (loginBtn) {
      console.log('Clicking login button programmatically');
      loginBtn.click();
    }
  };
  
  // Add keyboard shortcut (Alt+D) to trigger debugging
  document.addEventListener('keydown', function(e) {
    if (e.altKey && e.key === 'd') {
      console.log('Debug shortcut triggered');
      window.debugModal();
    }
  });
  
  console.log('Debug script loaded. Press Alt+D to debug modal.');
});