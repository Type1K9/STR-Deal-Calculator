const chartCtx = document.getElementById('dealChart').getContext('2d');
let chart;
let savedDeals = [];
let currentDeal = null;

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

function calculateMortgage(principal, annualRate, years) {
    if (principal <= 0) return 0;
    if (annualRate <= 0) return principal / (years * 12);

    const monthlyRate = annualRate / 100 / 12;
    const numberOfPayments = years * 12;

    return principal * 
        (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) /
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
}

function calculateDeal() {
    const propertyName = text('propertyName') || 'Unnamed Property';

    const purchasePrice = num('purchasePrice');
    const downPaymentPercent = num('downPaymentPercent');
    const interestRate = num('interestRate');
    const loanYears = num('loanYears') || 30;

    const nightlyRate = num('nightlyRate');
    const occupancy = num('occupancy');
    const cleaningProfit = num('cleaningProfit');
    const otherIncome = num('otherIncome');

    const taxes = num('taxes');
    const insurance = num('insurance');
    const utilities = num('utilities');
    const hoa = num('hoa');
    const repairs = num('repairs');
    const managementPercent = num('managementPercent');
    const otherExpenses = num('otherExpenses');

    const downPayment = purchasePrice * (downPaymentPercent / 100);
    const loanAmount = purchasePrice - downPayment;
    const mortgage = calculateMortgage(loanAmount, interestRate, loanYears);

    const bookedNights = 30.4 * (occupancy / 100);
    const rentalRevenue = nightlyRate * bookedNights;
    const monthlyRevenue = rentalRevenue + cleaningProfit + otherIncome;

    const managementFee = monthlyRevenue * (managementPercent / 100);

    const monthlyExpenses =
        mortgage +
        taxes +
        insurance +
        utilities +
        hoa +
        repairs +
        managementFee +
        otherExpenses;

    const monthlyCashFlow = monthlyRevenue - monthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;

    const startupCashNeeded = downPayment;
    const cashOnCashReturn = startupCashNeeded > 0
        ? (annualCashFlow / startupCashNeeded) * 100
        : 0;

    const breakEvenOccupancy = nightlyRate > 0
        ? ((monthlyExpenses - cleaningProfit - otherIncome) / (nightlyRate * 30.4)) * 100
        : 0;

    let grade = '';
    let gradeClass = '';

    if (monthlyCashFlow >= 500 && cashOnCashReturn >= 10) {
        grade = 'Strong Deal';
        gradeClass = 'good';
    } else if (monthlyCashFlow >= 0 && cashOnCashReturn >= 5) {
        grade = 'Possible Deal - Needs Deeper Review';
        gradeClass = 'okay';
    } else {
        grade = 'Weak Deal';
        gradeClass = 'bad';
    }

    currentDeal = {
        propertyName,
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
        grade
    };

    document.getElementById('monthlyRevenue').textContent = money(monthlyRevenue);
    document.getElementById('monthlyExpenses').textContent = money(monthlyExpenses);
    document.getElementById('monthlyCashFlow').textContent = money(monthlyCashFlow);
    document.getElementById('cashOnCash').textContent = percent(cashOnCashReturn);
    document.getElementById('mortgagePayment').textContent = money(mortgage);
    document.getElementById('breakEvenOccupancy').textContent = percent(breakEvenOccupancy);

    const gradeBox = document.getElementById('dealGrade');
    gradeBox.textContent = grade;
    gradeBox.className = `deal-grade ${gradeClass}`;

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
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function saveDeal() {
    if (!currentDeal) {
        alert('Analyze a deal before saving.');
        return;
    }

    savedDeals.push(currentDeal);
    renderSavedDeals();
}

function renderSavedDeals() {
    const tbody = document.getElementById('dealBody');
    tbody.innerHTML = '';

    savedDeals.forEach((deal, i) => {
        const row = `
            <tr>
                <td>${deal.propertyName}</td>
                <td>${money(deal.monthlyCashFlow)}</td>
                <td>${percent(deal.cashOnCashReturn)}</td>
                <td>${deal.grade}</td>
                <td><button onclick="removeDeal(${i})">🗑️</button></td>
            </tr>
        `;

        tbody.innerHTML += row;
    });
}

function removeDeal(index) {
    savedDeals.splice(index, 1);
    renderSavedDeals();
}

function clearAll() {
    savedDeals = [];
    renderSavedDeals();
}

function exportDealPDF() {
    if (!currentDeal) {
        alert('Analyze a deal before exporting.');
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

        doc.text(`Purchase Price: ${money(currentDeal.purchasePrice)}`, 20, y); y += 8;
        doc.text(`Down Payment: ${money(currentDeal.downPayment)}`, 20, y); y += 8;
        doc.text(`Loan Amount: ${money(currentDeal.loanAmount)}`, 20, y); y += 8;
        doc.text(`Mortgage Payment: ${money(currentDeal.mortgage)}`, 20, y); y += 8;
        doc.text(`Monthly Revenue: ${money(currentDeal.monthlyRevenue)}`, 20, y); y += 8;
        doc.text(`Monthly Expenses: ${money(currentDeal.monthlyExpenses)}`, 20, y); y += 8;
        doc.text(`Monthly Cash Flow: ${money(currentDeal.monthlyCashFlow)}`, 20, y); y += 8;
        doc.text(`Annual Cash Flow: ${money(currentDeal.annualCashFlow)}`, 20, y); y += 8;
        doc.text(`Cash-on-Cash Return: ${percent(currentDeal.cashOnCashReturn)}`, 20, y); y += 8;
        doc.text(`Break-Even Occupancy: ${percent(currentDeal.breakEvenOccupancy)}`, 20, y); y += 8;
        doc.text(`Deal Grade: ${currentDeal.grade}`, 20, y);

        doc.save("str-deal-report.pdf");
    });
}

document.getElementById('exportBtn').addEventListener('click', exportDealPDF);
