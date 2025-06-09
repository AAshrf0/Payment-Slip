let employeeData = [];

// Function to load data from Google Sheets
async function loadGoogleSheetData() {
    try {
        const SHEET_ID = '1XI3kkU5KgS_nu5-PsE-qdWzwlUWrwFB8oUo_d3kOgJI';
        const API_KEY = 'AIzaSyBiVZ_1ujqfT27mIGiERSmQd8pHqRy-o2k';
        
        // First, get the sheet names
        const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?key=${API_KEY}`;
        
        try {
            const sheetsResponse = await fetch(sheetsUrl);
            if (!sheetsResponse.ok) {
                throw new Error(`HTTP error! status: ${sheetsResponse.status}`);
            }
            const sheetsData = await sheetsResponse.json();
            
            if (sheetsData.error) {
                console.error('Google Sheets API Error:', sheetsData.error);
                throw new Error(`خطأ في الاتصال: ${sheetsData.error.message}`);
            }
            
            if (!sheetsData.sheets || sheetsData.sheets.length === 0) {
                throw new Error('لم يتم العثور على أوراق في جدول البيانات. تأكد من معرف جدول البيانات صحيح ومشاركته للعامة.');
            }
            
            // Get the first sheet's properties
            const firstSheet = sheetsData.sheets[0];
            
            // Now get the data
            const dataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${firstSheet.properties.title}?key=${API_KEY}`;
            
            const response = await fetch(dataUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (data.error) {
                console.error('Data fetch error:', data.error);
                throw new Error(`خطأ في جلب البيانات: ${data.error.message}`);
            }
            
            if (!data.values) {
                throw new Error('لم يتم العثور على بيانات في الورقة. يرجى التأكد من إضافة البيانات إلى جدول البيانات الخاص بك.');
            }
            
            if (data.values.length < 2) {
                throw new Error('يجب أن تحتوي الورقة على صفين على الأقل: العناوين وصف بيانات واحد');
            }
            
            // Convert the raw data to our employee format
            const headers = data.values[0];
            
            // Required columns for basic functionality
            const requiredColumns = ['EmployeeID', 'Name', 'Password', 'Base_Salary'];
            const missingColumns = requiredColumns.filter(col => !headers.includes(col));
            
            if (missingColumns.length > 0) {
                throw new Error(`الأعمدة المطلوبة مفقودة: ${missingColumns.join(', ')}`);
            }
            
            // Process employee data
            employeeData = data.values.slice(1).map((row, rowIndex) => {
                const employee = {};
                
                // Map basic information
                headers.forEach((header, index) => {
                    const value = row[index] || '';
                    if (header === 'Base_Salary' || header.endsWith('_Salary') || 
                        header.endsWith('_Withdrawals') || header.endsWith('_Deductions') || 
                        header.endsWith('_NetSalary')) {
                        employee[header] = parseFloat(value) || 0;
                    } else {
                        employee[header] = value;
                    }
                });
                
                return employee;
            });

            // If there's an active employee view, update it
            const salarySlip = document.getElementById('salarySlip');
            if (salarySlip && salarySlip.style.display === 'block') {
                const monthSelector = document.getElementById('monthSelector');
                if (monthSelector) {
                    const currentEmployeeId = document.querySelector('.salary-details p:first-child strong').nextSibling.textContent.trim();
                    const updatedEmployee = employeeData.find(emp => emp.EmployeeID === currentEmployeeId);
                    if (updatedEmployee) {
                        showSalarySlip(updatedEmployee);
                    }
                }
            }
            
        } catch (fetchError) {
            console.error('Fetch error:', fetchError.message);
            throw new Error(`خطأ في الاتصال بخدمة جوجل: ${fetchError.message}`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Load data when page loads
window.addEventListener('load', loadGoogleSheetData);

// Refresh data every 30 seconds
setInterval(loadGoogleSheetData, 30000);

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const employeeId = document.getElementById('employeeId').value.trim();
    const password = document.getElementById('password').value.trim();
    
    const employee = employeeData.find(emp => emp.EmployeeID === employeeId && emp.Password === password);
    
    if (employee) {
        showSalarySlip(employee);
    } else {
        alert('رقم الموظف أو كلمة المرور غير صحيحة');
    }
});

// Display salary slip
function showSalarySlip(employee) {
    document.querySelector('.login-form').style.display = 'none';
    const salarySlip = document.getElementById('salarySlip');
    salarySlip.style.display = 'block';

    // Create month selector
    const monthSelector = document.createElement('select');
    monthSelector.id = 'monthSelector';
    monthSelector.className = 'month-selector';
    monthSelector.dir = 'rtl';
    
    const arabicMonths = [
        { value: 'January', text: 'يناير' },
        { value: 'February', text: 'فبراير' },
        { value: 'March', text: 'مارس' },
        { value: 'April', text: 'أبريل' },
        { value: 'May', text: 'مايو' },
        { value: 'June', text: 'يونيو' }
    ];

    arabicMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month.value;
        option.textContent = month.text;
        monthSelector.appendChild(option);
    });

    // Set current month as default
    const currentMonth = new Date().getMonth();
    if (currentMonth < 6) {
        monthSelector.value = arabicMonths[currentMonth].value;
    }

    const employeeDetails = document.getElementById('employeeDetails');
    employeeDetails.innerHTML = '';

    // Create container for month selector and download button
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'controls-container';
    
    const monthLabel = document.createElement('label');
    monthLabel.htmlFor = 'monthSelector';
    monthLabel.innerHTML = '<strong>اختر الشهر:</strong>';

    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'تحميل PDF';
    downloadButton.className = 'download-btn';

    controlsContainer.appendChild(monthLabel);
    controlsContainer.appendChild(monthSelector);
    controlsContainer.appendChild(downloadButton);
    employeeDetails.appendChild(controlsContainer);

    function updateSalarySlip() {
        const selectedMonth = monthSelector.value;
        const arabicMonthNames = {
            'January': 'يناير',
            'February': 'فبراير',
            'March': 'مارس',
            'April': 'أبريل',
            'May': 'مايو',
            'June': 'يونيو'
        };

        // Get monthly data
        const monthlySalary = parseFloat(employee[`${selectedMonth}_Salary`]) || employee.Base_Salary || 0;
        const withdrawals = parseFloat(employee[`${selectedMonth}_Withdrawals`]) || 0;
        const deductions = parseFloat(employee[`${selectedMonth}_Deductions`]) || 0;
        const netSalary = parseFloat(employee[`${selectedMonth}_NetSalary`]) || (monthlySalary - withdrawals - deductions);

        const salaryDetails = document.createElement('div');
        salaryDetails.className = 'salary-details';
        salaryDetails.dir = 'rtl';
        salaryDetails.innerHTML = `
            <h3>بيانات الموظف</h3>
            <p><strong>رقم الموظف:</strong> ${employee.EmployeeID}</p>
            <p><strong>الاسم:</strong> ${employee.Name}</p>
            <p><strong>القسم:</strong> ${employee.Department || 'غير محدد'}</p>
            <p><strong>الشهر:</strong> ${arabicMonthNames[selectedMonth]} 2024</p>
            
            <h3>تفاصيل الراتب</h3>
            <p><strong>الراتب الأساسي:</strong> ${employee.Base_Salary.toFixed(2)} جنيه</p>
            ${monthlySalary !== employee.Base_Salary ? 
                `<p><strong>راتب الشهر:</strong> ${monthlySalary.toFixed(2)} جنيه</p>` : ''}
            <p><strong>السلف:</strong> ${withdrawals.toFixed(2)} جنيه</p>
            <p><strong>الخصومات الأخرى:</strong> ${deductions.toFixed(2)} جنيه</p>
            <p><strong>إجمالي الخصومات:</strong> ${(withdrawals + deductions).toFixed(2)} جنيه</p>
            <p class="net-amount"><strong>صافي الراتب:</strong> ${netSalary.toFixed(2)} جنيه</p>
        `;

        const existingDetails = employeeDetails.querySelector('.salary-details');
        if (existingDetails) {
            employeeDetails.replaceChild(salaryDetails, existingDetails);
        } else {
            employeeDetails.appendChild(salaryDetails);
        }
    }

    // Initial update
    updateSalarySlip();

    // Update when month changes
    monthSelector.addEventListener('change', updateSalarySlip);

    // Handle PDF download
    downloadButton.addEventListener('click', function() {
        generatePDF(employee, monthSelector.value);
    });
}

// Generate and download PDF
function generatePDF(employee, month) {
    const monthData = {
        basicSalary: parseFloat(employee[`${month}_Salary`] || employee.Salary || 0),
        withdrawals: parseFloat(employee[`${month}_Withdrawals`] || 0),
        deductions: parseFloat(employee[`${month}_Deductions`] || 0),
        netSalary: parseFloat(employee[`${month}_NetSalary`] || 0)
    };

    const arabicMonths = {
        'January': 'يناير',
        'February': 'فبراير',
        'March': 'مارس',
        'April': 'أبريل',
        'May': 'مايو',
        'June': 'يونيو'
    };

    // Create PDF with RTL support
    const doc = new window.jspdf.jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    // Add Arabic font support using a simple font
    doc.setFont('helvetica');
    doc.setR2L(true); // Enable RTL mode

    // Set initial position
    let y = 20;
    const margin = 20;
    const lineHeight = 10;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(76, 175, 80);
    doc.text('مسير الراتب', doc.internal.pageSize.width - margin, y, { align: 'right' });
    y += lineHeight * 2;

    // Month
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text(`الشهر: ${arabicMonths[month]} 2024`, doc.internal.pageSize.width - margin, y, { align: 'right' });
    y += lineHeight * 2;

    // Employee Details
    doc.setFontSize(12);
    doc.text(`القسم: ${employee.Department || 'غير محدد'}`, doc.internal.pageSize.width - margin, y, { align: 'right' });
    y += lineHeight;
    doc.text(`الاسم: ${employee.Name}`, doc.internal.pageSize.width - margin, y, { align: 'right' });
    y += lineHeight;
    doc.text(`رقم الموظف: ${employee.EmployeeID}`, doc.internal.pageSize.width - margin, y, { align: 'right' });
    y += lineHeight * 2;

    // Salary Details
    doc.setFontSize(14);
    doc.text('تفاصيل الراتب:', doc.internal.pageSize.width - margin, y, { align: 'right' });
    y += lineHeight;

    doc.setFontSize(12);
    doc.text(`صافي الراتب: ${monthData.netSalary.toFixed(2)} جنيه`, doc.internal.pageSize.width - margin, y, { align: 'right' });
    y += lineHeight;
    doc.text(`إجمالي الخصومات: ${(monthData.withdrawals + monthData.deductions).toFixed(2)} جنيه`, doc.internal.pageSize.width - margin, y, { align: 'right' });
    y += lineHeight;
    doc.text(`الخصومات الأخرى: ${monthData.deductions.toFixed(2)} جنيه`, doc.internal.pageSize.width - margin, y, { align: 'right' });
    y += lineHeight;
    doc.text(`السلف: ${monthData.withdrawals.toFixed(2)} جنيه`, doc.internal.pageSize.width - margin, y, { align: 'right' });
    y += lineHeight;
    doc.text(`الراتب الأساسي: ${monthData.basicSalary.toFixed(2)} جنيه`, doc.internal.pageSize.width - margin, y, { align: 'right' });

    // Save the PDF
    doc.save(`مسير_الراتب_${employee.EmployeeID}_${month}.pdf`);
}

// Handle logout
function logout() {
    document.querySelector('.login-form').style.display = 'block';
    document.getElementById('salarySlip').style.display = 'none';
    document.getElementById('loginForm').reset();
}

// NotoNaskhArabic-Regular.js
(function (jsPDFAPI) {
  var font = 'AAEAAAASAQAABAAgR0RFRrRCsIIAA...'; // (truncated for brevity)
  jsPDFAPI.addFileToVFS('NotoNaskhArabic-Regular.ttf', font);
  jsPDFAPI.addFont('NotoNaskhArabic-Regular.ttf', 'NotoNaskhArabic', 'normal');
})(jsPDF.API); 