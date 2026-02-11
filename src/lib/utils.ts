import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function extractErrorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
        return "Rate limit exceeded. Please try again later.";
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Unknown error";
}