import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

const JWT_SECRET = process.env.JWT_SECRET || "barmagly-super-admin-secret-key-2024";

export interface SuperAdminRequest extends Request {
    admin?: {
        id: number;
        email: string;
        role: string;
    };
}

export function generateToken(adminId: number, email: string, role: string): string {
    return jwt.sign({ id: adminId, email, role }, JWT_SECRET, { expiresIn: "24h" });
}

export const requireSuperAdmin = async (req: SuperAdminRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized: Missing or invalid token" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };

        const admin = await storage.getSuperAdmin(decoded.id);
        if (!admin || !admin.isActive) {
            return res.status(401).json({ error: "Unauthorized: Admin account disabled or not found" });
        }

        req.admin = {
            id: admin.id,
            email: admin.email,
            role: admin.role || "super_admin"
        };

        next();
    } catch (error) {
        return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
};
