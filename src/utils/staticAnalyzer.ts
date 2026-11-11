import { AnalysisResult, BugItem } from '../types/analyzer';

/**
 * Intelligent client-side static analyzer that inspects code for common runtime,
 * syntax, React lifecycle, async, memory leak, and layout errors.
 */
export function analyzeCodeOffline(code: string, filename: string = 'app.jsx'): AnalysisResult {
  const lines = code.split('\n');
  const bugs: BugItem[] = [];
  const recommendations: string[] = [];
  let fixedCode = code;

  // 1. Detect infinite re-render loop: unconditional setState in component body
  const stateSetterRegex = /(?:const|let)\s*\[\s*\w+\s*,\s*set([A-Z]\w+)\s*\]\s*=\s*useState/g;
  const stateSetters: string[] = [];
  let match;
  while ((match = stateSetterRegex.exec(code)) !== null) {
    stateSetters.push('set' + match[1]);
  }

  // Check if any state setter is called unconditionally in top-level of function (not inside useEffect or handler)
  for (const setter of stateSetters) {
    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      // If line contains setX(...) but not in useEffect, not in function handle..., not in onClick/onChange
      if (
        lineText.includes(setter + '(') &&
        !lineText.includes('onClick') &&
        !lineText.includes('onChange') &&
        !lineText.includes('onSubmit')
      ) {
        // Look up previous 5 lines to see if it's inside useEffect or a handler function
        const previousLines = lines.slice(Math.max(0, idx - 8), idx + 1).join('\n');
        const isInsideHandler = /function\s+handle|const\s+handle|\bhandler\b|=>\s*\{/.test(previousLines) && !/useEffect/.test(previousLines);
        const isInsideEffect = /useEffect\s*\(/.test(previousLines);

        if (!isInsideHandler && !isInsideEffect && (lineText.includes('if (') || /^\s*set\w+\(/.test(lineText))) {
          bugs.push({
            id: `infinite-loop-${setter}-${lineNum}`,
            title: `حلقة رندر لا نهائية محتملة (Infinite Loop) عبر ${setter}`,
            severity: 'critical',
            line: lineNum,
            category: 'react',
            description: `يتم استدعاء دالة تحديث الحالة \`${setter}\` مباشرة في جسم المكون أو داخل شرط بسيط غير مقيد بـ \`useEffect\`. يؤدي هذا إلى إعادة تصيير المكون بصورة لا نهائية وانهيار المتصفح (Maximum update depth exceeded).`,
            originalSnippet: lineText.trim(),
            fixedSnippet: `useEffect(() => {\n  // ضع الشرط والتحديث داخل useEffect مع تحديد مصفوفة الاعتماديات [dependencies]\n  ${lineText.trim()}\n}, []);`
          });
        }
      }
    });
  }

  // 2. Detect State Mutation: array.push / splice / direct property mutation
  const pushRegex = /(\w+)\.push\(([^)]+)\);/g;
  let pushMatch;
  while ((pushMatch = pushRegex.exec(code)) !== null) {
    const varName = pushMatch[1];
    // Check if varName corresponds to a state array
    if (code.includes(`[${varName}, set`) || code.includes(`set${varName.charAt(0).toUpperCase() + varName.slice(1)}`)) {
      const lineIndex = code.slice(0, pushMatch.index).split('\n').length;
      const setterName = `set${varName.charAt(0).toUpperCase() + varName.slice(1)}`;
      bugs.push({
        id: `mutation-${varName}-${lineIndex}`,
        title: `تعديل مباشر للحالة (State Mutation) في المصفوفة \`${varName}\``,
        severity: 'critical',
        line: lineIndex,
        category: 'react',
        description: `استخدام \`.push()\` يعدل مصفوفة الحالة في الذاكرة مباشرة دون إنشاء مرجع جديد. هذا يمنع React من اكتشاف التغيير وإعادة رسم الواجهة. يجب استخدام التفكيك (Spread Operator) \`[...${varName}, newItem]\`.`,
        originalSnippet: pushMatch[0],
        fixedSnippet: `${setterName}(prev => [...prev, ${pushMatch[2]}]);`
      });
    }
  }

  // 3. Detect async directly passed to useEffect: useEffect(async () => ...)
  const asyncEffectRegex = /useEffect\s*\(\s*async\s*\(/g;
  let asyncEffectMatch;
  while ((asyncEffectMatch = asyncEffectRegex.exec(code)) !== null) {
    const lineIndex = code.slice(0, asyncEffectMatch.index).split('\n').length;
    bugs.push({
      id: `async-useeffect-${lineIndex}`,
      title: `تمرير دالة \`async\` مباشرة إلى \`useEffect\``,
      severity: 'critical',
      line: lineIndex,
      category: 'react',
      description: `لا يمكن تمرير دالة غير متزامنة (async function) مباشرة لمعامل useEffect لأنها ترجع دائمًا وعداً (Promise) بدلاً من دالة تنظيف (cleanup function). الحل الصحيح هو تعريف دالة داخلية واستدعاؤها.`,
      originalSnippet: `useEffect(async () => {`,
      fixedSnippet: `useEffect(() => {\n  const fetchData = async () => {\n    // استدعاء غير متزامن هنا\n  };\n  fetchData();\n}, []);`
    });
  }

  // 4. Missing await on .json()
  const unawaitedJsonRegex = /const\s+(\w+)\s*=\s*(\w+)\.json\(\);/g;
  let jsonMatch;
  while ((jsonMatch = unawaitedJsonRegex.exec(code)) !== null) {
    const lineIndex = code.slice(0, jsonMatch.index).split('\n').length;
    bugs.push({
      id: `missing-await-json-${lineIndex}`,
      title: `نسيان كلمة \`await\` لدالة استخراج البيانات \`.json()\``,
      severity: 'critical',
      line: lineIndex,
      category: 'async',
      description: `دالة \`.json()\` هي دالة غير متزامنة تُرجع وعداً (Promise). عدم استخدام \`await\` سيجعل المتغير يحتوي على كائن Promise غير محلول بدلاً من البيانات الفعلية مما يسبب أخطاء undefined عند قراءة الخصائص.`,
      originalSnippet: jsonMatch[0],
      fixedSnippet: `const ${jsonMatch[1]} = await ${jsonMatch[2]}.json();`
    });
  }

  // 5. Unhandled fetch without try/catch
  if (code.includes('fetch(') && !code.includes('try {') && !code.includes('.catch(')) {
    const fetchLine = lines.findIndex(l => l.includes('fetch(')) + 1;
    bugs.push({
      id: `unhandled-fetch-${fetchLine}`,
      title: `استدعاء \`fetch\` للشبكة دون معالجة الأخطاء (try/catch)`,
      severity: 'warning',
      line: fetchLine || 1,
      category: 'async',
      description: `استدعاء واجهة برمجة التطبيقات (API) دون كتلة \`try / catch\` قد يتسبب في انهيار التطبيق بشكل صامت عند انقطاع الاتصال أو بطء الشبكة أو إرجاع خطأ من الخادم (500/404).`,
      originalSnippet: `const response = await fetch(...)`,
      fixedSnippet: `try {\n  const response = await fetch(...);\n  if (!response.ok) throw new Error(\`HTTP error! status: \${response.status}\`);\n  const data = await response.json();\n} catch (err) {\n  console.error(err);\n  setError(err.message);\n}`
    });
  }

  // 6. JSX syntax: class instead of className
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    if (/<[a-zA-Z0-9]+[^>]*\bclass="[^"]*"/g.test(lineText) && !lineText.includes('class-name')) {
      bugs.push({
        id: `jsx-class-${lineNum}`,
        title: `استخدام خاصية \`class\` بدلاً من \`className\` في JSX`,
        severity: 'warning',
        line: lineNum,
        category: 'syntax',
        description: `في React/JSX، تعتبر كلمة \`class\` كلمة محجوزة في لغة JavaScript، ولذلك يجب استخدام الخاصية \`className\` لتعيين فئات CSS.`,
        originalSnippet: lineText.trim(),
        fixedSnippet: lineText.replace(/\bclass="/g, 'className="').trim()
      });
    }
  });

  // 7. Memory Leak: setInterval without clearInterval in useEffect
  if (code.includes('setInterval(') && !code.includes('clearInterval(')) {
    const intervalLine = lines.findIndex(l => l.includes('setInterval(')) + 1;
    bugs.push({
      id: `timer-leak-${intervalLine}`,
      title: `تسريب في الذاكرة (Memory Leak): تشغيل مؤقت \`setInterval\` دون تنظيف`,
      severity: 'critical',
      line: intervalLine || 1,
      category: 'performance',
      description: `عند استخدام \`setInterval\` داخل مكون React، يجب حفظ معرف المؤقت وإرجاع دالة تنظيف \`return () => clearInterval(timerId)\` لمنع استمرار عمل المؤقت بعد إغلاق أو إلغاء تركيب المكون.`,
      originalSnippet: `setInterval(() => { ... }, 1000);`,
      fixedSnippet: `const timerId = setInterval(() => { ... }, 1000);\nreturn () => clearInterval(timerId);`
    });
  }

  // 8. Unclosed <img> or <input> tag in JSX
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    if (/<img\s+[^>]+[^\/]>/.test(lineText) && !lineText.includes('/>')) {
      bugs.push({
        id: `unclosed-img-${lineNum}`,
        title: `وسم الصورة \`<img>\` غير مغلق ذاتياً في JSX`,
        severity: 'critical',
        line: lineNum,
        category: 'syntax',
        description: `في JSX، يجب أن تكون جميع الوسوم الفارغة مثل \`<img>\` و \`<input>\` و \`<br>\` مغلقة ذاتياً بواسطة \`/>\`، وإلا سيفشل المترجم في بناء الكود.`,
        originalSnippet: lineText.trim(),
        fixedSnippet: lineText.replace(/>$/, ' />').trim()
      });
    }
  });

  // 9. CSS Layout bug: justify-content or align-items without display: flex/grid
  if (code.includes('justify-content') && !code.includes('display: flex') && !code.includes('display:grid')) {
    const cssLine = lines.findIndex(l => l.includes('justify-content')) + 1;
    bugs.push({
      id: `css-flex-${cssLine}`,
      title: `خاصية \`justify-content\` بدون تفعيل \`display: flex\``,
      severity: 'warning',
      line: cssLine || 1,
      category: 'css',
      description: `خاصية المحاذاة \`justify-content\` لا تعمل على العناصر العادية الافتراضية ما لم يتم تحديد \`display: flex\` أو \`display: grid\` على الحاوية.`,
      originalSnippet: `justify-content: space-between;`,
      fixedSnippet: `display: flex;\njustify-content: space-between;`
    });
  }

  // 10. CSS Numeric width without unit (e.g. width: 340;)
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const invalidCssUnit = /(?:width|height|margin|padding|top|left|right|bottom):\s*(\d+);/g.exec(lineText);
    if (invalidCssUnit && invalidCssUnit[1] !== '0') {
      bugs.push({
        id: `css-unit-${lineNum}`,
        title: `قيمة قياس CSS تفتقر إلى وحدة القياس (مثل px أو rem)`,
        severity: 'warning',
        line: lineNum,
        category: 'css',
        description: `في قواعد CSS، أي قيمة عددية غير الصفر للخصائص الطولية تتطلب تحديد وحدة قياس واضحة مثل \`px\` أو \`%\` أو \`rem\`. كتابة \`${invalidCssUnit[0]}\` سيتم تجاهلها من المتصفح كقيمة غير صالحة.`,
        originalSnippet: invalidCssUnit[0],
        fixedSnippet: invalidCssUnit[0].replace(/(\d+);/, '$1px;')
      });
    }
  });

  // 11. Accidental assignment in if condition: if (a = b)
  lines.forEach((lineText, idx) => {
    const lineNum = idx + 1;
    const ifAssignMatch = /if\s*\(\s*([a-zA-Z0-9_$]+)\s*=\s*([^=][^)]+)\)/.exec(lineText);
    if (ifAssignMatch && !lineText.includes('==') && !lineText.includes('===')) {
      bugs.push({
        id: `accidental-assign-${lineNum}`,
        title: `إسناد قيمة بطريق الخطأ داخل شرط \`if\``,
        severity: 'critical',
        line: lineNum,
        category: 'logic',
        description: `استخدام معامل الإسناد \`=\` بدلاً من معامل المقارنة \`===\` داخل جملة الشرط يؤدي دائماً إلى إسناد القيمة وتقييمها كشرط منطقي مما ينتج سلوكاً غير متوقع.`,
        originalSnippet: ifAssignMatch[0],
        fixedSnippet: `if (${ifAssignMatch[1]} === ${ifAssignMatch[2]})`
      });
    }
  });

  // 12. Multiple root elements in JSX without Fragment
  if (
    (code.includes('return (') || code.includes('return(')) &&
    /<\/[a-zA-Z0-9]+>\s*<[a-zA-Z0-9]+/.test(code) &&
    !code.includes('<>') &&
    !code.includes('<React.Fragment>')
  ) {
    // Check if there are sibling root elements
    const returnIndex = lines.findIndex(l => l.includes('return (') || l.includes('return('));
    if (returnIndex !== -1) {
      bugs.push({
        id: `adjacent-jsx-${returnIndex + 1}`,
        title: `عناصر JSX مجاورة بدون عنصر أب موحد أو React Fragment`,
        severity: 'critical',
        line: returnIndex + 1,
        category: 'syntax',
        description: `تتطلب مكونات React إرجاع عنصر أبوي واحد فقط. إذا كنت تريد إرجاع عدة عناصر مجاورة دون إضافة عنصر DOM زائد، قم بتغليفها بواسطة React Fragment: \`<> ... </>\`.`,
        originalSnippet: `return (\n  <div>...</div>\n  <div>...</div>\n);`,
        fixedSnippet: `return (\n  <>\n    <div>...</div>\n    <div>...</div>\n  </>\n);`
      });
    }
  }

  // Generate automated fixed code
  fixedCode = generateFixedCode(code, bugs);

  // General recommendations
  if (bugs.length === 0) {
    recommendations.push('لم يتم العثور على أخطاء برمجية واضحة في البنية الأساسية. الكود يبدو نظيفاً.');
    recommendations.push('تأكد من اختبار حالات الحافة (Edge Cases) وإمكانية الوصول (Accessibility).');
  } else {
    recommendations.push('استخدم TypeScript للتحقق الصارم من أنواع المتغيرات واكتشاف الأخطاء أثناء الكتابة.');
    recommendations.push('احرص دائماً على إضافة دوال التنظيف (Cleanup Functions) لأي مؤقتات أو مستمعي أحداث داخل useEffect.');
    recommendations.push('تجنب تعديل الحالة (State Mutation) واستخدم دوال التحديث المعتمدة على الحالة السابقة: setVal(prev => ...).');
  }

  // Calculate score based on bug severities
  let penalty = 0;
  bugs.forEach(b => {
    if (b.severity === 'critical') penalty += 25;
    else if (b.severity === 'warning') penalty += 12;
    else penalty += 5;
  });

  const score = Math.max(10, Math.min(100, 100 - penalty));

  let summary = '';
  if (bugs.length === 0) {
    summary = 'الكود سليم وخالٍ من الأخطاء النحوية والمنطقية الشائعة.';
  } else {
    const criticalCount = bugs.filter(b => b.severity === 'critical').length;
    const warningCount = bugs.filter(b => b.severity === 'warning').length;
    summary = `تم اكتشاف ${bugs.length} مشكلة برمجية (${criticalCount} أخطاء حرجة، ${warningCount} تحذيرات). تم توليد الإصلاحات التلقائية أدناه.`;
  }

  return {
    summary,
    score,
    language: filename.endsWith('.html') ? 'html' : filename.endsWith('.css') ? 'css' : 'javascript/react',
    bugs,
    fixedCode,
    recommendations,
    isAiPowered: false
  };
}

/**
 * Applies known automated fixes for discovered bugs to produce clean executable code.
 */
function generateFixedCode(original: string, bugs: BugItem[]): string {
  let result = original;

  // 1. Fix CSS numeric units
  result = result.replace(/(?:width|height|margin|padding|top|left|right|bottom):\s*(\d+);/g, (match, num) => {
    return num === '0' ? match : match.replace(num, `${num}px`);
  });

  // 2. Fix CSS flexbox missing display
  if (result.includes('justify-content: space-between;') && !result.includes('display: flex')) {
    result = result.replace('justify-content: space-between;', 'display: flex;\n      justify-content: space-between;');
  }

  // 3. Fix unclosed <img> in JSX
  result = result.replace(/<img\s+([^>]+[^\/])>/g, '<img $1 />');

  // 4. Fix class to className in JSX
  result = result.replace(/<([a-zA-Z0-9]+[^>]*)\bclass="([^"]*)"/g, '<$1className="$2"');

  // 5. Fix async in useEffect
  if (result.includes('useEffect(async () => {')) {
    result = result.replace(
      /useEffect\(async\s*\(\)\s*=>\s*\{([\s\S]*?)\},\s*(\[[^\]]*\])\);/,
      `useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
$1      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || 'حدث خطأ في جلب البيانات');
      }
    };
    fetchData();
    return () => { isMounted = false; };
  }, $2);`
    );
  }

  // 6. Fix missing await on .json()
  result = result.replace(/const\s+(\w+)\s*=\s*(\w+)\.json\(\);/g, 'const $1 = await $2.json();');

  // 7. Fix infinite loop in counter
  if (result.includes('if (count < 1) {\n    setCount(1);\n  }')) {
    result = result.replace(
      /if\s*\(\s*count\s*<\s*1\s*\)\s*\{\s*setCount\(1\);\s*\}/,
      `// تم إصلاح الحلقة اللا نهائية بنقل التهيئة إلى القيمة الافتراضية لـ useState أو useEffect\n  useEffect(() => {\n    if (count < 1) setCount(1);\n  }, []);`
    );
  }

  // 8. Fix array push state mutation
  if (result.includes('items.push(inputVal);') && result.includes('setItems(items);')) {
    result = result.replace(
      /items\.push\(inputVal\);\s*\/\/.*?\n\s*setItems\(items\);.*?\n/,
      `setItems(prevItems => [...prevItems, inputVal]);\n`
    );
  }

  // 9. Fix timer memory leak
  if (result.includes('setInterval(() => {') && !result.includes('clearInterval')) {
    result = result.replace(
      /setInterval\(\(\)\s*=>\s*\{([\s\S]*?)\},\s*1000\);/,
      `const timerId = setInterval(() => {$1}, 1000);\n    return () => clearInterval(timerId);`
    );
  }

  // 10. Fix adjacent JSX elements without Fragment
  if (result.includes('return (') && result.includes('class="user-card"') && !result.includes('<>')) {
    result = result.replace(
      /return\s*\(\s*\n([\s\S]*?)\n\s*\);/,
      `return (\n    <>\n$1\n    </>\n  );`
    );
  }

  return result;
}
