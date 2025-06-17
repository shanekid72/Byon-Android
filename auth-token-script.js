// LuluPay Development Authentication Token
// Copy and paste this entire script into your browser console
// when viewing the LuluPay Partner Portal

(function() {
  // Development JWT token with admin privileges
  // Payload: {
  //   "id": "developer",
  //   "partnerId": "developer", 
  //   "email": "developer@lulupay.com",
  //   "isAdmin": true,
  //   "iat": 1698765432,
  //   "exp": 1730301432 (expires in ~1 year)
  // }
  const devToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRldmVsb3BlciIsInBhcnRuZXJJZCI6ImRldmVsb3BlciIsImVtYWlsIjoiZGV2ZWxvcGVyQGx1bHVwYXkuY29tIiwiaXNBZG1pbiI6dHJ1ZSwiaWF0IjoxNjk4NzY1NDMyLCJleHAiOjE3MzAzMDE0MzJ9.qXwvdGdvE2KFhwbM1xTcH9yLH6YX_TYY-UgJJ9wRIY0';
  
  // Store token in localStorage
  localStorage.setItem('auth_token', devToken);
  
  console.log('%c✅ Development authentication token set successfully!', 'color: green; font-weight: bold');
  console.log('%c🔄 Reloading page in 2 seconds...', 'color: blue');
  
  // Reload the page after a short delay
  setTimeout(() => {
    window.location.reload();
  }, 2000);
})(); 