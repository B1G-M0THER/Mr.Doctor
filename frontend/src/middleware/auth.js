export function authGuard(to, from, next) {
    const token = localStorage.getItem("token");
    if (token) {
        next(); // Дозволяємо доступ, якщо токен існує
    } else {
        next("/"); // Перенаправляємо на сторінку логіна, якщо токен відсутній
    }
}

export function adminGuard(to, from, next) {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role"); // Перевіряємо роль з localStorage

    if (token && role === "ADMIN") {
        next(); // Дозволяємо доступ для адміністратора
    } else if (token) {
        next("/profile"); // Перенаправляємо на сторінку профілю, якщо користувач не адміністратор
    } else {
        next("/"); // Якщо токен відсутній, перенаправляємо на логін
    }
}
