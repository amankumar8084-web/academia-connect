import { createContext, useContext, useEffect, useState } from "react";
const AuthContext = createContext({
  user: null,
  session: null,
  role: null,
  loading: true,
  login: () => { },
  signOut: async () => { },
});
export const useAuth = () => useContext(AuthContext);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleStorageChange = () => {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          setUser(u);
          setSession({ access_token: u.token });
          setRole(u.role);
        } catch (e) {
          console.error("Invalid user JSON in localStorage");
        }
      }
    };

    handleStorageChange();
    setLoading(false);

    window.addEventListener("user-updated", handleStorageChange);
    return () => window.removeEventListener("user-updated", handleStorageChange);
  }, []);

  // Call after successful login to update context without page reload
  const login = (userData) => {
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    setSession({ access_token: userData.token });
    setRole(userData.role);
  };

  const signOut = async () => {
    localStorage.removeItem("user");
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, login, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}