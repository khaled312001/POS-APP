import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Employee {
  id: number;
  name: string;
  role: string;
  branchId: number | null;
  permissions: string[];
}

interface AuthContextValue {
  employee: Employee | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isCashier: boolean;
  canManage: boolean;
  canAccessReports: boolean;
  canManageProducts: boolean;
  canManageEmployees: boolean;
  canManageSettings: boolean;
  canDeleteCustomers: boolean;
  login: (employee: Employee) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [employee, setEmployee] = useState<Employee | null>(null);

  useEffect(() => {
    AsyncStorage.getItem("barmagly_employee").then((data) => {
      if (data) setEmployee(JSON.parse(data));
    });
  }, []);

  const login = (emp: Employee) => {
    setEmployee(emp);
    AsyncStorage.setItem("barmagly_employee", JSON.stringify(emp));
  };

  const logout = () => {
    setEmployee(null);
    AsyncStorage.removeItem("barmagly_employee");
  };

  const role = employee?.role || "";
  const isAdmin = role === "admin" || role === "owner";
  const isManager = role === "manager";
  const isCashier = role === "cashier";
  const canManage = isAdmin || isManager;
  const canAccessReports = isAdmin || isManager;
  const canManageProducts = isAdmin || isManager;
  const canManageEmployees = isAdmin;
  const canManageSettings = isAdmin;
  const canDeleteCustomers = isAdmin || isManager;

  const value = useMemo(
    () => ({ employee, isLoggedIn: !!employee, isAdmin, isManager, isCashier, canManage, canAccessReports, canManageProducts, canManageEmployees, canManageSettings, canDeleteCustomers, login, logout }),
    [employee]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
