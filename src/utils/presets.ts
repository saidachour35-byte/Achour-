import { PresetSample } from '../types/analyzer';

export const PRESET_SAMPLES: PresetSample[] = [
  {
    id: 'react-infinite-loop',
    titleAr: 'تطبيق React مع حلقة رندر لا نهائية وتعديل خاطئ للحالة',
    titleEn: 'React Infinite Re-render & State Mutation Bug',
    descAr: 'يحتوي على استدعاء مباشر لـ setCount داخل جسم المكون وتعديل مباشر لمصفوفة القائمة.',
    descEn: 'Contains unconditional setCount in component body and direct array mutation.',
    filename: 'CounterAndList.jsx',
    language: 'jsx',
    code: `import React, { useState, useEffect } from 'react';

export default function CounterAndList() {
  const [count, setCount] = useState(0);
  const [items, setItems] = useState(['مهمة 1', 'مهمة 2']);
  const [inputVal, setInputVal] = useState('');

  // خطأ حرج 1: استدعاء تحديث الحالة مباشرة في جسم المكون يسبب حلقة لا نهائية (Infinite Loop)
  if (count < 1) {
    setCount(1);
  }

  // خطأ 2: تعديل مباشر للحالة (State Mutation) دون استخدام دالة التحديث
  function handleAddItem() {
    if (!inputVal) return;
    items.push(inputVal); // خطأ مباشر!
    setItems(items); // لن يعيد رسم الواجهة لأن المرجع هو نفسه
    setInputVal('');
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '500px', margin: 'auto' }}>
      <h2 style={{ color: '#4f46e5' }}>عداد ومهام</h2>
      <p>القيمة الحالية: <strong>{count}</strong></p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{ padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
      >
        زيادة العداد +
      </button>

      <hr style={{ margin: '20px 0' }} />

      <h3>قائمة المهام</h3>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input 
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="أدخل مهمة جديدة..."
          style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
        />
        <button 
          onClick={handleAddItem}
          style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          إضافة
        </button>
      </div>

      <ul>
        {items.map((item, idx) => (
          <li key={idx} style={{ padding: '6px 0' }}>{item}</li>
        ))}
      </ul>
    </div>
  );
}`
  },
  {
    id: 'async-weather-bug',
    titleAr: 'تطبيق جلب بيانات غير متزامن بدون try/catch وبدون await',
    titleEn: 'Async Fetch Data with Missing Await & Unhandled Error',
    descAr: 'يحتوي على نسيان await على res.json() واستخدام دالة غير متزامنة مباشرة في useEffect.',
    descEn: 'Missing await on response.json() and async directly passed to useEffect callback.',
    filename: 'WeatherWidget.jsx',
    language: 'jsx',
    code: `import React, { useState, useEffect } from 'react';

export default function WeatherWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // خطأ 1: تمرير دالة async مباشرة لـ useEffect دون تغليف
  useEffect(async () => {
    // خطأ 2: عدم وجود try/catch للتعامل مع انقطاع الشبكة
    const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=24.7136&longitude=46.6753&current_weather=true');
    
    // خطأ 3: نسيان await لدالة json() مما يرجع Promise غير محلول
    const result = response.json();
    
    setData(result);
    setLoading(false);
  }, []);

  return (
    <div style={{ padding: '24px', background: '#0f172a', color: '#fff', borderRadius: '12px', maxWidth: '420px', margin: '20px auto' }}>
      <h3 style={{ margin: '0 0 12px 0', color: '#38bdf8' }}>طقس الرياض مباشر</h3>
      {loading && <p>جاري تحميل البيانات...</p>}
      {error && <p style={{ color: '#f87171' }}>خطأ: {error}</p>}
      {data && (
        <div>
          <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{data.current_weather?.temperature}°C</p>
          <p>سرعة الرياح: {data.current_weather?.windspeed} كم/س</p>
        </div>
      )}
    </div>
  );
}`
  },
  {
    id: 'css-layout-overflow',
    titleAr: 'واجهة متجر إلكتروني بها مشاكل تجاوز العرض وتنسيق CSS مكسور',
    titleEn: 'E-Commerce Card with CSS Overflow & Missing Flex Display',
    descAr: 'استخدام justify-content دون display: flex، واستخدام وحدات قياس خاطئة.',
    descEn: 'Using justify-content without display: flex, invalid numeric units, and overflow issues.',
    filename: 'ProductCard.html',
    language: 'html',
    code: `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>بطاقة المنتج</title>
  <style>
    body {
      background-color: #f1f5f9;
      font-family: system-ui, sans-serif;
      padding: 40px;
    }
    
    .card {
      background: white;
      border-radius: 16px;
      /* خطأ 1: قيمة العرض بدون وحدة قياس px */
      width: 340; 
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
      /* خطأ 2: overflow hidden يخفي القائمة المنسدلة */
      overflow: hidden; 
      margin: 0 auto;
      padding: 20px;
    }

    .header-bar {
      /* خطأ 3: استخدام justify-content بدون تحديد display: flex */
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .price-tag {
      font-size: 24px;
      font-weight: bold;
      color: #059669;
    }

    .btn-buy {
      width: 100%;
      background: #4f46e5;
      color: white;
      border: none;
      padding: 12px;
      border-radius: 8px;
      cursor: pointer;
      font-size: 16px;
    }
    
    .btn-buy:hover {
      background: #4338ca;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header-bar">
      <h2>سماعات لاسلكية برو</h2>
      <span class="price-tag">299 ر.س</span>
    </div>
    <p style="color: #64748b; line-height: 1.6;">سماعات رأس لاسلكية مريحة مع ميزة إلغاء الضوضاء النشط وصوت محيطي عالي الجودة.</p>
    <button class="btn-buy" onclick="alert('تمت الإضافة للسلة!')">شراء الآن</button>
  </div>
</body>
</html>`
  },
  {
    id: 'jsx-syntax-error',
    titleAr: 'أخطاء بناء جملة JSX: عناصر مجاورة بدون Fragment ووسوم غير مغلقة',
    titleEn: 'JSX Syntax Bug: Adjacent Elements without Fragment & Unclosed Tags',
    descAr: 'إرجاع عدة عناصر JSX دون عنصر أب موحد أو Fragment، واستخدام class بدلاً من className.',
    descEn: 'Multiple adjacent root elements without Fragment wrapper and class instead of className.',
    filename: 'UserProfile.jsx',
    language: 'jsx',
    code: `import React from 'react';

export default function UserProfile() {
  const user = {
    name: "سعيد عاشور",
    email: "said@example.com",
    role: "مطور برمجيات",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
  };

  // خطأ 1: إرجاع عناصر مجاورة بدون تغليفها بـ React Fragment <>...</>
  // خطأ 2: استخدام class بدلاً من className
  // خطأ 3: وسم img غير مغلق
  return (
    <div class="user-card" style={{ padding: '20px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '380px' }}>
      <img src={user.avatar} alt={user.name} style={{ width: '80px', height: '80px', borderRadius: '50%' }}>
      <h3 style={{ margin: '10px 0 4px 0' }}>{user.name}</h3>
      <p style={{ color: '#64748b', fontSize: '14px' }}>{user.email}</p>
      <span style={{ display: 'inline-block', background: '#e0e7ff', color: '#4338ca', padding: '4px 10px', borderRadius: '20px', fontSize: '12px' }}>
        {user.role}
      </span>
    </div>
    <div style={{ marginTop: '12px', textAlign: 'center' }}>
      <button style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '6px' }}>
        تعديل الملف الشخصي
      </button>
    </div>
  );
}`
  },
  {
    id: 'timer-memory-leak',
    titleAr: 'تطبيق مؤقت به تسريب ذاكرة (Memory Leak) بدون دالة تنظيف',
    titleEn: 'Timer Memory Leak with Missing Cleanup Function',
    descAr: 'استخدام setInterval داخل useEffect دون عمل clearInterval في دالة الإرجاع.',
    descEn: 'setInterval initiated inside useEffect without cleanup return function.',
    filename: 'LiveStopwatch.jsx',
    language: 'jsx',
    code: `import React, { useState, useEffect } from 'react';

export default function LiveStopwatch() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  useEffect(() => {
    if (!isRunning) return;

    // خطأ: لا يتم تخزين معرف المؤقت ولا يتم إلغاؤه عند إيقاف التشغيل أو إلغاء تركيب المكون
    // مما يسبب تسريب ذاكرة واستمرار تشغيل المؤقت وتكرار القيم
    setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    // خطأ: مفقود return () => clearInterval(id);
  }, [isRunning]);

  return (
    <div style={{ padding: '30px', textAlign: 'center', background: '#1e1b4b', color: '#fff', borderRadius: '16px', maxWidth: '360px', margin: 'auto' }}>
      <h2 style={{ color: '#a5b4fc', marginBottom: '8px' }}>مؤقت الإيقاف المباشر</h2>
      <div style={{ fontSize: '3.5rem', fontWeight: 'bold', fontFamily: 'monospace', color: '#38bdf8', margin: '20px 0' }}>
        {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}
      </div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button 
          onClick={() => setIsRunning(!isRunning)}
          style={{ padding: '10px 20px', background: isRunning ? '#ef4444' : '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {isRunning ? 'إيقاف مؤقت' : 'استئناف'}
        </button>
        <button 
          onClick={() => setSeconds(0)}
          style={{ padding: '10px 20px', background: '#374151', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
        >
          تصفير
        </button>
      </div>
    </div>
  );
}`
  }
];
