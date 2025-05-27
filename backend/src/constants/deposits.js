const Deposits = {
    waiting_approval: "waiting_approval", // Очікує на схвалення адміністратором
    active: "active",                   // Активний, кошти зараховані
    rejected: "rejected",                 // Відхилено адміністратором
    closed_early: "closed_early", // Закрито достроково клієнтом
    closed_by_term: "closed_by_term",     // Закрито по завершенню терміну
}

export default Deposits;