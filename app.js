// UniLostFound - Week 7: Agentic Workflow Implementation

// 安全提醒：API Key 已从源代码中移除以防止泄露。
// 请在浏览器控制台输入：localStorage.setItem('DEEPSEEK_KEY', '你的新密钥') 
// 或者在本地开发时将密钥填入下方的变量中（切记推送到 GitHub 前清空）
const DEEPSEEK_API_KEY = localStorage.getItem('DEEPSEEK_KEY') || 'sk-请在控制台设置密钥';

const supabaseUrl = 'https://ufkkmdqmqsrkhwxzmrlc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVma2ttZHFtcXNya2h3eHptcmxjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2OTIwMjksImV4cCI6MjA5NTI2ODAyOX0.3VlT8-jLpETZGttmWR-opakkR31tBda3roazsjYo4DU';

// Node 0: 初始化 Supabase
let supabaseClient = null;
try {
    if (window.location.protocol === 'file:') {
        Logger.error('SYSTEM', '检测到协议为 file://，请使用 http://localhost:8000 访问，否则认证功能将失效！');
        alert('请注意：直接双击打开 HTML 文件无法使用登录功能。请在 Trae 终端运行服务器后通过 http://localhost:8000 访问。');
    }

    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
        Logger.info('SYSTEM', 'Supabase SDK 初始化成功');
    } else {
        throw new Error('Supabase SDK 未加载，请检查网络或 CDN 链接');
    }
} catch (e) {
    console.error('Supabase 初始化失败:', e);
    alert('系统初始化失败，请检查网络连接是否通畅！');
}

// ==========================================
// Week 8: Reliability & Observability Tools
// ==========================================

/**
 * 结构化日志工具 (Observability)
 */
const Logger = {
    logs: [],
    info(node, message, data = null) {
        this.add('INFO', node, message, data);
    },
    error(node, message, data = null) {
        this.add('ERROR', node, message, data);
    },
    add(level, node, message, data) {
        const entry = {
            timestamp: new Date().toLocaleTimeString(),
            level,
            node,
            message,
            data
        };
        this.logs.unshift(entry);
        console.log(`[${entry.timestamp}] [${level}] [${node}] ${message}`, data || '');
        this.render();
    },
    render() {
        const logPanel = document.getElementById('systemLogs');
        if (logPanel) {
            logPanel.innerHTML = this.logs.slice(0, 10).map(l => `
                <div class="log-entry ${l.level.toLowerCase()}">
                    <span class="log-time">${l.timestamp}</span>
                    <span class="log-node">[${l.node}]</span>
                    <span class="log-msg">${l.message}</span>
                </div>
            `).join('');
        }
    }
};

/**
 * 指数退避重试机制 (Reliability)
 */
async function withRetry(fn, maxRetries = 3, delay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (err) {
            const isLastRepo = i === maxRetries - 1;
            if (isLastRepo) throw err;
            
            const nextDelay = delay * Math.pow(2, i);
            Logger.info('RELIABILITY', `请求失败，正在进行第 ${i + 1} 次重试... (等待 ${nextDelay}ms)`, err.message);
            await new Promise(res => setTimeout(res, nextDelay));
        }
    }
}

// --- 身份验证逻辑 (Week 9 UI Upgrade) ---
let authMode = 'login'; // 'login' 或 'register'

async function checkUser() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const statusEl = document.getElementById('userStatus');
    const loginBtn = document.getElementById('loginBtn');
    
    if (user) {
        statusEl.innerText = `已登录: ${user.email.split('@')[0]}`;
        loginBtn.innerText = '退出';
    } else {
        statusEl.innerText = '未登录';
        loginBtn.innerText = '登录/注册';
    }
}

function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
    setAuthMode('login');
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('authError').style.display = 'none';
}

function setAuthMode(mode) {
    authMode = mode;
    const title = document.getElementById('modalTitle');
    const submitBtn = document.getElementById('authSubmitBtn');
    const switchText = document.getElementById('switchText');
    const switchBtn = document.getElementById('switchBtn');
    
    if (mode === 'login') {
        title.innerText = '登录';
        submitBtn.innerText = '立即登录';
        switchText.innerText = '还没有账号？';
        switchBtn.innerText = '立即注册';
    } else {
        title.innerText = '注册新账号';
        submitBtn.innerText = '提交注册';
        switchText.innerText = '已有账号？';
        switchBtn.innerText = '去登录';
    }
}

function switchAuthMode() {
    setAuthMode(authMode === 'login' ? 'register' : 'login');
}

async function handleAuth() {
    const emailInput = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    const errorEl = document.getElementById('authError');
    const submitBtn = document.getElementById('authSubmitBtn');

    if (!emailInput || !password) {
        errorEl.innerText = '请填写账号和密码';
        errorEl.style.display = 'block';
        return;
    }

    if (password.length < 6) {
        errorEl.innerText = '密码至少需要 6 位';
        errorEl.style.display = 'block';
        return;
    }

    const email = emailInput.includes('@') ? emailInput : `${emailInput}@unilostfound.com`;

    submitBtn.disabled = true;
    submitBtn.innerText = authMode === 'login' ? '正在登录...' : '正在注册...';
    errorEl.style.display = 'none';

    try {
        let result;
        if (authMode === 'login') {
            result = await supabaseClient.auth.signInWithPassword({ email, password });
        } else {
            result = await supabaseClient.auth.signUp({ email, password });
        }

        if (result.error) throw result.error;

        Logger.info('AUTH', `${authMode === 'login' ? '登录' : '注册'}成功`, { user: email });
        alert(authMode === 'login' ? '登录成功！' : '注册成功！');
        closeAuthModal();
        checkUser();
    } catch (err) {
        let friendlyMsg = err.message;
        
        // 针对 Failed to fetch 的专项诊断
        if (err.message === 'Failed to fetch') {
            if (window.location.protocol === 'file:') {
                friendlyMsg = '检测到您直接双击打开了 HTML 文件，请使用 http://localhost:8000 访问！';
            } else {
                friendlyMsg = '网络连接被拦截！请检查：1. 是否开启了广告拦截插件？ 2. 校园网是否屏蔽了 Supabase？';
            }
        }

        Logger.error('AUTH', '认证失败', friendlyMsg);
        errorEl.innerText = '失败: ' + friendlyMsg;
        errorEl.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = authMode === 'login' ? '立即登录' : '提交注册';
    }
}

async function toggleAuth() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
        await supabaseClient.auth.signOut();
        Logger.info('AUTH', '用户退出登录');
        alert('已退出登录');
        checkUser();
    } else {
        openAuthModal();
    }
}
// ------------------------------------------

let currentTab = 'found';

function switchTab(type) {
    currentTab = type;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const title = type === 'found' ? '发布招领信息' : '发布寻物启事';
    const placeholder = type === 'found' ? '请描述您捡到的物品...' : '请描述您丢失的物品...';
    
    document.querySelector('#publishForm h3').innerText = title;
    document.getElementById('itemDesc').placeholder = placeholder;
}

// ==========================================
// 智能发布流水线 (Week 7 Agentic Workflow)
// ==========================================

/**
 * Node 1 & 2: 信息采集 + AI 智能解析
 */
async function parseByAI() {
    const text = document.getElementById('itemDesc').value.trim();
    if (!text) return alert('请先输入描述信息');

    // 自动清洗密钥 (移除可能存在的空格或中文符号)
    const rawKey = localStorage.getItem('DEEPSEEK_KEY') || '';
    const cleanKey = rawKey.trim().replace(/[\u4e00-\u9fa5]/g, ''); 

    if (!cleanKey || cleanKey === 'sk-请在控制台设置密钥') {
        return alert('检测到 API 密钥未设置或格式错误。请按 F12 在控制台输入 localStorage.setItem("DEEPSEEK_KEY", "您的真实密钥")');
    }

    const btn = document.getElementById('aiParseBtn');
    btn.innerText = 'AI 正在识别...';
    btn.disabled = true;

    Logger.info('Node 1', '开始信息采集', { textLength: text.length });

    try {
        const result = await withRetry(async () => {
            Logger.info('Node 2', '调用 DeepSeek API...');
            const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${cleanKey}`
                },
                body: JSON.stringify({
                    model: "deepseek-chat",
                    messages: [
                        {
                            role: "system",
                            content: "你是一个失物招领助手。请从描述中提取：物品名称(name)、类别(category)、时间(time)、地点(location)。请务必以 JSON 格式返回。类别请从【证件、数码、钥匙、文具、其他】中选择。若信息缺失，请填“待核实”。"
                        },
                        { role: "user", content: text }
                    ],
                    response_format: { type: 'json_object' }
                })
            });

            if (!response.ok) throw new Error(`HTTP 错误! 状态码: ${response.status}`);
            
            const data = await response.json();
            return JSON.parse(data.choices[0].message.content);
        });

        Logger.info('Node 2', 'AI 解析成功', result);

        // Node 3: 人工审核 (Human-in-the-loop)
        document.getElementById('resItem').value = result.name;
        document.getElementById('resCategory').value = result.category;
        document.getElementById('resTime').value = result.time;
        document.getElementById('resLocation').value = result.location;
        document.getElementById('resultPreview').style.display = 'block';
        
        Logger.info('Node 3', '进入 Human-in-the-loop 阶段，等待用户核对');

    } catch (err) {
        Logger.error('Node 2', 'AI 识别失败', err.message);
        alert('AI 识别失败: ' + err.message + ' (请重试或手动填写)');
        // 即使失败，也展示预览区域让用户手动填写
        document.getElementById('resultPreview').style.display = 'block';
    } finally {
        btn.innerText = 'AI 智能识别';
        btn.disabled = false;
    }
}

/**
 * Node 4: 结构化入库 (Supabase)
 */
async function submitInfo() {
    // 检查是否已经过 AI 解析或已开启预览（允许手动填写）
    if (document.getElementById('resultPreview').style.display === 'none') {
        return alert('请先点击 AI 智能识别或手动开启填写区域');
    }

    const btn = document.getElementById('submitBtn');
    btn.innerText = '正在发布...';
    btn.disabled = true;

    try {
        const itemData = {
            type: currentTab,
            item_name: document.getElementById('resItem').value,
            category: document.getElementById('resCategory').value,
            occurred_at: new Date().toISOString(),
            location: document.getElementById('resLocation').value,
            description: document.getElementById('itemDesc').value,
            status: 'active'
        };

        Logger.info('Node 4', '准备提交数据至 Supabase', itemData);

        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) {
            Logger.error('Node 4', '用户未登录');
            alert('请先登录！');
            return;
        }

        itemData.user_id = user.id;

        const { data, error } = await withRetry(async () => {
            const res = await supabaseClient
                .from('items')
                .insert([itemData])
                .select();
            if (res.error) throw res.error;
            return res;
        });

        Logger.info('Node 4', '入库成功', data[0]);
        alert('发布成功！');
        
        // Node 5: 自动匹配 (Agentic)
        triggerAutoMatch(data[0]);

    } catch (err) {
        Logger.error('Node 4', '提交失败', err.message);
        alert('发布失败: ' + err.message);
    } finally {
        btn.innerText = '确认发布';
        btn.disabled = false;
    }
}

/**
 * Node 5: 自动匹配 (Agentic)
 */
async function triggerAutoMatch(newItem) {
    Logger.info('Node 5', '启动自动匹配检索...');
    const matchType = newItem.type === 'found' ? 'lost' : 'found';
    
    try {
        const { data, error } = await withRetry(async () => {
            const res = await supabaseClient
                .from('items')
                .select('*')
                .eq('type', matchType)
                .eq('category', newItem.category)
                .eq('status', 'active')
                .limit(3);
            if (res.error) throw res.error;
            return res;
        });

        if (data && data.length > 0) {
            Logger.info('Node 5', `发现 ${data.length} 个潜在匹配项`, data);
            alert(`🎉 发现 ${data.length} 个潜在匹配项！请查看“最新动态”。`);
        } else {
            Logger.info('Node 5', '未发现即时匹配项');
        }
    } catch (err) {
        Logger.error('Node 5', '匹配检索失败', err.message);
    }
    
    loadItems();
}

// 加载最新信息
async function loadItems() {
    const { data, error } = await supabaseClient
        .from('items')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    const listEl = document.getElementById('itemList');
    if (data && data.length > 0) {
        listEl.innerHTML = data.map(item => `
            <div class="item-card ${item.type}">
                <div class="item-badge">${item.type === 'found' ? '招领' : '寻物'}</div>
                <h4>${item.item_name}</h4>
                <p>📍 地点: ${item.location}</p>
                <p>⏱ 时间: ${new Date(item.occurred_at).toLocaleString()}</p>
                <button class="chat-btn" onclick="startChat('${item.id}')">私聊联系</button>
            </div>
        `).join('');
    } else {
        listEl.innerHTML = '<p class="empty-msg">暂无信息</p>';
    }
}

function startChat(itemId) {
    alert('私聊功能开发中... 敬请期待！');
}

// 页面加载后拉取数据
document.addEventListener('DOMContentLoaded', () => {
    checkUser();
    loadItems();
});
