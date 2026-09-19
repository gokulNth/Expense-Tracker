// ============================================================
// CONFIG
// ============================================================

// LOCAL DEVELOPMENT
const API_BASE_URL = "http://127.0.0.1:8000";

// AFTER DEPLOYING BACKEND:
// const API_BASE_URL = "https://your-backend.onrender.com";


const BUDGET_PERCENTAGE = 0.80;

let expenses = [];
let monthlyIncome = 0;

let expenseChart = null;


// ============================================================
// API
// ============================================================

async function apiRequest(endpoint, options = {}) {

    const response = await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            },
            ...options
        }
    );

    let data;

    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {

        throw new Error(
            data.detail || "API request failed"
        );
    }

    return data;
}


// ============================================================
// INIT
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        setupDarkMode();

        await loadIncome();

        await loadExpenses();

        await updateAuthUI();

        setupCashDetection();

    }
);


// ============================================================
// LOAD INCOME
// ============================================================

async function loadIncome() {

    try {

        const data =
            await apiRequest("/api/income");

        monthlyIncome =
            Number(data.amount || 0);

        renderDashboard();

    } catch (error) {

        console.error(error);

        showError(
            "Unable to load monthly income."
        );
    }
}


// ============================================================
// LOAD EXPENSES
// ============================================================

async function loadExpenses() {

    try {

        const data =
            await apiRequest("/api/expenses");

        expenses =
            data.expenses || [];

        render();

    } catch (error) {

        console.error(error);

        showError(
            "Unable to load expenses."
        );
    }
}


// ============================================================
// RENDER EVERYTHING
// ============================================================

function render() {

    renderDashboard();

    renderExpenses();

    renderChart();

    updateNavIncome();

}


// ============================================================
// DASHBOARD
// ============================================================

function renderDashboard() {

    const budget =
        monthlyIncome * BUDGET_PERCENTAGE;

    const spent =
        expenses.reduce(
            (sum, expense) =>
                sum + Number(expense.amount),
            0
        );

    const remaining =
        budget - spent;


    document.getElementById(
        "incomeValue"
    ).textContent =
        formatCurrency(monthlyIncome);


    document.getElementById(
        "budgetValue"
    ).textContent =
        formatCurrency(budget);


    document.getElementById(
        "spentValue"
    ).textContent =
        formatCurrency(spent);


    document.getElementById(
        "remainingValue"
    ).textContent =
        formatCurrency(
            Math.max(remaining, 0)
        );


    const percentage =
        budget > 0
            ? Math.round(
                (spent / budget) * 100
            )
            : 0;


    document.getElementById(
        "budgetPercentage"
    ).textContent =
        `${percentage}%`;


    document.getElementById(
        "budgetText"
    ).textContent =
        budget > 0
            ? `${formatCurrency(spent)} spent of ${formatCurrency(budget)}`
            : "Set your monthly income";


    document.getElementById(
        "budgetProgress"
    ).style.width =
        `${Math.min(percentage, 100)}%`;

}


// ============================================================
// NAV INCOME
// ============================================================

function updateNavIncome() {

    const element =
        document.getElementById(
            "navIncome"
        );

    if (monthlyIncome > 0) {

        element.textContent =
            formatCurrency(monthlyIncome);

    } else {

        element.textContent =
            "Not Set";
    }
}


// ============================================================
// INCOME MODAL
// ============================================================

function openIncomeModal() {

    document
        .getElementById("incomeModal")
        .classList.remove("hidden");


    document
        .getElementById("incomeInput")
        .value =
        monthlyIncome || "";
}


function closeIncomeModal() {

    document
        .getElementById("incomeModal")
        .classList.add("hidden");
}


async function saveMonthlyIncome() {

    const amount =
        Number(
            document
                .getElementById("incomeInput")
                .value
        );


    if (!amount || amount <= 0) {

        alert(
            "Please enter a valid income."
        );

        return;
    }


    try {

        await apiRequest(
            "/api/income",
            {
                method: "POST",

                body: JSON.stringify({
                    amount
                })
            }
        );


        monthlyIncome = amount;

        closeIncomeModal();

        render();

    } catch (error) {

        alert(error.message);

    }
}


// ============================================================
// CATEGORY
// ============================================================

function selectCategory(category) {

    document
        .getElementById("category")
        .value = category;

}


// ============================================================
// ADD EXPENSE
// ============================================================

async function addExpense() {

    const amount =
        Number(
            document
                .getElementById("amount")
                .value
        );


    const description =
        document
            .getElementById("description")
            .value
            .trim();


    const category =
        document
            .getElementById("category")
            .value;


    const cashPurpose =
        document
            .getElementById("cashPurpose")
            .value
            .trim();


    if (!amount || amount <= 0) {

        alert(
            "Please enter a valid amount."
        );

        return;
    }


    if (!description) {

        alert(
            "Please enter what you spent on."
        );

        return;
    }


    try {

        await apiRequest(
            "/api/expenses",
            {
                method: "POST",

                body: JSON.stringify({

                    amount,

                    description,

                    category,

                    cash_purpose: cashPurpose

                })
            }
        );


        document
            .getElementById("amount")
            .value = "";


        document
            .getElementById("description")
            .value = "";


        document
            .getElementById("cashPurpose")
            .value = "";


        await loadExpenses();

        alert("Expense added successfully.");

    } catch (error) {

        alert(error.message);

    }
}


// ============================================================
// CASH DETECTION
// ============================================================

function setupCashDetection() {

    const description =
        document.getElementById(
            "description"
        );


    description.addEventListener(
        "input",
        () => {

            const value =
                description
                    .value
                    .toLowerCase();


            const isCash =
                value.includes("cash") ||
                value.includes("atm") ||
                value.includes("withdraw") ||
                value.includes("withdrawal");


            document
                .getElementById(
                    "cashPurposeContainer"
                )
                .classList.toggle(
                    "hidden",
                    !isCash
                );

        }
    );

}


// ============================================================
// RENDER EXPENSES
// ============================================================

function renderExpenses() {

    const list =
        document.getElementById(
            "expenseList"
        );


    const search =
        document
            .getElementById(
                "searchInput"
            )
            .value
            .toLowerCase()
            .trim();


    const filtered =
        expenses.filter(
            expense => {

                return (

                    expense.description
                        .toLowerCase()
                        .includes(search)

                    ||

                    expense.category
                        .toLowerCase()
                        .includes(search)

                    ||

                    String(expense.amount)
                        .includes(search)

                );

            }
        );


    document.getElementById(
        "expenseCount"
    ).textContent =
        `${filtered.length} expenses`;


    if (!filtered.length) {

        list.innerHTML = `
            <div style="padding:30px;text-align:center;">
                No expenses found.
            </div>
        `;

        return;
    }


    list.innerHTML =
        filtered
            .map(
                expense => {

                    const icon =
                        getCategoryIcon(
                            expense.category
                        );


                    const date =
                        new Date(
                            expense.date
                        ).toLocaleDateString(
                            "en-IN"
                        );


                    return `

                    <div class="expense-item">

                        <div class="expense-left">

                            <span class="category-icon">
                                ${icon}
                            </span>

                            <div>

                                <div class="expense-description">
                                    ${escapeHTML(
                                        expense.description
                                    )}
                                </div>

                                <div class="expense-meta">
                                    ${escapeHTML(
                                        expense.category
                                    )}
                                    ·
                                    ${date}
                                </div>

                            </div>

                        </div>

                        <div>

                            <span class="expense-amount">
                                ${formatCurrency(
                                    expense.amount
                                )}
                            </span>

                            <button
                                class="delete-btn"
                                onclick="deleteExpense(${expense.id})"
                            >
                                🗑
                            </button>

                        </div>

                    </div>

                    `;

                }
            )
            .join("");

}


// ============================================================
// DELETE
// ============================================================

async function deleteExpense(id) {

    if (
        !confirm(
            "Delete this expense?"
        )
    ) {
        return;
    }


    try {

        await apiRequest(
            `/api/expenses/${id}`,
            {
                method: "DELETE"
            }
        );


        await loadExpenses();

    } catch (error) {

        alert(error.message);

    }
}


// ============================================================
// CHART
// ============================================================

function renderChart() {

    const canvas =
        document.getElementById(
            "expenseChart"
        );


    if (!canvas) {
        return;
    }


    const totals = {};


    expenses.forEach(
        expense => {

            const category =
                expense.category ||
                "Other";


            totals[category] =
                (
                    totals[category] || 0
                ) +
                Number(expense.amount);

        }
    );


    if (expenseChart) {

        expenseChart.destroy();

    }


    expenseChart =
        new Chart(
            canvas,
            {
                type: "doughnut",

                data: {

                    labels:
                        Object.keys(totals),

                    datasets: [
                        {
                            data:
                                Object.values(
                                    totals
                                )
                        }
                    ]

                },

                options: {

                    responsive: true,

                    plugins: {

                        legend: {
                            position: "bottom"
                        }

                    }

                }

            }
        );

}


// ============================================================
// AI INSIGHT
// ============================================================

async function generateAIInsight() {

    const insight =
        document.getElementById(
            "aiInsight"
        );


    if (!expenses.length) {

        insight.textContent =
            "Add expenses first.";

        return;
    }


    insight.textContent =
        "Analyzing your spending...";


    try {

        const budget =
            monthlyIncome *
            BUDGET_PERCENTAGE;


        const spent =
            expenses.reduce(
                (sum, expense) =>
                    sum +
                    Number(expense.amount),
                0
            );


        const categoryTotals = {};


        expenses.forEach(
            expense => {

                categoryTotals[
                    expense.category
                ] =
                    (
                        categoryTotals[
                            expense.category
                        ] || 0
                    ) +
                    Number(
                        expense.amount
                    );

            }
        );


        const prompt = `
You are a personal finance assistant.

Monthly income:
₹${monthlyIncome}

Spending budget:
₹${budget}

Total spent:
₹${spent}

Category breakdown:
${JSON.stringify(
    categoryTotals,
    null,
    2
)}

Give a short practical analysis.

Mention:
1. Largest spending category
2. Whether spending is within budget
3. One unusual observation
4. One practical suggestion

Do not give investment advice.
`;


        const response =
            await puter.ai.chat(
                prompt
            );


        insight.textContent =
            extractAIText(response);

    } catch (error) {

        console.error(error);

        insight.textContent =
            generateLocalInsight();

    }

}


// ============================================================
// LOCAL AI FALLBACK
// ============================================================

function generateLocalInsight() {

    const budget =
        monthlyIncome *
        BUDGET_PERCENTAGE;


    const spent =
        expenses.reduce(
            (sum, expense) =>
                sum +
                Number(expense.amount),
            0
        );


    const totals = {};


    expenses.forEach(
        expense => {

            totals[
                expense.category
            ] =
                (
                    totals[
                        expense.category
                    ] || 0
                ) +
                Number(
                    expense.amount
                );

        }
    );


    const largestCategory =
        Object.entries(totals)
            .sort(
                (a, b) =>
                    b[1] - a[1]
            )[0];


    if (!largestCategory) {

        return "Not enough data yet.";

    }


    return `
Your largest spending category is
${largestCategory[0]} at
${formatCurrency(largestCategory[1])}.

You have spent
${formatCurrency(spent)}
against a budget of
${formatCurrency(budget)}.

${spent > budget
    ? "You have crossed your planned spending budget."
    : "Your spending is currently within your planned budget."
}
`;

}


// ============================================================
// CSV DOWNLOAD
// ============================================================

async function downloadMonthlyCSV() {

    try {

        const now =
            new Date();


        const year =
            now.getFullYear();


        const month =
            now.getMonth() + 1;


        const url =
            `${API_BASE_URL}/api/reports/${year}/${month}`;


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Unable to download CSV"
            );

        }


        const blob =
            await response.blob();


        const downloadUrl =
            window.URL.createObjectURL(
                blob
            );


        const link =
            document.createElement(
                "a"
            );


        link.href =
            downloadUrl;


        link.download =
            `${year}${now.toLocaleString(
                "en-US",
                { month: "short" }
            )}.csv`;


        link.click();


        window.URL.revokeObjectURL(
            downloadUrl
        );

    } catch (error) {

        alert(error.message);

    }

}


// ============================================================
// PUTER AUTH
// ============================================================

async function updateAuthUI() {

    try {

        const isSignedIn =
            await puter.auth.isSignedIn();


        const loginBtn =
            document.getElementById(
                "loginBtn"
            );


        const userBtn =
            document.getElementById(
                "userBtn"
            );


        if (isSignedIn) {

            loginBtn.classList.add(
                "hidden"
            );

            userBtn.classList.remove(
                "hidden"
            );


            const user =
                await puter.auth.getUser();


            document.getElementById(
                "username"
            ).textContent =
                user?.username ||
                user?.email ||
                "Puter User";

        } else {

            loginBtn.classList.remove(
                "hidden"
            );

            userBtn.classList.add(
                "hidden"
            );

        }

    } catch (error) {

        console.error(
            "Puter auth error:",
            error
        );

    }

}


async function loginWithPuter() {

    try {

        await puter.auth.signIn();

        await updateAuthUI();

    } catch (error) {

        console.error(error);

        alert(
            "Puter login failed."
        );

    }

}


async function logoutFromPuter() {

    try {

        await puter.auth.signOut();

        document
            .getElementById(
                "userDropdown"
            )
            .classList.add(
                "hidden"
            );


        await updateAuthUI();

    } catch (error) {

        console.error(error);

    }

}


function toggleUserMenu() {

    document
        .getElementById(
            "userDropdown"
        )
        .classList.toggle(
            "hidden"
        );

}


// ============================================================
// DARK MODE
// ============================================================

function setupDarkMode() {

    const dark =
        localStorage.getItem(
            "darkMode"
        ) === "true";


    if (dark) {

        document.body.classList.add(
            "dark"
        );

    }

}


function toggleDarkMode() {

    document.body.classList.toggle(
        "dark"
    );


    localStorage.setItem(
        "darkMode",
        document.body.classList.contains(
            "dark"
        )
    );

}


// ============================================================
// HELPERS
// ============================================================

function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(value || 0);

}


function getCategoryIcon(category) {

    const icons = {

        Food: "🍔",

        Travel: "🚗",

        Shopping: "🛍",

        Bills: "📄",

        Entertainment: "🎬",

        Health: "💊",

        Other: "📦"

    };


    return icons[category] ||
        icons.Other;

}


function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


function extractAIText(response) {

    if (
        typeof response ===
        "string"
    ) {
        return response;
    }


    if (
        response?.message?.content
    ) {

        return response.message.content;

    }


    if (
        response?.content
    ) {

        return response.content;

    }


    return JSON.stringify(
        response
    );

}


function showError(message) {

    console.error(message);

}