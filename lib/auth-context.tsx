import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EMPLOYEE_TOKEN_STORAGE_KEY,
  setCachedEmployeeToken,
  clearCachedEmployeeToken,
} from "./query-client";

interface Employee {
  id: number;
  name: string;
  role: string;
  branchId: number | null;
  permissions: string[];
  /** Issued by POST /api/employees/login — proves role to the server. */
  token?: string;
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
      if (!data) return;
      const stored: Employee = JSON.parse(data);
      setEmployee(stored);
      // Warm the request cache so the very first API call after a cold start
      // already carries the employee token.
      if (stored.token) setCachedEmployeeToken(stored.token);
    });
  }, []);

  const login = (emp: Employee) => {
    setEmployee(emp);
    AsyncStorage.setItem("barmagly_employee", JSON.stringify(emp));
    if (emp.token) {
      setCachedEmployeeToken(emp.token);
      AsyncStorage.setItem(EMPLOYEE_TOKEN_STORAGE_KEY, emp.token);
    }
  };

  const logout = () => {
    setEmployee(null);
    clearCachedEmployeeToken();
    AsyncStorage.removeItem("barmagly_employee");
    AsyncStorage.removeItem(EMPLOYEE_TOKEN_STORAGE_KEY);
  };

  const role = employee?.role || "";
  const perms = employee?.permissions || [];
  const isAdmin = role === "admin" || role === "owner";
  const isManager = role === "manager";
  const isCashier = role === "cashier";
  const canManage = isAdmin || isManager || perms.includes("manage");
  const canAccessReports = isAdmin || isManager || perms.includes("reports");
  const canManageProducts = isAdmin || isManager || perms.includes("products");
  const canManageEmployees = isAdmin || perms.includes("employees");
  const canManageSettings = isAdmin || perms.includes("settings");
  const canDeleteCustomers = isAdmin || isManager || perms.includes("deleteCustomers");

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
