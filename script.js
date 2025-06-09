let employeeData = [];

// Function to load data from Google Sheets
async function loadGoogleSheetData() {
    // Show loading indicator if on login page
    const loginForm = document.querySelector('.login-form');
    let loadingIndicator;
    
    if (loginForm && loginForm.style.display !== 'none') {
        loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'loading-indicator';
        loadingIndicator.innerHTML = '<p>جاري تحميل البيانات...</p>';
        loadingIndicator.style.textAlign = 'center';
        loadingIndicator.style.marginTop = '10px';
        loadingIndicator.style.color = '#4CAF50';
        
        const existingIndicator = loginForm.querySelector('.loading-indicator');
        if (existingIndicator) {
            loginForm.removeChild(existingIndicator);
        }
        
        loginForm.appendChild(loadingIndicator);
    }
    
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
        
        // Show error message to user
        if (loginForm && loginForm.style.display !== 'none') {
            const errorMessage = document.createElement('div');
            errorMessage.className = 'error-message';
            errorMessage.innerHTML = `<p style="color: red;">خطأ في تحميل البيانات: ${error.message}</p>`;
            errorMessage.style.textAlign = 'center';
            errorMessage.style.marginTop = '10px';
            
            const existingError = loginForm.querySelector('.error-message');
            if (existingError) {
                loginForm.removeChild(existingError);
            }
            
            loginForm.appendChild(errorMessage);
            
            // Remove error message after 5 seconds
            setTimeout(() => {
                const currentError = loginForm.querySelector('.error-message');
                if (currentError) {
                    loginForm.removeChild(currentError);
                }
            }, 5000);
        }
    } finally {
        // Remove loading indicator
        if (loginForm && loadingIndicator) {
            const indicator = loginForm.querySelector('.loading-indicator');
            if (indicator) {
                loginForm.removeChild(indicator);
            }
        }
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
        { value: 'June', text: 'يونيو' },
        { value: 'July', text: 'يوليو' },
        { value: 'August', text: 'أغسطس' },
        { value: 'September', text: 'سبتمبر' },
        { value: 'October', text: 'أكتوبر' },
        { value: 'November', text: 'نوفمبر' },
        { value: 'December', text: 'ديسمبر' }
    ];

    arabicMonths.forEach(month => {
        const option = document.createElement('option');
        option.value = month.value;
        option.textContent = month.text;
        monthSelector.appendChild(option);
    });

    // Set current month as default
    const currentMonth = new Date().getMonth();
    monthSelector.value = arabicMonths[currentMonth].value;

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
            'June': 'يونيو',
            'July': 'يوليو',
            'August': 'أغسطس',
            'September': 'سبتمبر',
            'October': 'أكتوبر',
            'November': 'نوفمبر',
            'December': 'ديسمبر'
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
    // Show loading indicator
    const downloadButton = document.querySelector('.download-btn');
    const originalButtonText = downloadButton.textContent;
    downloadButton.textContent = 'جاري التحميل...';
    downloadButton.disabled = true;
    
    // Get the salary slip element to capture for PDF
    const salarySlip = document.getElementById('salarySlip');
    
    // Calculate monthly data
    const monthData = {
        basicSalary: parseFloat(employee[`${month}_Salary`]) || employee.Base_Salary || 0,
        withdrawals: parseFloat(employee[`${month}_Withdrawals`]) || 0,
        deductions: parseFloat(employee[`${month}_Deductions`]) || 0,
        netSalary: parseFloat(employee[`${month}_NetSalary`]) || 
                  (parseFloat(employee[`${month}_Salary`] || employee.Base_Salary || 0) - 
                   parseFloat(employee[`${month}_Withdrawals`] || 0) - 
                   parseFloat(employee[`${month}_Deductions`] || 0))
    };

    const arabicMonths = {
        'January': 'يناير',
        'February': 'فبراير',
        'March': 'مارس',
        'April': 'أبريل',
        'May': 'مايو',
        'June': 'يونيو',
        'July': 'يوليو',
        'August': 'أغسطس',
        'September': 'سبتمبر',
        'October': 'أكتوبر',
        'November': 'نوفمبر',
        'December': 'ديسمبر'
    };

    // Use html2canvas to capture the salary slip
    setTimeout(() => {
        try {
            // Method 1: Using html2canvas for better Arabic support
            const pdfContent = document.createElement('div');
            pdfContent.className = 'pdf-content';
            pdfContent.style.width = '210mm';
            pdfContent.style.padding = '20mm';
            pdfContent.style.backgroundColor = 'white';
            pdfContent.style.direction = 'rtl';
            pdfContent.style.fontFamily = 'Noto Naskh Arabic, Arial, sans-serif';
            
            // Clone the salary details to avoid modifying the original
            const salaryDetails = document.querySelector('.salary-details').cloneNode(true);
            
            // Create header with logo and title
            const header = document.createElement('div');
            header.style.textAlign = 'center';
            header.style.marginBottom = '20px';
            header.innerHTML = `
                <h1 style="color: #4CAF50; margin-bottom: 10px;">مسير الراتب</h1>
                <p style="font-size: 16px; color: #333;">الشهر: ${arabicMonths[month]} 2024</p>
            `;
            
            // Create employee info section
            const employeeInfo = document.createElement('div');
            employeeInfo.style.marginBottom = '20px';
            employeeInfo.style.padding = '15px';
            employeeInfo.style.borderRadius = '8px';
            employeeInfo.style.backgroundColor = '#f9f9f9';
            employeeInfo.innerHTML = `
                <h3 style="color: #4CAF50; margin-bottom: 10px; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">بيانات الموظف</h3>
                <p style="margin: 8px 0;"><strong>رقم الموظف:</strong> ${employee.EmployeeID}</p>
                <p style="margin: 8px 0;"><strong>الاسم:</strong> ${employee.Name}</p>
                <p style="margin: 8px 0;"><strong>القسم:</strong> ${employee.Department || 'غير محدد'}</p>
            `;
            
            // Create salary details section
            const salaryInfo = document.createElement('div');
            salaryInfo.style.marginBottom = '20px';
            salaryInfo.style.padding = '15px';
            salaryInfo.style.borderRadius = '8px';
            salaryInfo.style.backgroundColor = '#f9f9f9';
            salaryInfo.innerHTML = `
                <h3 style="color: #4CAF50; margin-bottom: 10px; border-bottom: 2px solid #4CAF50; padding-bottom: 5px;">تفاصيل الراتب</h3>
                <p style="margin: 8px 0; padding: 5px 0; border-bottom: 1px solid #eee;"><strong>الراتب الأساسي:</strong> ${monthData.basicSalary.toFixed(2)} جنيه</p>
                <p style="margin: 8px 0; padding: 5px 0; border-bottom: 1px solid #eee;"><strong>السلف:</strong> ${monthData.withdrawals.toFixed(2)} جنيه</p>
                <p style="margin: 8px 0; padding: 5px 0; border-bottom: 1px solid #eee;"><strong>الخصومات الأخرى:</strong> ${monthData.deductions.toFixed(2)} جنيه</p>
                <p style="margin: 8px 0; padding: 5px 0; border-bottom: 1px solid #eee;"><strong>إجمالي الخصومات:</strong> ${(monthData.withdrawals + monthData.deductions).toFixed(2)} جنيه</p>
                <p style="margin: 15px 0; padding: 10px 0; border-top: 2px solid #4CAF50; font-size: 18px; color: #4CAF50;"><strong>صافي الراتب:</strong> ${monthData.netSalary.toFixed(2)} جنيه</p>
            `;
            
            // Add footer
            const footer = document.createElement('div');
            footer.style.marginTop = '30px';
            footer.style.textAlign = 'center';
            footer.style.fontSize = '12px';
            footer.style.color = '#666';
            footer.innerHTML = `
                <p>تم إنشاء هذا المستند بتاريخ ${new Date().toLocaleDateString('ar-EG')}</p>
                <p>© 2024 نظام رواتب الموظفين</p>
            `;
            
            // Assemble the PDF content
            pdfContent.appendChild(header);
            pdfContent.appendChild(employeeInfo);
            pdfContent.appendChild(salaryInfo);
            pdfContent.appendChild(footer);
            
            // Add to document temporarily
            pdfContent.style.position = 'absolute';
            pdfContent.style.left = '-9999px';
            document.body.appendChild(pdfContent);
            
            // Use html2canvas to capture the content
            html2canvas(pdfContent, {
                scale: 2, // Higher resolution
                useCORS: true,
                logging: false,
                allowTaint: true
            }).then(canvas => {
                try {
                    // Create PDF with proper dimensions
                    const pdf = new window.jspdf.jsPDF({
                        orientation: 'portrait',
                        unit: 'mm',
                        format: 'a4'
                    });
                    
                    // Calculate dimensions
                    const imgData = canvas.toDataURL('image/png');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const ratio = canvas.width / canvas.height;
                    const imgWidth = pdfWidth;
                    const imgHeight = pdfWidth / ratio;
                    
                    // Add the image to the PDF
                    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
                    
                    // Save the PDF
                    pdf.save(`مسير_الراتب_${employee.EmployeeID}_${arabicMonths[month]}_2024.pdf`);
                    
                    // Clean up
                    document.body.removeChild(pdfContent);
                    downloadButton.textContent = originalButtonText;
                    downloadButton.disabled = false;
                } catch (error) {
                    console.error('Error generating PDF:', error);
                    alert('حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.');
                    downloadButton.textContent = originalButtonText;
                    downloadButton.disabled = false;
                }
            }).catch(error => {
                console.error('Error capturing content:', error);
                alert('حدث خطأ أثناء التقاط محتوى الصفحة. يرجى المحاولة مرة أخرى.');
                downloadButton.textContent = originalButtonText;
                downloadButton.disabled = false;
            });
            
        } catch (error) {
            console.error('Error in PDF generation:', error);
            alert('حدث خطأ أثناء إنشاء ملف PDF. يرجى المحاولة مرة أخرى.');
            downloadButton.textContent = originalButtonText;
            downloadButton.disabled = false;
        }
    }, 100); // Small delay to allow UI to update
}

// Handle forgot password
function handleForgotPassword() {
    const employeeId = document.getElementById('employeeId').value.trim();
    
    if (!employeeId) {
        alert('الرجاء إدخال رقم الموظف أولاً');
        return;
    }
    
    // Find employee by ID
    const employee = employeeData.find(emp => emp.EmployeeID === employeeId);
    
    if (!employee) {
        alert('لم يتم العثور على موظف بهذا الرقم');
        return;
    }
    
    // Show password reset information
    const loginForm = document.querySelector('.login-form');
    
    // Remove any existing reset info
    const existingResetInfo = loginForm.querySelector('.reset-info');
    if (existingResetInfo) {
        loginForm.removeChild(existingResetInfo);
    }
    
    // Create reset info section
    const resetInfo = document.createElement('div');
    resetInfo.className = 'reset-info';
    resetInfo.innerHTML = `
        <p>معلومات إعادة تعيين كلمة المرور:</p>
        <p><strong>الاسم:</strong> ${employee.Name}</p>
        <p><strong>كلمة المرور:</strong> ${employee.Password}</p>
        <button class="close-btn">إغلاق</button>
    `;
    
    loginForm.appendChild(resetInfo);
    
    // Add event listener to close button
    const closeButton = resetInfo.querySelector('.close-btn');
    closeButton.addEventListener('click', function() {
        loginForm.removeChild(resetInfo);
    });
}

// Handle logout
function logout() {
    document.querySelector('.login-form').style.display = 'block';
    document.getElementById('salarySlip').style.display = 'none';
    document.getElementById('loginForm').reset();
    
    // Remove any reset info if present
    const resetInfo = document.querySelector('.reset-info');
    if (resetInfo) {
        resetInfo.parentNode.removeChild(resetInfo);
    }
}

// NotoNaskhArabic-Regular.js
(function (jsPDFAPI) {
  var font = 'AAEAAAASAQAABAAgR0RFRrRCsIIAA...'; // (truncated for brevity)
  jsPDFAPI.addFileToVFS('NotoNaskhArabic-Regular.ttf', font);
  jsPDFAPI.addFont('NotoNaskhArabic-Regular.ttf', 'NotoNaskhArabic', 'normal');
})(jsPDF.API);