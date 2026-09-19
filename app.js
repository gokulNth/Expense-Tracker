/* =====================================================
   AI EXPENSE TRACKER V2.1
   ===================================================== */


/* ================= CONFIG ================= */

const BUDGET_PERCENTAGE = 0.80;


/* ================= DATA ================= */

let expenses =
    JSON.parse(localStorage.getItem("expenses")) || [];

let monthlyIncome =
    Number(localStorage.getItem("monthlyIncome")) || 0;

let expenseChart = null;


/* ================= CATEGORY ICONS ================= */

const categoryIcons = {

    Food: "🍔",
    Travel: "🚗",
    Shopping: "🛍️",
    Bills: "💡",
    Entertainment: "🎬",
    Health: "💊",
    Education: "📚",
    Home: "🏠",
    Other: "📦"

};


/* ================= INITIALIZE ================= */

document.addEventListener("DOMContentLoaded", () => {

    render();

    updateAuthUI();

    setupDarkMode();

    document
        .getElementById("monthlyIncomeInput")
        .addEventListener("input", updateIncomePreview);

});


/* =====================================================
   PUTER AUTHENTICATION
   ===================================================== */

async function updateAuthUI() {

    try {

        const isSignedIn = await puter.auth.isSignedIn();

        const loginBtn =
            document.getElementById("loginBtn");

        const userBtn =
            document.getElementById("userBtn");

        if (isSignedIn) {

            loginBtn.classList.add("hidden");

            userBtn.classList.remove("hidden");

            try {

                const user =
                    await puter.auth.getUser();

                document.getElementById("username")
                    .textContent =
                    user?.username ||
                    user?.email ||
                    "Puter User";

            } catch (error) {

                document.getElementById("username")
                    .textContent = "Puter User";

            }

        } else {

            loginBtn.classList.remove("hidden");

            userBtn.classList.add("hidden");

        }

    } catch (error) {

        console.error(
            "Unable to check Puter login:",
            error
        );

    }

}


/* Login */

async function loginWithPuter() {

    try {

        await puter.auth.signIn();

        await updateAuthUI();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to login with Puter."
        );

    }

}


/* Logout */

async function logoutFromPuter() {

    try {

        await puter.auth.signOut();

        document
            .getElementById("userDropdown")
            .classList.add("hidden");

        await updateAuthUI();

    } catch (error) {

        console.error(error);

        alert(
            "Unable to logout from Puter."
        );

    }

}


/* User menu */

function toggleUserMenu() {

    document
        .getElementById("userDropdown")
        .classList.toggle("hidden");

}


/* Close user menu if clicking elsewhere */

document.addEventListener("click", (event) => {

    const userMenu =
        document.querySelector(".user-menu");

    if (
        userMenu &&
        !userMenu.contains(event.target)
    ) {

        document
            .getElementById("userDropdown")
            .classList.add("hidden");

    }

});


/* =====================================================
   MONTHLY INCOME
   ===================================================== */

function openIncomeModal() {

    document
        .getElementById("monthlyIncomeInput")
        .value = monthlyIncome || "";

    updateIncomePreview();

    document
        .getElementById("incomeModal")
        .classList.remove("hidden");

}


function closeIncomeModal() {

    document
        .getElementById("incomeModal")
        .classList.add("hidden");

}


function updateIncomePreview() {

    const income =
        Number(
            document.getElementById(
                "monthlyIncomeInput"
            ).value
        ) || 0;

    const budget =
        income * BUDGET_PERCENTAGE;

    const savings =
        income - budget;

    document.getElementById("modalBudget")
        .textContent = formatCurrency(budget);

    document.getElementById("modalSavings")
        .textContent = formatCurrency(savings);

}


function saveMonthlyIncome() {

    const input =
        document.getElementById(
            "monthlyIncomeInput"
        );

    const income =
        Number(input.value);

    if (!income || income < 0) {

        alert(
            "Please enter a valid monthly income."
        );

        return;

    }

    monthlyIncome = income;

    localStorage.setItem(
        "monthlyIncome",
        monthlyIncome
    );

    closeIncomeModal();

    render();

}


/* =====================================================
   EXPENSE
   ===================================================== */

function selectCategory(category) {

    document
        .getElementById("expenseCategory")
        .value = category;

}


/* Add expense */

async function addExpense() {

    const amount =
        Number(
            document.getElementById(
                "expenseAmount"
            ).value
        );

    const description =
        document.getElementById(
            "expenseDescription"
        ).value.trim();

    let category =
        document.getElementById(
            "expenseCategory"
        ).value;


    if (!amount || amount <= 0) {

        alert(
            "Please enter a valid amount."
        );

        return;

    }


    if (!description) {

        alert(
            "Please enter an expense description."
        );

        return;

    }


    /* AI category */

    if (category === "Auto") {

        category =
            await categorizeExpense(
                description
            );

    }


    /* Cash withdrawal */

    const cashKeywords = [
        "cash",
        "atm",
        "withdraw",
        "withdrawal"
    ];

    const isCashWithdrawal =
        cashKeywords.some(
            keyword =>
                description
                    .toLowerCase()
                    .includes(keyword)
        );


    let cashPurpose = "";


    if (isCashWithdrawal) {

        cashPurpose =
            prompt(
                "You withdrew cash. What was it used for?"
            ) || "";

    }


    const expense = {

        id: Date.now(),

        amount,

        description,

        category,

        cashPurpose,

        date:
            new Date().toISOString()

    };


    expenses.unshift(expense);


    localStorage.setItem(
        "expenses",
        JSON.stringify(expenses)
    );


    /* Clear inputs */

    document.getElementById(
        "expenseAmount"
    ).value = "";

    document.getElementById(
        "expenseDescription"
    ).value = "";

    document.getElementById(
        "expenseCategory"
    ).value = "Auto";


    render();

}


/* =====================================================
   AI CATEGORY
   ===================================================== */

async function categorizeExpense(description) {

    try {

        if (
            typeof puter === "undefined" ||
            !puter.ai
        ) {

            return fallbackCategory(
                description
            );

        }


        const promptText = `
Categorize this expense into exactly one category.

Allowed categories:
Food
Travel
Shopping
Bills
Entertainment
Health
Education
Home
Other

Expense:
"${description}"

Return ONLY the category name.
        `;


        const response =
            await puter.ai.chat(
                promptText
            );


        let result =
            response?.message?.content ||
            response?.text ||
            "";


        result =
            result.trim();


        const categories = [
            "Food",
            "Travel",
            "Shopping",
            "Bills",
            "Entertainment",
            "Health",
            "Education",
            "Home",
            "Other"
        ];


        const matched =
            categories.find(
                category =>
                    result
                        .toLowerCase()
                        .includes(
                            category.toLowerCase()
                        )
            );


        return matched || "Other";


    } catch (error) {

        console.error(
            "AI categorization failed:",
            error
        );

        return fallbackCategory(
            description
        );

    }

}


/* Simple fallback */

function fallbackCategory(description) {

    const text =
        description.toLowerCase();


    if (
        text.includes("food") ||
        text.includes("restaurant") ||
        text.includes("hotel") ||
        text.includes("lunch") ||
        text.includes("dinner") ||
        text.includes("tea")
    ) {

        return "Food";

    }


    if (
        text.includes("petrol") ||
        text.includes("fuel") ||
        text.includes("uber") ||
        text.includes("ola") ||
        text.includes("bus") ||
        text.includes("train")
    ) {

        return "Travel";

    }


    if (
        text.includes("amazon") ||
        text.includes("shopping") ||
        text.includes("clothes")
    ) {

        return "Shopping";

    }


    if (
        text.includes("electricity") ||
        text.includes("rent") ||
        text.includes("bill") ||
        text.includes("recharge")
    ) {

        return "Bills";

    }


    return "Other";

}


/* =====================================================
   RENDER
   ===================================================== */

function render() {

    renderDashboard();

    renderExpenses();

    renderChart();

    updateNavIncome();

}


/* Dashboard */

function renderDashboard() {

    const totalSpent =
        expenses.reduce(
            (sum, expense) =>
                sum + Number(expense.amount),
            0
        );


    const budget =
        monthlyIncome *
        BUDGET_PERCENTAGE;


    const remaining =
        budget - totalSpent;


    document.getElementById(
        "totalIncome"
    ).textContent =
        formatCurrency(monthlyIncome);


    document.getElementById(
        "budget"
    ).textContent =
        formatCurrency(budget);


    document.getElementById(
        "totalSpent"
    ).textContent =
        formatCurrency(totalSpent);


    document.getElementById(
        "remaining"
    ).textContent =
        formatCurrency(
            Math.max(remaining, 0)
        );


    const percentage =
        budget > 0
            ? (totalSpent / budget) * 100
            : 0;


    const displayPercentage =
        Math.round(
            Math.min(percentage, 100)
        );


    document.getElementById(
        "budgetProgress"
    ).style.width =
        `${displayPercentage}%`;


    document.getElementById(
        "budgetPercentage"
    ).textContent =
        `${Math.round(percentage)}%`;


    if (!monthlyIncome) {

        document.getElementById(
            "budgetText"
        ).textContent =
            "Set your monthly income to calculate your budget.";

    } else {

        document.getElementById(
            "budgetText"
        ).textContent =
            `You can spend up to ${formatCurrency(budget)} this month.`;

    }

}


/* Navbar income */

function updateNavIncome() {

    document.getElementById(
        "navIncome"
    ).textContent =
        monthlyIncome
            ? formatCurrency(monthlyIncome)
            : "Not Set";

}


/* =====================================================
   EXPENSE LIST
   ===================================================== */

function renderExpenses() {

    const list =
        document.getElementById(
            "expenseList"
        );


    const search =
        document.getElementById(
            "searchInput"
        ).value
            .toLowerCase()
            .trim();


    const filtered =
        expenses.filter(expense => {

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

        });


    if (!filtered.length) {

        list.innerHTML = `
            <div class="empty-state">
                No expenses found.
            </div>
        `;

        return;

    }


    list.innerHTML =
        filtered.map(expense => {

            const date =
                new Date(
                    expense.date
                );


            const formattedDate =
                date.toLocaleDateString(
                    "en-IN",
                    {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    }
                );


            return `

                <div class="expense-item">

                    <div class="expense-left">

                        <div class="category-icon">
                            ${
                                categoryIcons[
                                    expense.category
                                ] || "📦"
                            }
                        </div>

                        <div>

                            <div class="expense-description">
                                ${escapeHTML(
                                    expense.description
                                )}
                            </div>

                            <div class="expense-meta">

                                ${
                                    expense.category
                                }

                                •
                                ${formattedDate}

                                ${
                                    expense.cashPurpose
                                        ? ` • Cash: ${escapeHTML(
                                            expense.cashPurpose
                                          )}`
                                        : ""
                                }

                            </div>

                        </div>

                    </div>


                    <div class="expense-right">

                        <div class="expense-amount">

                            ${formatCurrency(
                                expense.amount
                            )}

                        </div>

                        <button
                            class="delete-btn"
                            onclick="deleteExpense(${expense.id})">

                            Delete

                        </button>

                    </div>

                </div>

            `;

        }).join("");

}


/* =====================================================
   DELETE
   ===================================================== */

function deleteExpense(id) {

    const confirmed =
        confirm(
            "Delete this expense?"
        );


    if (!confirmed) {
        return;
    }


    expenses =
        expenses.filter(
            expense =>
                expense.id !== id
        );


    localStorage.setItem(
        "expenses",
        JSON.stringify(expenses)
    );


    render();

}


/* =====================================================
   CHART
   ===================================================== */

function renderChart() {

    const categoryTotals = {};


    expenses.forEach(expense => {

        if (!categoryTotals[expense.category]) {

            categoryTotals[
                expense.category
            ] = 0;

        }


        categoryTotals[
            expense.category
        ] += Number(
            expense.amount
        );

    });


    const labels =
        Object.keys(
            categoryTotals
        );


    const data =
        Object.values(
            categoryTotals
        );


    const ctx =
        document
            .getElementById(
                "expenseChart"
            )
            .getContext("2d");


    if (expenseChart) {

        expenseChart.destroy();

    }


    if (!data.length) {

        return;

    }


    expenseChart =
        new Chart(
            ctx,
            {

                type: "doughnut",

                data: {

                    labels,

                    datasets: [
                        {
                            data
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


/* =====================================================
   AI INSIGHT
   ===================================================== */

async function generateAIInsight() {

    const result =
        document.getElementById(
            "aiInsight"
        );


    if (!expenses.length) {

        result.innerHTML =
            "Add a few expenses first so AI can analyze your spending.";

        return;

    }


    result.innerHTML =
        "🤖 Analyzing your spending...";


    const totalSpent =
        expenses.reduce(
            (sum, expense) =>
                sum + Number(expense.amount),
            0
        );


    const categoryTotals = {};


    expenses.forEach(expense => {

        categoryTotals[
            expense.category
        ] =
            (
                categoryTotals[
                    expense.category
                ] || 0
            ) +
            Number(expense.amount);

    });


    try {

        const promptText = `

You are a personal finance assistant.

Analyze these expenses.

Monthly income:
₹${monthlyIncome}

Spending budget:
₹${monthlyIncome * BUDGET_PERCENTAGE}

Total spent:
₹${totalSpent}

Category breakdown:
${JSON.stringify(categoryTotals)}

Provide:
1. A short spending summary.
2. The biggest spending category.
3. One unusual or potentially concerning spending pattern.
4. Two practical suggestions.

Keep the answer concise and useful.

        `;


        const response =
            await puter.ai.chat(
                promptText
            );


        const aiText =
            response?.message?.content ||
            response?.text ||
            "Unable to generate insight.";


        result.innerHTML =
            formatAIResponse(
                aiText
            );


    } catch (error) {

        console.error(error);

        result.innerHTML =
            generateLocalInsight();

    }

}


/* Local AI-style fallback */

function generateLocalInsight() {

    const totalSpent =
        expenses.reduce(
            (sum, expense) =>
                sum + Number(expense.amount),
            0
        );


    const categoryTotals = {};


    expenses.forEach(expense => {

        categoryTotals[
            expense.category
        ] =
            (
                categoryTotals[
                    expense.category
                ] || 0
            ) +
            Number(expense.amount);

    });


    let biggestCategory = "Other";
    let biggestAmount = 0;


    for (
        const category in categoryTotals
    ) {

        if (
            categoryTotals[category]
            > biggestAmount
        ) {

            biggestCategory =
                category;

            biggestAmount =
                categoryTotals[
                    category
                ];

        }

    }


    return `

        <strong>Spending Summary</strong>

        <p>
            You have spent
            <strong>
                ${formatCurrency(totalSpent)}
            </strong>
            so far.
        </p>

        <p>
            Your biggest category is
            <strong>
                ${biggestCategory}
            </strong>
            at
            <strong>
                ${formatCurrency(biggestAmount)}
            </strong>.
        </p>

        <p>
            Keep an eye on this category and
            compare it with your monthly budget.
        </p>

    `;

}


/* =====================================================
   CSV EXPORT
   ===================================================== */

function exportCSV() {

    if (!expenses.length) {

        alert(
            "No expenses available to export."
        );

        return;

    }


    let csv =
        "Date,Description,Category,Amount,Cash Purpose\n";


    expenses.forEach(expense => {

        const row = [

            new Date(
                expense.date
            ).toLocaleDateString("en-IN"),

            escapeCSV(
                expense.description
            ),

            escapeCSV(
                expense.category
            ),

            expense.amount,

            escapeCSV(
                expense.cashPurpose || ""
            )

        ];


        csv +=
            row.join(",") +
            "\n";

    });


    const blob =
        new Blob(
            [csv],
            {
                type: "text/csv"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href = url;

    link.download =
        "expense-report.csv";


    link.click();


    URL.revokeObjectURL(url);

}


/* =====================================================
   DARK MODE
   ===================================================== */

function setupDarkMode() {

    const dark =
        localStorage.getItem(
            "darkMode"
        ) === "true";


    if (dark) {

        document.body.classList.add(
            "dark"
        );

        document.getElementById(
            "darkModeBtn"
        ).textContent = "☀️";

    }

}


function toggleDarkMode() {

    document.body.classList.toggle(
        "dark"
    );


    const enabled =
        document.body.classList.contains(
            "dark"
        );


    localStorage.setItem(
        "darkMode",
        enabled
    );


    document.getElementById(
        "darkModeBtn"
    ).textContent =
        enabled
            ? "☀️"
            : "🌙";

}


/* =====================================================
   HELPERS
   ===================================================== */

function formatCurrency(value) {

    return new Intl.NumberFormat(
        "en-IN",
        {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }
    ).format(value);

}


function escapeHTML(value) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeCSV(value) {

    return `"${String(value)
        .replace(
            /"/g,
            '""'
        )}"`;

}


function formatAIResponse(text) {

    return escapeHTML(text)
        .replace(
            /\n/g,
            "<br>"
        );

}