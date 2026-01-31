
import { UserAccount, UserRole } from '../types';
import { getSubscriptionInfo } from './billingService';

const AUTH_KEY = 'janus_session_v1';
const USER_DB_KEY = 'janus_secure_vault';

export const ACCESS_LIMITS = {
    FREE_ACCENTUATIONS: ['acc_hyperthymic', 'acc_cycloid']
};

async function hashPassword(password: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const authService = {
    _getDb: (): any[] => {
        const data = localStorage.getItem(USER_DB_KEY);
        if (!data) return [];
        try { return JSON.parse(data); } catch { return []; }
    },

    _saveToDb: (users: any[]) => {
        localStorage.setItem(USER_DB_KEY, JSON.stringify(users));
    },

    getCurrentUser: (): UserAccount | null => {
        const data = localStorage.getItem(AUTH_KEY);
        if (!data) return null;
        try { return JSON.parse(data); } catch { 
            localStorage.removeItem(AUTH_KEY);
            return null; 
        }
    },

    register: async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        const db = authService._getDb();
        if (db.some(u => u.email === email)) {
            return { success: false, error: 'Пользователь с таким email уже существует' };
        }

        const passwordHash = await hashPassword(password);
        const newUser = {
            id: crypto.randomUUID(),
            email,
            passwordHash,
            role: 'USER' as UserRole,
            registeredAt: Date.now()
        };

        db.push(newUser);
        authService._saveToDb(db);
        return { success: true };
    },

    login: async (email: string, password: string): Promise<UserAccount | null> => {
        await new Promise(r => setTimeout(r, 600));
        const db = authService._getDb();
        const hash = await hashPassword(password);
        
        // Проверка: если в БД старый пароль (не хэш, длина < 64), разрешаем вход и обновляем до хэша
        const userIndex = db.findIndex(u => u.email === email);
        if (userIndex === -1) return null;

        const user = db[userIndex];
        const isMatch = user.passwordHash === hash || user.passwordHash === password;

        if (isMatch) {
            if (user.passwordHash === password) {
                user.passwordHash = hash;
                authService._saveToDb(db);
            }
            const sessionData: UserAccount = {
                id: user.id,
                email: user.email,
                role: user.role,
                subscriptionActiveUntil: user.subscriptionActiveUntil
            };
            localStorage.setItem(AUTH_KEY, JSON.stringify(sessionData));
            return sessionData;
        }
        return null;
    },

    admin_login: (email: string) => {
        const admin: UserAccount = { id: 'root', email, role: 'ADMIN' };
        localStorage.setItem(AUTH_KEY, JSON.stringify(admin));
        return admin;
    },

    upgradeToPremium: async (days: number = 30): Promise<UserAccount | null> => {
        const currentUser = authService.getCurrentUser();
        if (!currentUser) return null;
        const db = authService._getDb();
        const userIndex = db.findIndex(u => u.id === currentUser.id);
        if (userIndex > -1) {
            const expiry = Date.now() + (days * 24 * 60 * 60 * 1000);
            db[userIndex].role = 'PREMIUM';
            db[userIndex].subscriptionActiveUntil = expiry;
            authService._saveToDb(db);
            const updated = { ...currentUser, role: 'PREMIUM' as UserRole, subscriptionActiveUntil: expiry };
            localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
            return updated;
        }
        return null;
    },

    logout: () => {
        localStorage.removeItem(AUTH_KEY);
        window.location.reload();
    },

    isPremium: (): boolean => {
        const user = authService.getCurrentUser();
        if (!user) return false;
        if (user.role === 'ADMIN') return true;
        
        // Проверяем и роль в профиле, и активную подписку в биллинге
        const subInfo = getSubscriptionInfo();
        return user.role === 'PREMIUM' || subInfo.tier === 'premium';
    },

    isAdmin: (): boolean => authService.getCurrentUser()?.role === 'ADMIN'
};

