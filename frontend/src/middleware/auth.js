export function authGuard(to, from, next) {
    const token = localStorage.getItem("token");
    if (token) {
        next();
    } else {
        next("/");
    }
}

export function adminGuard(to, from, next) {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role === "ADMIN") {
        next();
    } else if (token) {
        next("/profile");
    } else {
        next("/");
    }
}
