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
export interface InventorySummary {
    chocolateBarCount: bigint;
    chocolateSlabCount: bigint;
    tinyChocolateCount: bigint;
}
export interface UserProfile {
    name: string;
    createdAt: Time;
}
export enum RewardType {
    chocolateSlab = "chocolateSlab",
    tinyChocolate = "tinyChocolate",
    chocolateBar = "chocolateBar"
}
export enum TimeRange {
    all = "all",
    month = "month",
    week = "week"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addReward(rewardType: RewardType): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    deleteCallerUserData(): Promise<void>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getRewardsForCaller(timeRange: TimeRange): Promise<InventorySummary>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    ping(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}
