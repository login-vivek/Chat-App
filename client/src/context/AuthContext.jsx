import { createContext, useContext, useState } from "react";

// 1. Create the context (like a global variable accessible anywhere)
const AuthContext = createContext();

// 2. Provider — wraps the whole app, holds the user state
export const AuthProvider = ({ children }) => {
  // Try to load user from localStorage so they stay logged in on refresh
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("chatUser");
    return stored ? JSON.parse(stored) : null;
  });

  // Called after successful login or register
  const login = (userData) => {
    localStorage.setItem("chatUser", JSON.stringify(userData)); // persist to localStorage
    setUser(userData);
  };

  // Called when user clicks logout
  const logout = () => {
    localStorage.removeItem("chatUser");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 3. Custom hook — any component calls useAuth() to get user, login, logout
export const useAuth = () => useContext(AuthContext);