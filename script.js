const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzFIfkaEMP6i6XmmN6Dozc5__2Qu2-cKVG_Tgsqc9NlTiypUgNwo85EX8JQvSTHytKn/exec?type=json";

let allData = [];

window.onload = function () {
    document.getElementById("loader").classList.remove("hidden");
    document.getElementById("printDate").innerText = new Date().toLocaleDateString();
    generateKhmerDate();
    fetchData();
};

async function fetchData() {
    try {
        const response = await fetch(WEB_APP_URL);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error("Data from Google Sheet is not an array.");
        }

        allData = data;
        document.getElementById("loader").classList.add("hidden");

        populateClassFilter();
        filterData();

    } catch (error) {
        console.error("Error:", error);
        document.getElementById("loader").classList.add("hidden");
        alert("មិនអាចទាញទិន្នន័យបានទេ!");
    }
}

function generateKhmerDate() {
    const days = ["អាទិត្យ", "ចន្ទ", "អង្គារ", "ពុធ", "ព្រហស្បតិ៍", "សុក្រ", "សៅរ៍"];

    const months = [
        "មករា", "កុម្ភៈ", "មីនា", "មេសា",
        "ឧសភា", "មិថុនា", "កក្កដា", "សីហា",
        "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"
    ];

    const khnum = ["០", "១", "២", "៣", "៤", "៥", "៦", "៧", "៨", "៩"];

    const d = new Date();

    const day = d.getDate()
        .toString()
        .split("")
        .map(n => khnum[n])
        .join("");

    const year = d.getFullYear()
        .toString()
        .split("")
        .map(n => khnum[n])
        .join("");

    document.getElementById("khmerDateDisplay").innerText =
        `ថ្ងៃ${days[d.getDay()]} ទី${day} ខែ${months[d.getMonth()]} ឆ្នាំ${year}`;
}

function populateClassFilter() {
    const classes = [
        ...new Set(
            allData
                .map(row => row[3])
                .filter(Boolean)
        )
    ].sort();

    const select = document.getElementById("classFilter");

    while (select.options.length > 1) {
        select.remove(1);
    }

    classes.forEach(c => {
        select.add(new Option(c, c));
    });
}

function parseMoney(value) {
    if (value === null || value === undefined || value === "") {
        return 0;
    }

    return parseFloat(
        value.toString().replace(/[^0-9.-]+/g, "")
    ) || 0;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getPaymentStatus(row) {
    const feeVal = parseMoney(row[4]);
    const paidVal = parseMoney(row[6]);

    const statusFromSheet = row[14]
        ? row[14].toString().trim().toLowerCase()
        : "";

    if (
        statusFromSheet === "paid" ||
        statusFromSheet === "បង់រួច" ||
        (paidVal >= feeVal && feeVal > 0)
    ) {
        return "paid";
    }

    if (
        statusFromSheet === "partial" ||
        statusFromSheet === "បង់ខ្លះ" ||
        paidVal > 0
    ) {
        return "partial";
    }

    return "unpaid";
}

function getStatusBadge(status) {
    if (status === "paid") {
        return `<span class="badge-paid px-2 py-0.5 rounded text-[10px] font-bold">PAID</span>`;
    }

    if (status === "partial") {
        return `<span class="badge-partial px-2 py-0.5 rounded text-[10px] font-bold">PARTIAL</span>`;
    }

    return `<span class="badge-unpaid px-2 py-0.5 rounded text-[10px] font-bold">UNPAID</span>`;
}

function getBorderClass(status) {
    if (status === "paid") return "border-green-500";
    if (status === "partial") return "border-yellow-500";
    return "border-red-500";
}

function filterData() {
    const searchQuery = document.getElementById("searchInput")
        .value
        .toLowerCase()
        .trim();

    const selectedClass = document.getElementById("classFilter").value;
    const selectedStatus = document.getElementById("statusFilter").value;

    const tbody = document.getElementById("tableBodyDesktop");
    const mobileContainer = document.getElementById("mobileCardsContainer");

    tbody.innerHTML = "";
    mobileContainer.innerHTML = "";

    const filtered = allData.filter(row => {
        const id = String(row[0] ?? "").toLowerCase();
        const name = String(row[1] ?? "").toLowerCase();
        const className = row[3] ?? "";

        const currentStatus = getPaymentStatus(row);

        const matchesSearch =
            id.includes(searchQuery) ||
            name.includes(searchQuery);

        const matchesClass =
            selectedClass === "All" ||
            className === selectedClass;

        const matchesStatus =
            selectedStatus === "All" ||
            currentStatus === selectedStatus;

        return matchesSearch && matchesClass && matchesStatus;
    });

    document.getElementById("printClassSelected").innerText = selectedClass;

    updateStats(filtered);

    filtered.forEach(row => {
        const id = row[0] ?? "";
        const name = row[1] ?? "";
        const gender = row[2] ?? "";
        const className = row[3] ?? "";
        const fee = row[4] ?? "0 KHR";
        const paidAmt = row[6] ?? "0 KHR";

        // Balance យកពី Google Sheet column N
        const balance = row[13] ?? "0 KHR";

        const status = getPaymentStatus(row);
        const badge = getStatusBadge(status);
        const borderClass = getBorderClass(status);

        tbody.innerHTML += `
            <tr class="border-b hover:bg-gray-50">
                <td class="p-3 font-medium">${escapeHTML(id)}</td>
                <td class="p-3">${escapeHTML(name)}</td>
                <td class="p-3 text-center">${escapeHTML(gender)}</td>
                <td class="p-3">${escapeHTML(className)}</td>
                <td class="p-3 text-right">${escapeHTML(fee)}</td>
                <td class="p-3 text-right text-blue-600 font-semibold">${escapeHTML(paidAmt)}</td>
                <td class="p-3 text-right text-red-500 font-semibold">${escapeHTML(balance)}</td>
                <td class="p-3 text-center">${badge}</td>
            </tr>
        `;

        mobileContainer.innerHTML += `
            <div class="mobile-card ${borderClass} bg-white shadow-sm mb-3 p-4 rounded-lg border-l-4">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <div class="font-bold text-gray-800">${escapeHTML(name)}</div>
                        <div class="text-xs text-gray-500">${escapeHTML(id)} • ${escapeHTML(className)}</div>
                    </div>
                    ${badge}
                </div>

                <div class="flex justify-between text-xs mt-2">
                    <span>
                        Paid:
                        <b class="text-blue-600">${escapeHTML(paidAmt)}</b>
                    </span>

                    <span>
                        Due:
                        <b class="text-red-600">${escapeHTML(balance)}</b>
                    </span>
                </div>
            </div>
        `;
    });
}

function updateStats(data) {
    const total = data.length;

    const female = data.filter(
        r => String(r[2] ?? "").toLowerCase() === "female"
    ).length;

    let paid = 0;
    let partial = 0;
    let unpaid = 0;

    let sumPaid = 0;
    let sumBalance = 0;

    data.forEach(row => {
        const paidVal = parseMoney(row[6]);

        // Balance សរុបយកពី column N
        const balanceVal = parseMoney(row[13]);

        const status = getPaymentStatus(row);

        sumPaid += paidVal;
        sumBalance += balanceVal;

        if (status === "paid") {
            paid++;
        } else if (status === "partial") {
            partial++;
        } else {
            unpaid++;
        }
    });

    const updateLabel = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerText = val;
        }
    };

    updateLabel("totalStudents", total);
    updateLabel("totalFemale", female);
    updateLabel("totalPaid", paid);
    updateLabel("totalPartial", partial);
    updateLabel("totalUnpaid", unpaid);

    updateLabel("pTotalStudents", total);
    updateLabel("pTotalFemale", female);
    updateLabel("pTotalPaid", paid);
    updateLabel("pTotalPartial", partial);
    updateLabel("pTotalUnpaid", unpaid);

    updateLabel("pTotalCollected", `${sumPaid.toLocaleString()} KHR`);
    updateLabel("pTotalBalance", `${sumBalance.toLocaleString()} KHR`);
}
