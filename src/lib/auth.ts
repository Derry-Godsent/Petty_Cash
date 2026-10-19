const USER_ID_KEY = 'petty-cash-user-id';

export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY);
  
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  
  return userId;
}

function generateUserId(): string {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
