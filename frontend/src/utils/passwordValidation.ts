export function validatePassword(password: string): string {
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password.length > 72) return "Password must be 72 characters or fewer.";
    if (/\s/.test(password)) return "Password cannot contain spaces.";
    if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
    if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
    if (!/\d/.test(password)) return "Password must include at least one number.";
    if (!/[^A-Za-z0-9]/.test(password)) return "Password must include at least one special character.";
    return "";
}

export function getPasswordStrength(password: string): "Weak" | "Medium" | "Strong" | "" {
    if (!password) return "";

    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (!/\s/.test(password)) score++;

    if (score <= 4) return "Weak";
    if (score <= 6) return "Medium";
    return "Strong";
}
