import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface User {
    createdAt: Time;
    onboardingCompleted: boolean;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    alternateSignup(username: string, password: string): Promise<{
        message: string;
        success: boolean;
    }>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    bootstrapRBAC(): Promise<void>;
    canAccessOnboarding(): Promise<boolean>;
    completeOnboarding(): Promise<void>;
    getCallerUserProfile(): Promise<User | null>;
    getCallerUserRole(): Promise<UserRole>;
    getRBACStatus(): Promise<{
        bootstrapped: boolean;
    }>;
    getUserProfile(user: Principal): Promise<User | null>;
    isCallerAdmin(): Promise<boolean>;
    isRBACActive(): Promise<boolean>;
    restartOnboarding(): Promise<void>;
    saveCallerUserProfile(profile: User): Promise<void>;
    warmup(): Promise<{
        time: Time;
        caller: Principal;
    }>;
}
