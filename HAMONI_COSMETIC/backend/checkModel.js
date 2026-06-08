async function checkModels() {
    // Nhớ thay API_KEY_CUA_BAN bằng API Key thật của bạn nhé
    const apiKey = "AIzaSyA76puzMN1JotH3qIXYvqbbSgNKY1LuK5w"; 
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
            console.error("Lỗi từ Google:", data.error.message);
            return;
        }

        console.log("=== DANH SÁCH CÁC MODEL KHẢ DỤNG ===");
        
        data.models.forEach(model => {
            // Lọc ra các model hỗ trợ tạo văn bản
            if (model.supportedGenerationMethods.includes('generateContent')) {
                console.log(`📌 Tên Model: ${model.name.replace('models/', '')}`);
                console.log(`   Mô tả: ${model.description}\n`);
            }
        });
    } catch (error) {
        console.error("Lỗi mạng hoặc hệ thống:", error.message);
    }
}

checkModels();