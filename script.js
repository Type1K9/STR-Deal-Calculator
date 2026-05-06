const chartCtx = document.getElementById('dealChart').getContext('2d');

let chart;
let currentDeal = null;
let savedDeals = JSON.parse(localStorage.getItem('savedStrDeals')) || [];

function money(value) {
    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
    });
}

function percent(value) {
    return `${value.toFixed(1)}%`;
}

function num(id) {
    return parseFloat(document.getElementById(id).value) || 0;
}

function text(id) {
    return document.getElementById(id).value.trim();
}

function val(id) {
    return document.getElementById(id).value;
}

function saveToStorage() {
    localStorage.setItem('savedStrDeals', JSON.stringify(savedDeals));
}

function calculateMortgage(principal, annualRate, years) {
    if (principal <= 0) return 0;
    if (annualRate <= 0) return principal / (years * 12);

    const monthlyRate = annualRate / 100 / 12;
    const numberOfPayments = years * 12;

    return principal *
        (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
}

function getAssumptionAdjustments(level) {
    if (level === 'conservative') {
        return {
            revenueMultiplier: 0.85,
            expenseMultiplier: 1.15,
            label: 'Conservative'
        };
    }

    if (level === 'aggressive') {
        return {
            revenueMultiplier: 1.10,
            expenseMultiplier: 0.95,
            label: 'Aggressive'
        };
    }

    return {
        revenueMultiplier: 1.00,
        expenseMultiplier: 1.00,
        label: 'Average'
    };
}

function calculateDeal() {
    const propertyName = text('propertyName') || 'Unnamed Property';

    const managementStyle = val('managementStyle');
    const cleaningStyle = val('cleaningStyle');
    const purchaseType = val('purchaseType');
    const assumptionLevel = val('assumptionLevel');
    const assumptions = getAssumptionAdjustments(assumptionLevel);

    const purchasePrice = num('purchasePrice');
    const downPaymentPercent = purchaseType === 'cash' ? 100 : num('downPaymentPercent');
    const interestRate = purchaseType === 'cash' ? 0 : num('interestRate');
    const loanYears = num('loanYears') || 30;

    const nightlyRate = num('nightlyRate') * assumptions.revenueMultiplier;
    const occupancy = num('occupancy') * assumptions.revenueMultiplier;

    const cleaningFeeCharged = num('cleaningFeeCharged');
    const cleanerCost = num('cleanerCost');
    const avgStayLength = num('avgStayLength') || 3;
    const otherIncome = num('otherIncome') * assumptions.revenueMultiplier;

    const taxes = num('taxes') * assumptions.expenseMultiplier;
    const insurance = num('insurance') * assumptions.expenseMultiplier;
    const utilities = num('utilities') * assumptions.expenseMultiplier;
    const hoa = num('hoa') * assumptions.expenseMultiplier;
    const repairs = num('repairs') * assumptions.expenseMultiplier;
    const otherExpenses = num('otherExpenses') * assumptions.expenseMultiplier;

    const managementPercent = managementStyle === 'self' ? 0 : num('managementPercent');

    const downPayment = purchasePrice * (downPaymentPercent / 100);
    const loanAmount = purchaseType === 'cash' ? 0 : purchasePrice - downPayment;
    const mortgage = purchaseType === 'cash' ? 0 : calculateMortgage(loanAmount, interestRate, loanYears);

    const bookedNights = 30.4 * (occupancy / 100);
    const rentalRevenue = nightlyRate * bookedNights;
    const estimatedBookings = avgStayLength > 0 ? bookedNights / avgStayLength : 0;

    const cleaningRevenue = cleaningFeeCharged * estimatedBookings;
    const cleaningExpense = cleaningStyle === 'self' ? 0 : cleanerCost * estimatedBookings;

    const monthlyRevenue = rentalRevenue + cleaningRevenue + otherIncome;
    const managementFee = monthlyRevenue * (managementPercent / 100);

    const monthlyExpenses =
        mortgage +
        taxes +
        insurance +
        utilities +
        hoa +
        repairs +
        managementFee +
        cleaningExpense +
        otherExpenses;

    const monthlyCashFlow = monthlyRevenue - monthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;

    const startupCashNeeded = purchaseType === 'cash' ? purchasePrice : downPayment;

    const cashOnCashReturn = startupCashNeeded > 0
        ? (annualCashFlow / startupCashNeeded) * 100
        : 0;

    const breakEvenOccupancy = nightlyRate > 0
        ? ((monthlyExpenses - cleaningRevenue - otherIncome) / (nightlyRate * 30.4)) * 100
        : 0;

    let grade = '';
    let gradeClass = '';

    if (monthlyCashFlow >= 500 && cashOnCashReturn >= 10) {
        grade = `Strong Deal - ${assumptions.label} Case`;
        gradeClass = 'good';
    } else if (monthlyCashFlow >= 0 && cashOnCashReturn >= 5) {
        grade = `Possible Deal - ${assumptions.label} Case`;
        gradeClass = 'okay';
    } else {
        grade = `Weak Deal - ${assumptions.label} Case`;
        gradeClass = 'bad';
    }

    currentDeal = {
        propertyName,
        managementStyle,
        cleaningStyle,
        purchaseType,
        assumptionLevel: assumptions.label,
        purchasePrice,
        downPayment,
        loanAmount,
        mortgage,
        monthlyRevenue,
        monthlyExpenses,
        monthlyCashFlow,
        annualCashFlow,
        cashOnCashReturn,
        breakEvenOccupancy,
        estimatedBookings,
        startupCashNeeded,
        grade,
        gradeClass
    };

    displayDeal(currentDeal);
}

function displayDeal(deal) {
    document.getElementById('monthlyRevenue').textContent = money(deal.monthlyRevenue);
    document.getElementById('monthlyExpenses').textContent = money(deal.monthlyExpenses);
    document.getElementById('monthlyCashFlow').textContent = money(deal.monthlyCashFlow);
    document.getElementById('annualCashFlow').textContent = money(deal.annualCashFlow);
    document.getElementById('cashOnCash').textContent = percent(deal.cashOnCashReturn);
    document.getElementById('mortgagePayment').textContent = money(deal.mortgage);
    document.getElementById('breakEvenOccupancy').textContent = percent(deal.breakEvenOccupancy);
    document.getElementById('monthlyBookings').textContent = deal.estimatedBookings.toFixed(1);
    document.getElementById('cashNeeded').textContent = money(deal.startupCashNeeded);

    const gradeBox = document.getElementById('dealGrade');
    gradeBox.textContent = deal.grade;
    gradeBox.className = `deal-grade ${deal.gradeClass}`;

    renderChart();
}

function renderChart() {
    if (!currentDeal) return;
    if (chart) chart.destroy();

    chart = new Chart(chartCtx, {
        type: 'bar',
        data: {
            labels: ['Revenue', 'Expenses', 'Cash Flow'],
            datasets: [{
                label: 'Monthly Deal Snapshot',
                data: [
                    currentDeal.monthlyRevenue,
                    currentDeal.monthlyExpenses,
                    currentDeal.monthlyCashFlow
                ],
                backgroundColor: [
                    '#16a34a',
                    '#dc2626',
                    '#c9a227'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function saveDeal() {
    if (!currentDeal) {
        alert('Analyze a deal before saving.');
        return;
    }

    savedDeals.push({ ...currentDeal });
    saveToStorage();
    renderSavedDeals();
}

function renderSavedDeals() {
    const tbody = document.getElementById('dealBody');
    tbody.innerHTML = '';

    if (savedDeals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">No saved deals yet.</td>
            </tr>
        `;
        return;
    }

    savedDeals.forEach((deal, i) => {
        const row = `
            <tr class="saved-deal-row" onclick="loadSavedDeal(${i})">
                <td>${deal.propertyName}</td>
                <td>${money(deal.monthlyCashFlow)}</td>
                <td>${percent(deal.cashOnCashReturn)}</td>
                <td>${deal.grade}</td>
                <td>
                    <button onclick="event.stopPropagation(); removeDeal(${i})">🗑️</button>
                </td>
            </tr>
        `;

        tbody.innerHTML += row;
    });
}

function loadSavedDeal(index) {
    currentDeal = savedDeals[index];
    displayDeal(currentDeal);

    document.getElementById('results-section').scrollIntoView({
        behavior: 'smooth'
    });
}

function removeDeal(index) {
    savedDeals.splice(index, 1);
    saveToStorage();
    renderSavedDeals();
}

function clearAll() {
    if (!confirm('Clear all saved deals?')) return;

    savedDeals = [];
    saveToStorage();
    renderSavedDeals();
}

function exportDealPDF() {
    if (!currentDeal) {
        alert('Analyze or load a deal before exporting.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("STR Deal Analyzer", 20, 20);

    doc.setFontSize(14);
    doc.text(currentDeal.propertyName, 20, 32);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 42);

    html2canvas(document.querySelector("#dealChart")).then(canvas => {
        const imgData = canvas.toDataURL('image/png');

        doc.addImage(imgData, 'PNG', 15, 50, 180, 80);

        let y = 145;
        doc.setFontSize(12);

        doc.text(`Purchase Type: ${currentDeal.purchaseType}`, 20, y); y += 8;
        doc.text(`Management: ${currentDeal.managementStyle}`, 20, y); y += 8;
        doc.text(`Cleaning: ${currentDeal.cleaningStyle}`, 20, y); y += 8;
        doc.text(`Assumption Level: ${currentDeal.assumptionLevel}`, 20, y); y += 8;
        doc.text(`Purchase Price: ${money(currentDeal.purchasePrice)}`, 20, y); y += 8;
        doc.text(`Cash Needed: ${money(currentDeal.startupCashNeeded)}`, 20, y); y += 8;
        doc.text(`Loan Amount: ${money(currentDeal.loanAmount)}`, 20, y); y += 8;
        doc.text(`Mortgage Payment: ${money(currentDeal.mortgage)}`, 20, y); y += 8;
        doc.text(`Monthly Revenue: ${money(currentDeal.monthlyRevenue)}`, 20, y); y += 8;
        doc.text(`Monthly Expenses: ${money(currentDeal.monthlyExpenses)}`, 20, y); y += 8;
        doc.text(`Monthly Cash Flow: ${money(currentDeal.monthlyCashFlow)}`, 20, y); y += 8;
        doc.text(`Annual Cash Flow: ${money(currentDeal.annualCashFlow)}`, 20, y); y += 8;
        doc.text(`Cash-on-Cash Return: ${percent(currentDeal.cashOnCashReturn)}`, 20, y); y += 8;
        doc.text(`Break-Even Occupancy: ${percent(currentDeal.breakEvenOccupancy)}`, 20, y); y += 8;
        doc.text(`Bookings / Month: ${currentDeal.estimatedBookings.toFixed(1)}`, 20, y); y += 8;
        doc.text(`Deal Grade: ${currentDeal.grade}`, 20, y);

        doc.save("str-deal-report.pdf");
    });
}

document.getElementById('exportBtn').addEventListener('click', exportDealPDF);

renderSavedDeals();