<div dir="rtl">

[![خلاصهٔ TOON: کدگذاری JSON به TOON برای پرامپت‌های LLM، همراه با بنچمارک توکن و دقت](https://github.com/stableagent/toon/raw/main/.github/og_v4.png)](https://github.com/stableagent/toon/blob/main/.github/og_v4.png)

# نمادگذاری شیءگرای توکن‌محور (TOON)

[![CI](https://github.com/toon-format/toon/actions/workflows/ci.yml/badge.svg)](https://github.com/toon-format/toon/actions) [![npm version](https://img.shields.io/npm/v/@toon-format/toon.svg?labelColor=1b1b1f&color=fef3c0)](https://www.npmjs.com/package/@toon-format/toon) [![SPEC v4.1](https://img.shields.io/badge/spec-v4.1-fef3c0?labelColor=1b1b1f)](https://github.com/toon-format/spec) [![npm downloads (total)](https://img.shields.io/npm/dt/@toon-format/toon.svg?labelColor=1b1b1f&color=fef3c0)](https://www.npmjs.com/package/@toon-format/toon) [![License: MIT](https://img.shields.io/badge/license-MIT-fef3c0?labelColor=1b1b1f)](./LICENSE)

**نمادگذاری شیءگرای توکن‌محور (Token-Oriented Object Notation)** یک کدگذاری فشرده و انسان‌خوانا از مدل دادهٔ JSON است که تعداد توکن‌ها را به حداقل می‌رساند و درک ساختار را برای مدل‌ها آسان می‌کند.

TOON ساختار مبتنی بر تورفتگی در YAML (برای اشیای تودرتو) را با قالب‌های جدولی به سبک CSV (برای داده‌های یکنواخت) ترکیب می‌کند. نقطهٔ قوت آن اشیای یکنواخت است؛ یعنی آیتم‌هایی که فیلدهای یکسان دارند، چه در یک آرایه باشند و چه با شناسه کلیدگذاری شده باشند. TOON در این حالت به فشردگی نزدیک به CSV می‌رسد و در عین حال ساختاری صریح اضافه می‌کند که به LLMها کمک می‌کند داده را قابل‌اعتمادتر تجزیه و اعتبارسنجی کنند. برای داده‌های عمیقاً تودرتو یا ناهمگون، ممکن است JSON کارآمدتر باشد.

آن را یک لایهٔ ترجمه در نظر بگیرید: در کد از JSON استفاده کنید و برای ورودی LLM آن را به TOON کدگذاری کنید. TOON نمایشی جایگزین‌پذیر و بدون اتلاف از همان JSON است که از قبل دارید.

> [!TIP]
> قالب TOON پایدار است، اما هنوز ایده‌ای در حال تکامل است. هیچ چیز قطعی نیست. با مشارکت در [مشخصات (spec)](https://github.com/toon-format/spec) یا ارائهٔ بازخورد، در شکل‌دادن به مسیر آن سهیم شوید.

## فهرست مطالب

- [چرا TOON؟](#why-toon)
- [ویژگی‌های کلیدی](#key-features)
- [چه زمانی از TOON استفاده نکنیم](#when-not-to-use-toon)
- [بنچمارک‌ها](#benchmarks)
- [نصب و شروع سریع](#installation--quick-start)
- [رابط خط فرمان (CLI)](#cli)
- [استفاده از TOON با LLMها](#using-toon-with-llms)
- [اکوسیستم](#ecosystem)
- [مستندات](#documentation)
- [نوع رسانه و پسوند فایل](#media-type--file-extension)
- [پیاده‌سازی‌های دیگر](#other-implementations)
- [📋 مشخصات کامل](https://github.com/toon-format/spec/blob/main/SPEC.md)

<a id="why-toon"></a>

## چرا TOON؟

**توکن‌های LLM هزینه دارند** و JSON بخش زیادی از آن‌ها را صرف ساختار می‌کند. یک پیش‌بینی آب‌وهوا در TOON:

```
location:
  city: Berlin
  country: DE
  units: metric
alerts[2]: frost,wind
forecast[3]{day,temp{min,max},condition,rainChance}:
  Mon,-2,4,snow,80
  Tue,1,7,cloudy,20
  Wed,3,11,sunny,5
```

همین داده در JSON حدود ۱۱۷ توکن است، در برابر حدود ۶۶ توکن در TOON:

```
{
  "location": {
    "city": "Berlin",
    "country": "DE",
    "units": "metric"
  },
  "alerts": [
    "frost",
    "wind"
  ],
  "forecast": [
    {
      "day": "Mon",
      "temp": {
        "min": -2,
        "max": 4
      },
      "condition": "snow",
      "rainChance": 80
    },
    {
      "day": "Tue",
      "temp": {
        "min": 1,
        "max": 7
      },
      "condition": "cloudy",
      "rainChance": 20
    },
    {
      "day": "Wed",
      "temp": {
        "min": 3,
        "max": 11
      },
      "condition": "sunny",
      "rainChance": 5
    }
  ]
}
```

در نمونهٔ TOON بالا سه اتفاق هم‌زمان می‌افتد. دو مورد **قالب** (form) هستند، یعنی یک شیوهٔ نمایش برای یک مقدار که به‌طور خودکار بر اساس شکل داده انتخاب می‌شود، و مورد سوم یک ویژگی سرایند (header) است:

- `alerts[2]: frost,wind` **قالب درون‌خطی** (inline) است: آرایه‌ای از مقادیر ساده در همان خط سرایند.
- `forecast[3]{day,…}:` **قالب جدولی** (tabular) است: فهرست فیلدها یک بار در سرایند اعلام می‌شود و سپس به‌ازای هر عنصر یک ردیف می‌آید.
- `temp{min,max}` داخل همان سرایند یک **گروه فیلد تودرتو** است: اشیای تودرتوی یکنواخت `temp` در سرایند جمع می‌شوند و ردیف‌ها تخت (flat) باقی می‌مانند.

قالب سوم **جدولی کلیددار** (keyed tabular) است، برای اشیایی که مقادیرشان اشیای یکنواخت‌اند: نقشه‌های پیکربندی، فلگ‌های ویژگی، رکوردهای مبتنی بر شناسه. دونقطه بعد از طول (`[2:]`) آن را مشخص می‌کند و هر ردیف کلید خودش را دارد:

| JSON | TOON |
| --- | --- |
| <pre>{<br>  "environments": {<br>    "production": { "region": "eu-central-1", "replicas": 6, "debug": false },<br>    "staging": { "region": "eu-central-1", "replicas": 2, "debug": true }<br>  }<br>}</pre> | <pre>environments[2:]{region,replicas,debug}:<br>  production: eu-central-1,6,false<br>  staging: eu-central-1,2,true</pre> |

هر چیزی که در هیچ‌کدام از این قالب‌ها نگنجد (انواع مختلط، اشیای ناهمگون) به قالب چهارم برمی‌گردد: **قالب فهرستی** (list form). در این قالب برای هر عنصر یک آیتم `- ` می‌آید و برای شیء خالی فقط یک `-` تنها. این چهار قالب همهٔ شکل‌ها را پوشش می‌دهند؛ برای جزئیات بیشتر به [نمای کلی قالب](https://toonformat.dev/guide/format-overview) مراجعه کنید.

> [!TIP]
> بدون نصب هیچ‌چیز، آن را روی داده‌های خودتان امتحان کنید:
>
> ```
> cat data.json | npx @toon-format/cli --stats
> ```
>
> این دستور خروجی TOON را کنار میزان صرفه‌جویی نشان می‌دهد. برای پیش‌بینی آب‌وهوای بالا، نتیجه این است:
>
> ```
> ℹ Token estimates: ~117 (JSON) → ~66 (TOON)
> ✔ Saved ~51 tokens (-43.6%)
> ```

<a id="key-features"></a>

## ویژگی‌های کلیدی

- 📊 **کم‌مصرف در توکن و دقیق:** دقت بازیابی برابر با JSON را با ۴۲٫۶٪ توکن کمتر ارائه می‌دهد؛ به [بنچمارک‌ها](#benchmarks) نگاه کنید.
- 🔁 **مدل دادهٔ JSON:** همان اشیا، آرایه‌ها و مقادیر ساده‌ای را که JSON دارد کدگذاری می‌کند، با رفت‌وبرگشت قطعی و بدون اتلاف.
- 🛤️ **حفاظ‌های دوستدار LLM:** `[N]` تعداد ردیف‌ها و `{fields}` تعداد ستون‌ها را اعلام می‌کند؛ بنابراین خروجی ناقص یا نادرست نمی‌تواند نادیده بماند.
- 📐 **نحو مینیمال:** به‌جای آکولاد از تورفتگی استفاده می‌کند و نقل‌قول‌گذاری را به حداقل می‌رساند؛ خوانایی مشابه YAML با فشردگی CSV.
- 🧺 **قالب‌های جدولی:** اشیای یکنواخت، چه در آرایه و چه زیر کلیدها، فهرست فیلدها را یک بار اعلام می‌کنند و سپس هر کدام یک ردیف می‌گیرند.
- 🌐 **اکوسیستم چندزبانه:** پیاده‌سازی‌های رسمی و ده‌ها پورت جامعه‌ساخت، همه با یک مشخصات و یک مجموعهٔ تست انطباق مشترک.

<a id="when-not-to-use-toon"></a>

## چه زمانی از TOON استفاده نکنیم

TOON روی آرایه‌هایی از اشیای یکنواخت بهترین عملکرد را دارد. در این موارد سراغ گزینهٔ دیگری بروید:

- **ساختارها عمیقاً تودرتو یا ناهمگون هستند** (واجد شرایط بودن جدولی ≈ ۰٪): JSON فشرده اغلب با اختلاف برنده است.
- **آرایه‌ها نیمه‌یکنواخت هستند** (واجد شرایط بودن ≈ ۴۰ تا ۶۰٪): صرفه‌جویی کم می‌شود؛ اگر خط لولهٔ شما از قبل با JSON کار می‌کند، همان را نگه دارید.
- **داده کاملاً جدولی است:** CSV کوچک‌تر است. سربار ۵ تا ۱۰ درصدی TOON، طول اعلام‌شده، فهرست فیلدها و محدودسازی جداکننده را می‌خرد که یک معاوضهٔ اطمینان است، نه حجم.
- **تأخیر تعیین‌کننده است:** در برخی استقرارها (به‌ویژه مدل‌های محلی یا کوانتیزه) JSON فشرده با وجود توکن بیشتر سریع‌تر پردازش می‌شود. TTFT و زمان کل را روی تنظیمات خودتان اندازه بگیرید.

[بنچمارک‌های](#benchmarks) زیر معاوضهٔ توکن و دقت را کمّی می‌کنند؛ تأخیر تنها موردی است که باید خودتان اندازه بگیرید.

<a id="benchmarks"></a>

## بنچمارک‌ها

دو مسیر (track) وجود دارد تا هر مقایسه منصفانه باشد:

- **مسیر ساختار مختلط:** مجموعه‌داده‌های تودرتو و نیمه‌یکنواخت (TOON در برابر JSON، YAML و XML). CSV کنار گذاشته شده است، چون این ساختارها را بدون تخت‌سازیِ همراه با اتلاف نمی‌تواند نمایش دهد.
- **مسیر فقط تخت:** مجموعه‌داده‌های تخت و کاملاً واجد شرایط قالب جدولی، جایی که CSV رقیب منصفانه‌ای است.

### دقت بازیابی

بنچمارک‌ها درک LLM را در قالب‌های ورودی مختلف با ۲۴۴ پرسش بازیابی داده روی ۴ مدل می‌سنجند.

<details>
<summary><strong>نمایش فهرست مجموعه‌داده‌ها</strong></summary>

#### فهرست مجموعه‌داده‌ها

| مجموعه‌داده | ردیف‌ها | ساختار | پشتیبانی CSV | واجد شرایط بودن |
| --- | --- | --- | --- | --- |
| رکوردهای یکنواخت کارمندان | 100 | یکنواخت | ✓ | 100% |
| سفارش‌های فروشگاه اینترنتی با ساختارهای تودرتو | 50 | تودرتو | ✗ | 33% |
| داده‌های تحلیلی سری زمانی | 60 | یکنواخت | ✓ | 100% |
| ۱۰۰ مخزن برتر GitHub | 100 | یکنواخت | ✓ | 100% |
| لاگ رویدادهای نیمه‌یکنواخت | 75 | نیمه‌یکنواخت | ✗ | 50% |
| پیکربندی عمیقاً تودرتو | 1 | عمیق | ✗ | 0% |
| مجموعه‌داده کامل و معتبر (شاهد) | 20 | یکنواخت | ✓ | 100% |
| آرایهٔ کوتاه‌شده: ۳ ردیف از انتها حذف شده | 20 | یکنواخت | ✓ | 100% |
| ردیف‌های اضافه فراتر از طول اعلام‌شده | 20 | یکنواخت | ✓ | 100% |
| تعداد فیلد ناسازگار (نبودن salary در ردیف ۱۰) | 20 | یکنواخت | ✓ | 100% |
| فیلدهای الزامی گم‌شده (نبودن email در چند ردیف) | 20 | یکنواخت | ✓ | 100% |
| فلگ‌های ویژگی با کلید نام | 40 | یکنواخت | ✗ | 100% |
| مخاطبین با گروه‌های تودرتوی آدرس و طرح | 50 | تودرتو | ✗ | 100% |

**رده‌های ساختار:**

- **یکنواخت (uniform):** همهٔ اشیا فیلدهای یکسان با مقادیر ساده دارند.
- **نیمه‌یکنواخت (semi-uniform):** ترکیبی از ساختارهای یکنواخت و غیریکنواخت.
- **تودرتو (nested):** اشیایی با ساختارهای تودرتو (اشیا یا آرایه‌های تودرتو).
- **عمیق (deep):** بسیار تودرتو، با حداقل واجد شرایط بودن جدولی.

**پشتیبانی CSV:** ✓ (پشتیبانی می‌شود)، ✗ (پشتیبانی نمی‌شود؛ نیازمند تخت‌سازی همراه با اتلاف است)

**واجد شرایط بودن:** درصد آرایه‌ها و نقشه‌های کلیددار که برای قالب‌های جدولی TOON واجد شرایط‌اند (رکوردهای یکنواختی که فیلدهایشان مقادیر ساده یا اشیای تودرتوی یکنواخت است که در گروه‌های فیلد تودرتو جمع می‌شوند).

</details>

#### رتبه‌بندی کارآیی (دقت به‌ازای هر ۱۰۰۰ توکن)

هر قالب بر اساس کارآیی (درصد دقت به‌ازای هر ۱٬۰۰۰ توکن) رتبه‌بندی شده است:

```
TOON           ████████████████████   29.2 acc%/1K tok  │  72.2%  ±2.8 acc  │  2,474 tokens
JSON compact   ████████████████░░░░   23.8 acc%/1K tok  │  69.0%  ±2.9 acc  │  2,892 tokens
YAML           ██████████████░░░░░░   20.1 acc%/1K tok  │  70.1%  ±2.9 acc  │  3,487 tokens
JSON           ███████████░░░░░░░░░   16.6 acc%/1K tok  │  71.4%  ±2.8 acc  │  4,308 tokens
XML            ██████████░░░░░░░░░░   14.4 acc%/1K tok  │  70.7%  ±2.9 acc  │  4,909 tokens
```

*امتیاز کارآیی = (درصد دقت ÷ تعداد توکن) × ۱٬۰۰۰. هرچه بالاتر، بهتر.*

> [!TIP]
> TOON به دقت **72.2%** (در برابر 71.4% در JSON) می‌رسد و در عین حال **42.6% توکن کمتر** مصرف می‌کند.

> [!NOTE]
> CSV از این رتبه‌بندی کنار گذاشته شده، چون فقط از ۱۰۹ پرسش از ۲۴۴ پرسش (فقط داده‌های تخت و جدولی) پشتیبانی می‌کند. CSV برای داده‌های جدولی ساده بسیار کم‌مصرف در توکن است، اما نمی‌تواند ساختارهای تودرتویی را که قالب‌های دیگر مدیریت می‌کنند نمایش دهد.

#### دقت روی مجموعه‌داده‌های تخت

هر قالب به همان ۱۰۹ پرسش مجموعه‌داده‌های تخت به‌ازای هر مدل پاسخ می‌دهد؛ بنابراین CSV را اینجا می‌توان در شرایط برابر مقایسه کرد.

| قالب | دقت | درست/کل | میانگین توکن |
| --- | --- | --- | --- |
| `toon` | 63.1% ±4.5 | 275/436 | 1,994 |
| `csv` | 62.2% ±4.5 | 271/436 | 1,851 |
| `json-pretty` | 60.3% ±4.6 | 263/436 | 3,950 |
| `xml` | 60.1% ±4.6 | 262/436 | 4,516 |
| `yaml` | 59.9% ±4.6 | 261/436 | 3,270 |
| `json-compact` | 58.0% ±4.6 | 253/436 | 2,718 |

#### دقت به‌تفکیک مدل

دقت روی ۴ LLM با ۲۴۴ پرسش بازیابی داده:

```
claude-haiku-4-5-20251001
→ TOON           █████████████░░░░░░░    65.6% ±5.9 (160/244)
  JSON           █████████████░░░░░░░    63.5% ±6.0 (155/244)
  XML            ████████████░░░░░░░░    62.3% ±6.0 (152/244)
  YAML           ████████████░░░░░░░░    62.3% ±6.0 (152/244)
  JSON compact   ████████████░░░░░░░░    61.9% ±6.0 (151/244)
  CSV            ██████████░░░░░░░░░░    49.5% ±9.2 (54/109)

gemini-3.6-flash
→ TOON           ██████████████░░░░░░    69.3% ±5.8 (169/244)
  JSON           ██████████████░░░░░░    68.4% ±5.8 (167/244)
  YAML           ██████████████░░░░░░    67.6% ±5.8 (165/244)
  XML            █████████████░░░░░░░    65.2% ±5.9 (159/244)
  JSON compact   █████████████░░░░░░░    63.5% ±6.0 (155/244)
  CSV            ████████████░░░░░░░░    57.8% ±9.1 (63/109)

gpt-5.4-nano
  XML            ████████████░░░░░░░░    59.4% ±6.1 (145/244)
  JSON           ███████████░░░░░░░░░    57.4% ±6.2 (140/244)
→ TOON           ███████████░░░░░░░░░    57.0% ±6.2 (139/244)
  JSON compact   ███████████░░░░░░░░░    54.9% ±6.2 (134/244)
  YAML           ███████████░░░░░░░░░    54.5% ±6.2 (133/244)
  CSV            █████████░░░░░░░░░░░    46.8% ±9.2 (51/109)

grok-4.5
→ TOON           ███████████████████░    97.1% ±2.2 (237/244)
  JSON           ███████████████████░    96.3% ±2.5 (235/244)
  XML            ███████████████████░    95.9% ±2.6 (234/244)
  YAML           ███████████████████░    95.9% ±2.6 (234/244)
  JSON compact   ███████████████████░    95.5% ±2.7 (233/244)
  CSV            ███████████████████░    94.5% ±4.5 (103/109)
```

> [!NOTE]
> ارقام دقت شامل بازه‌های اطمینان ۹۵٪ ویلسون (±) هستند؛ وقتی بازه‌های دو قالب هم‌پوشانی دارند، تفاوت میان آن‌ها از نظر آماری معنادار نیست. CSV فقط به ۱۰۹ پرسش مجموعه‌داده‌های تخت پاسخ می‌دهد؛ پس خانه‌های آن در جدول هر مدل جمعیتی کوچک‌تر و ساده‌تر از قالب‌های دیگر را پوشش می‌دهد.

<details>
<summary><strong>عملکرد به‌تفکیک مجموعه‌داده و نوع پرسش</strong></summary>

#### عملکرد به‌تفکیک نوع پرسش

| نوع پرسش | TOON | JSON | XML | YAML | JSON compact | CSV |
| --- | --- | --- | --- | --- | --- | --- |
| بازیابی فیلد | 97.8% | 99.2% | 99.2% | 99.7% | 98.9% | 100.0% |
| تجمیع | 48.4% | 48.4% | 46.0% | 46.0% | 45.2% | 32.8% |
| فیلترکردن | 38.0% | 41.1% | 37.5% | 40.1% | 38.0% | 33.3% |
| آگاهی از ساختار | 90.3% | 84.0% | 84.0% | 79.2% | 78.5% | 82.8% |
| اعتبارسنجی ساختاری | 100.0% | 50.0% | 80.0% | 50.0% | 45.0% | 80.0% |

#### عملکرد به‌تفکیک مجموعه‌داده

##### رکوردهای یکنواخت کارمندان

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `csv` | 64.6% | 2,336 | 106/164 |
| `toon` | 62.8% | 2,537 | 103/164 |
| `json-compact` | 62.2% | 3,919 | 102/164 |
| `yaml` | 64.0% | 4,982 | 105/164 |
| `json-pretty` | 62.2% | 6,326 | 102/164 |
| `xml` | 61.0% | 7,286 | 100/164 |

##### سفارش‌های فروشگاه اینترنتی با ساختارهای تودرتو

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `json-compact` | 70.7% | 6,875 | 116/164 |
| `toon` | 71.3% | 7,344 | 117/164 |
| `yaml` | 72.0% | 8,456 | 118/164 |
| `json-pretty` | 71.3% | 10,842 | 117/164 |
| `xml` | 74.4% | 12,180 | 122/164 |

##### داده‌های تحلیلی سری زمانی

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `csv` | 64.2% | 1,408 | 77/120 |
| `toon` | 63.3% | 1,595 | 76/120 |
| `json-compact` | 59.2% | 2,351 | 71/120 |
| `yaml` | 62.5% | 2,951 | 75/120 |
| `json-pretty` | 65.0% | 3,678 | 78/120 |
| `xml` | 62.5% | 4,386 | 75/120 |

##### ۱۰۰ مخزن برتر GitHub

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `toon` | 57.6% | 9,017 | 76/132 |
| `csv` | 54.5% | 8,726 | 72/132 |
| `json-compact` | 53.8% | 11,650 | 71/132 |
| `yaml` | 53.8% | 13,350 | 71/132 |
| `json-pretty` | 55.3% | 15,350 | 73/132 |
| `xml` | 53.8% | 17,304 | 71/132 |

##### لاگ رویدادهای نیمه‌یکنواخت

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `json-compact` | 56.7% | 4,793 | 68/120 |
| `toon` | 60.8% | 5,814 | 73/120 |
| `json-pretty` | 60.0% | 6,759 | 72/120 |
| `yaml` | 55.0% | 5,798 | 66/120 |
| `xml` | 50.8% | 7,668 | 61/120 |

##### پیکربندی عمیقاً تودرتو

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `json-compact` | 91.4% | 562 | 106/116 |
| `yaml` | 93.1% | 675 | 108/116 |
| `toon` | 91.4% | 669 | 106/116 |
| `json-pretty` | 94.8% | 918 | 110/116 |
| `xml` | 94.0% | 1,007 | 109/116 |

##### مجموعه‌داده کامل و معتبر (شاهد)

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `toon` | 100.0% | 566 | 4/4 |
| `json-compact` | 100.0% | 772 | 4/4 |
| `yaml` | 100.0% | 984 | 4/4 |
| `json-pretty` | 100.0% | 1,259 | 4/4 |
| `xml` | 0.0% | 1,441 | 0/4 |
| `csv` | 0.0% | 473 | 0/4 |

##### آرایهٔ کوتاه‌شده: ۳ ردیف از انتها حذف شده

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `csv` | 100.0% | 408 | 4/4 |
| `toon` | 100.0% | 498 | 4/4 |
| `xml` | 100.0% | 1,229 | 4/4 |
| `json-pretty` | 0.0% | 1,075 | 0/4 |
| `yaml` | 0.0% | 841 | 0/4 |
| `json-compact` | 0.0% | 660 | 0/4 |

##### ردیف‌های اضافه فراتر از طول اعلام‌شده

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `csv` | 100.0% | 547 | 4/4 |
| `toon` | 100.0% | 644 | 4/4 |
| `xml` | 100.0% | 1,663 | 4/4 |
| `json-pretty` | 0.0% | 1,452 | 0/4 |
| `yaml` | 0.0% | 1,135 | 0/4 |
| `json-compact` | 0.0% | 893 | 0/4 |

##### تعداد فیلد ناسازگار (نبودن salary در ردیف ۱۰)

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `csv` | 100.0% | 470 | 4/4 |
| `toon` | 100.0% | 563 | 4/4 |
| `json-compact` | 75.0% | 767 | 3/4 |
| `xml` | 100.0% | 1,432 | 4/4 |
| `yaml` | 75.0% | 977 | 3/4 |
| `json-pretty` | 75.0% | 1,251 | 3/4 |

##### فیلدهای الزامی گم‌شده (نبودن email در چند ردیف)

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `csv` | 100.0% | 442 | 4/4 |
| `toon` | 100.0% | 535 | 4/4 |
| `xml` | 100.0% | 1,386 | 4/4 |
| `yaml` | 75.0% | 941 | 3/4 |
| `json-pretty` | 75.0% | 1,207 | 3/4 |
| `json-compact` | 50.0% | 732 | 2/4 |

##### فلگ‌های ویژگی با کلید نام

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `toon` | 97.1% | 931 | 66/68 |
| `json-compact` | 94.1% | 1,264 | 64/68 |
| `yaml` | 92.6% | 1,443 | 63/68 |
| `json-pretty` | 95.6% | 1,873 | 65/68 |
| `xml` | 95.6% | 2,306 | 65/68 |

##### مخاطبین با گروه‌های تودرتوی آدرس و طرح

| قالب | دقت | توکن | درست/کل |
| --- | --- | --- | --- |
| `toon` | 94.4% | 1,444 | 68/72 |
| `json-compact` | 91.7% | 2,357 | 66/72 |
| `yaml` | 94.4% | 2,797 | 68/72 |
| `json-pretty` | 97.2% | 4,014 | 70/72 |
| `xml` | 98.6% | 4,534 | 71/72 |

</details>

#### پیکربندی اجرا

- **مدل‌های آزمون‌شده**: `claude-haiku-4-5-20251001`، `gemini-3.6-flash`، `gpt-5.4-nano`، `grok-4.5`
- **قالب‌های مقایسه‌شده**: TOON، JSON، XML، YAML، JSON compact، CSV
- **شمارش توکن**: با `gpt-tokenizer` و رمزگذاری `o200k_base` (توکنایزر GPT-5). ارائه‌دهندگان دیگر متفاوت توکن‌بندی می‌کنند؛ بنابراین شمارش مطلق به توکنایزر وابسته است، اما تفاوت‌های نسبی میان قالب‌ها از نظر جهت معتبر می‌مانند.
- **استدلال (reasoning)**: با `reasoning: 'none'` همگانی در AI SDK غیرفعال شده است (Gemini 3 حداقل روی «تفکر حداقلی» و `grok-4.5` روی `low` می‌ماند)
- **دمای نمونه‌برداری (temperature)**: تنظیم نشده (مدل‌ها از مقادیر پیش‌فرض خودشان استفاده می‌کنند)
- **مجموع ارزیابی‌ها**: ۲۴۴ پرسش × ۶ قالب × ۴ مدل = ۵٬۸۵۶ فراخوانی LLM

اینکه مجموعه‌داده‌ها چه چیزی دارند، پرسش‌ها چگونه تولید می‌شوند و پاسخ‌ها چگونه اعتبارسنجی می‌شوند، در [README بنچمارک](https://github.com/toon-format/toon/tree/main/benchmarks#retrieval-accuracy-benchmark) مستند شده است.

### کارآیی توکن

تعداد توکن‌ها با توکنایزر `o200k_base` در GPT-5 و از طریق [`gpt-tokenizer`](https://github.com/niieani/gpt-tokenizer) اندازه‌گیری شده است. صرفه‌جویی‌ها نسبت به JSON قالب‌بندی‌شده (تورفتگی ۲ فاصله‌ای) به‌عنوان خط پایهٔ اصلی محاسبه شده‌اند، با مقایسه‌های تکمیلی با JSON فشرده (minified)، YAML و XML. صرفه‌جویی واقعی بسته به مدل و توکنایزر فرق می‌کند.

بنچمارک‌ها مجموعه‌داده‌هایی با الگوهای ساختاری مختلف (یکنواخت، نیمه‌یکنواخت، تودرتو، عمیقاً تودرتو) را می‌آزمایند تا نشان دهند TOON کجا می‌درخشد و قالب‌های دیگر کجا بهتر عمل می‌کنند.

#### مسیر ساختار مختلط

مجموعه‌داده‌هایی با ساختار تودرتو یا نیمه‌یکنواخت. CSV کنار گذاشته شده، چون نمی‌تواند این ساختارها را به‌درستی نمایش دهد.

```
🛒 E-commerce orders with nested structures  ┊  Tabular: 33%
   │
   TOON                █████████████░░░░░░░    72,832 tokens
   ├─ vs JSON          (−32.9%)               108,611 tokens
   ├─ vs JSON compact  (+5.6%)                 68,944 tokens
   ├─ vs YAML          (−14.0%)                84,701 tokens
   └─ vs XML           (−40.4%)               122,119 tokens

🧾 Semi-uniform event logs  ┊  Tabular: 50%
   │
   TOON                █████████████████░░░   154,084 tokens
   ├─ vs JSON          (−15.0%)               181,201 tokens
   ├─ vs JSON compact  (+19.9%)               128,529 tokens
   ├─ vs YAML          (−0.8%)                155,397 tokens
   └─ vs XML           (−25.2%)               205,859 tokens

🧩 Deeply nested configuration  ┊  Tabular: 0%
   │
   TOON                █████████████░░░░░░░       589 tokens
   ├─ vs JSON          (−34.9%)                   905 tokens
   ├─ vs JSON compact  (+6.7%)                    552 tokens
   ├─ vs YAML          (−11.0%)                   662 tokens
   └─ vs XML           (−40.9%)                   997 tokens

📊 Feature flags keyed by name  ┊  Tabular: 100%
   │
   TOON                █████████░░░░░░░░░░░    10,503 tokens
   ├─ vs JSON          (−54.6%)                23,141 tokens
   ├─ vs JSON compact  (−32.8%)                15,635 tokens
   ├─ vs YAML          (−41.3%)                17,905 tokens
   └─ vs XML           (−63.3%)                28,655 tokens

📊 Contacts with nested address and plan groups  ┊  Tabular: 100%
   │
   TOON                ███████░░░░░░░░░░░░░    26,726 tokens
   ├─ vs JSON          (−66.5%)                79,779 tokens
   ├─ vs JSON compact  (−42.9%)                46,791 tokens
   ├─ vs YAML          (−51.8%)                55,475 tokens
   └─ vs XML           (−70.4%)                90,306 tokens

──────────────────────────────────── Total ────────────────────────────────────
   TOON                █████████████░░░░░░░   264,734 tokens
   ├─ vs JSON          (−32.7%)               393,637 tokens
   ├─ vs JSON compact  (+1.6%)                260,451 tokens
   ├─ vs YAML          (−15.7%)               314,140 tokens
   └─ vs XML           (−40.9%)               447,936 tokens
```

#### مسیر فقط تخت

مجموعه‌داده‌های تخت و کاملاً واجد شرایط قالب جدولی، جایی که CSV کاربرد دارد.

```
👥 Uniform employee records  ┊  Tabular: 100%
   │
   CSV                 ███████████████████░    47,153 tokens
   TOON                ████████████████████    49,978 tokens   (+6.0% vs CSV)
   ├─ vs JSON          (−60.7%)               127,061 tokens
   ├─ vs JSON compact  (−36.8%)                79,057 tokens
   ├─ vs YAML          (−50.0%)               100,054 tokens
   └─ vs XML           (−65.9%)               146,605 tokens

📈 Time-series analytics data  ┊  Tabular: 100%
   │
   CSV                 ██████████████████░░     8,383 tokens
   TOON                ████████████████████     9,115 tokens   (+8.7% vs CSV)
   ├─ vs JSON          (−59.0%)                22,245 tokens
   ├─ vs JSON compact  (−35.9%)                14,211 tokens
   ├─ vs YAML          (−49.0%)                17,858 tokens
   └─ vs XML           (−65.8%)                26,616 tokens

⭐ Top 100 GitHub repositories  ┊  Tabular: 100%
   │
   CSV                 ███████████████████░     8,711 tokens
   TOON                ████████████████████     8,937 tokens   (+2.6% vs CSV)
   ├─ vs JSON          (−41.7%)                15,337 tokens
   ├─ vs JSON compact  (−23.2%)                11,640 tokens
   ├─ vs YAML          (−33.0%)                13,337 tokens
   └─ vs XML           (−48.3%)                17,294 tokens

──────────────────────────────────── Total ────────────────────────────────────
   CSV                 ███████████████████░    64,247 tokens
   TOON                ████████████████████    68,030 tokens   (+5.9% vs CSV)
   ├─ vs JSON          (−58.7%)               164,643 tokens
   ├─ vs JSON compact  (−35.2%)               104,908 tokens
   ├─ vs YAML          (−48.2%)               131,249 tokens
   └─ vs XML           (−64.3%)               190,515 tokens
```

شمارش توکن‌ها با `gpt-tokenizer` و رمزگذاری `o200k_base` (توکنایزر GPT-5) انجام شده است. ارائه‌دهندگان دیگر متفاوت توکن‌بندی می‌کنند؛ بنابراین شمارش مطلق به توکنایزر وابسته است، اما تفاوت‌های نسبی میان قالب‌ها از نظر جهت معتبر می‌مانند.

<details>
<summary><strong>نمایش مثال‌های تفصیلی</strong></summary>

#### 📈 داده‌های تحلیلی سری زمانی

**صرفه‌جویی:** ۱۳٬۱۳۰ توکن (۵۹٫۰٪ کاهش نسبت به JSON)

**JSON** (۲۲٬۲۴۵ توکن):

```
{
  "metrics": [
    {
      "date": "2025-01-01",
      "views": 6138,
      "clicks": 174,
      "conversions": 12,
      "revenue": 2712.49,
      "bounceRate": 0.35
    },
    {
      "date": "2025-01-02",
      "views": 4616,
      "clicks": 274,
      "conversions": 34,
      "revenue": 9156.29,
      "bounceRate": 0.56
    },
    {
      "date": "2025-01-03",
      "views": 4460,
      "clicks": 143,
      "conversions": 8,
      "revenue": 1317.98,
      "bounceRate": 0.59
    },
    {
      "date": "2025-01-04",
      "views": 4740,
      "clicks": 125,
      "conversions": 13,
      "revenue": 2934.77,
      "bounceRate": 0.37
    },
    {
      "date": "2025-01-05",
      "views": 6428,
      "clicks": 369,
      "conversions": 19,
      "revenue": 1317.24,
      "bounceRate": 0.3
    }
  ]
}
```

**TOON** (۹٬۱۱۵ توکن):

```
metrics[5]{date,views,clicks,conversions,revenue,bounceRate}:
  2025-01-01,6138,174,12,2712.49,0.35
  2025-01-02,4616,274,34,9156.29,0.56
  2025-01-03,4460,143,8,1317.98,0.59
  2025-01-04,4740,125,13,2934.77,0.37
  2025-01-05,6428,369,19,1317.24,0.3
```

---

#### ⭐ ۱۰۰ مخزن برتر GitHub

**صرفه‌جویی:** ۶٬۴۰۰ توکن (۴۱٫۷٪ کاهش نسبت به JSON)

**JSON** (۱۵٬۳۳۷ توکن):

```
{
  "repositories": [
    {
      "id": 132750724,
      "name": "build-your-own-x",
      "repo": "codecrafters-io/build-your-own-x",
      "description": "Master programming by recreating your favorite technologies from scratch.",
      "createdAt": "2018-05-09T12:03:18Z",
      "updatedAt": "2026-07-23T18:57:15Z",
      "pushedAt": "2026-07-14T19:25:58Z",
      "stars": 530712,
      "watchers": 6778,
      "forks": 50205,
      "defaultBranch": "master"
    },
    {
      "id": 21737465,
      "name": "awesome",
      "repo": "sindresorhus/awesome",
      "description": "😎 Awesome lists about all kinds of interesting topics",
      "createdAt": "2014-07-11T13:42:37Z",
      "updatedAt": "2026-07-23T18:57:24Z",
      "pushedAt": "2026-06-30T18:21:16Z",
      "stars": 488074,
      "watchers": 8292,
      "forks": 36010,
      "defaultBranch": "main"
    },
    {
      "id": 28457823,
      "name": "freeCodeCamp",
      "repo": "freeCodeCamp/freeCodeCamp",
      "description": "freeCodeCamp.org's open-source codebase and curriculum. Learn math, programming,…",
      "createdAt": "2014-12-24T17:49:19Z",
      "updatedAt": "2026-07-22T07:01:33Z",
      "pushedAt": "2026-07-21T18:00:51Z",
      "stars": 452380,
      "watchers": 8590,
      "forks": 45624,
      "defaultBranch": "main"
    }
  ]
}
```

**TOON** (۸٬۹۳۷ توکن):

```
repositories[3]{id,name,repo,description,createdAt,updatedAt,pushedAt,stars,watchers,forks,defaultBranch}:
  132750724,build-your-own-x,codecrafters-io/build-your-own-x,Master programming by recreating your favorite technologies from scratch.,"2018-05-09T12:03:18Z","2026-07-23T18:57:15Z","2026-07-14T19:25:58Z",530712,6778,50205,master
  21737465,awesome,sindresorhus/awesome,😎 Awesome lists about all kinds of interesting topics,"2014-07-11T13:42:37Z","2026-07-23T18:57:24Z","2026-06-30T18:21:16Z",488074,8292,36010,main
  28457823,freeCodeCamp,freeCodeCamp/freeCodeCamp,"freeCodeCamp.org's open-source codebase and curriculum. Learn math, programming,…","2014-12-24T17:49:19Z","2026-07-22T07:01:33Z","2026-07-21T18:00:51Z",452380,8590,45624,main
```

</details>

<a id="installation--quick-start"></a>

## نصب و شروع سریع

```
# npm
npm install @toon-format/toon

# pnpm
pnpm add @toon-format/toon

# yarn
yarn add @toon-format/toon
```

برای اینکه [CLI](#cli) را به‌جای اجرا با `npx` همیشه در دسترس داشته باشید، آن را سراسری (global) نصب کنید:

```
npm install -g @toon-format/cli
```

**نمونهٔ استفاده:**

```
import { encode } from '@toon-format/toon'

const data = {
  users: [
    { id: 1, name: 'Ada', role: 'admin' },
    { id: 2, name: 'Bob', role: 'user' }
  ]
}

console.log(encode(data))
// users[2]{id,name,role}:
//   1,Ada,admin
//   2,Bob,user
```

**استریم مجموعه‌داده‌های بزرگ:**

```
import { encodeLines } from '@toon-format/toon'

const largeData = await fetchThousandsOfRecords()

// Memory-efficient streaming for large data
for (const line of encodeLines(largeData)) {
  process.stdout.write(`${line}\n`)
}
```

> [!TIP]
> برای APIهای رمزگشایی جریانی، به [`decodeFromLines()`](https://toonformat.dev/reference/api#decodefromlines-lines-options) و [`decodeStream()`](https://toonformat.dev/reference/api#decodestream-source-options) نگاه کنید.

**تبدیل مقادیر با replacer:**

```
import { encode } from '@toon-format/toon'

// Remove sensitive fields
const user = { name: 'Ada', password: 'secret', email: 'ada@example.com' }
const safe = encode(user, {
  replacer: (key, value) => key === 'password' ? undefined : value
})
// name: Ada
// email: ada@example.com
```

> [!TIP]
> تابع `replacer` کنترل دقیقی بر کدگذاری می‌دهد؛ شبیه replacer در `JSON.stringify` اما با ردیابی مسیر. برای نمونه‌های بیشتر، از جمله خروجی عیناً‌ثابت با [`rawString`](https://toonformat.dev/reference/api#raw-string-output)، [مرجع API](https://toonformat.dev/reference/api#replacer-function) را ببینید.

<a id="cli"></a>

## رابط خط فرمان (CLI)

ابزار خط فرمان برای تبدیل سریع JSON↔TOON، تحلیل توکن و یکپارچه‌سازی در خط لوله (pipeline). قالب را از پسوند فایل تشخیص می‌دهد، از جریان‌های stdin/stdout پشتیبانی می‌کند و گزینه‌های جداکننده (کاما، تب، پایپ) دارد که خوانایی را با توکن کمتر معاوضه می‌کنند.

```
# Encode JSON to TOON (auto-detected)
npx @toon-format/cli input.json -o output.toon

# Decode TOON to JSON (auto-detected)
npx @toon-format/cli data.toon -o output.json

# Pipe from stdin (no argument needed)
cat data.json | npx @toon-format/cli
echo '{"name": "Ada"}' | npx @toon-format/cli

# Output to stdout
npx @toon-format/cli input.json

# Show token savings
npx @toon-format/cli data.json --stats
```

> [!TIP]
> برای همهٔ گزینه‌ها، مثال‌ها و کاربردهای پیشرفته، [مستندات کامل CLI](https://toonformat.dev/cli/) را ببینید.

<a id="using-toon-with-llms"></a>

## استفاده از TOON با LLMها

TOON وقتی بهترین نتیجه را می‌دهد که قالب را نشان بدهید، نه اینکه توصیف کنید. وقتی مدل یک نمونهٔ جدولی ببیند، سرایند، یعنی طول `[N]` و فهرست فیلدهای `{fields}`، به او می‌گوید بقیه را چگونه بخواند. برای ورودی، داده را در بلوک‌های کد ` ```toon ` قرار دهید و هنگام درخواست تولید TOON از مدل، الگوی سرایند مورد انتظار را نشان دهید. جداکننده‌های تب صرفه‌جویی بیشتری در توکن می‌دهند. کامنت‌های تمام‌خطی که با `#` شروع می‌شوند هنگام رمزگشایی حذف می‌شوند؛ بنابراین داده‌های پرامپتی که دستی حاشیه‌نویسی شده‌اند، و خروجی مدل با خطوط توضیحی، همچنان تمیز رمزگشایی می‌شوند.

برای راهبردها، مثال‌ها و تکنیک‌های اعتبارسنجی، [راهنمای تفصیلی یکپارچه‌سازی با LLM](https://toonformat.dev/guide/llm-prompts) را دنبال کنید.

<a id="ecosystem"></a>

## اکوسیستم

**پلی‌گراندها (Playgrounds):** [پلی‌گراند رسمی](https://toonformat.dev/playground) JSON یا YAML را به‌صورت زنده به TOON تبدیل می‌کند، تعداد توکن‌ها را مقایسه می‌کند و امکان اشتراک آزمایش‌ها با URL را می‌دهد. جایگزین‌های جامعه: [Format Tokenization Playground](https://www.curiouslychase.com/playground/format-tokenization-exploration)، [TOON Tools](https://toontools.vercel.app/).

**ویرایشگرها:** افزونهٔ [TOON Language Support](https://marketplace.visualstudio.com/items?itemName=vishalraut.vscode-toon) برای VS Code (`code --install-extension vishalraut.vscode-toon`) هایلایت، اعتبارسنجی و تحلیل توکن اضافه می‌کند. [tree-sitter-toon](https://github.com/3swordman/tree-sitter-toon) Neovim، Helix، Emacs و Zed را پوشش می‌دهد؛ [toon.nvim](https://github.com/thalesgelinger/toon.nvim) جایگزینی بومی Lua است. در محیط‌های دیگر، هایلایت YAML تقریب خوبی است.

**ابزارها:** [Tooner](https://github.com/chaindead/tooner) یک پروکسی MCP است که پاسخ‌های ابزار در قالب JSON را به TOON تبدیل می‌کند.

<a id="documentation"></a>

## مستندات

### شروع کار

- [مقدمه و نصب](https://toonformat.dev/guide/getting-started): TOON چیست، چه زمانی استفاده شود، نخستین گام‌ها
- [نمای کلی قالب](https://toonformat.dev/guide/format-overview): نحو کامل همراه با مثال
- [بنچمارک‌ها](https://toonformat.dev/guide/benchmarks): نتایج دقت و کارآیی توکن

### ابزارها و یکپارچه‌سازی

- [CLI](https://toonformat.dev/cli/): ابزار خط فرمان برای تبدیل JSON↔TOON
- [پلی‌گراندها](https://toonformat.dev/ecosystem/tools-and-playgrounds): ابزارهای تعاملی
- [استفاده از TOON با LLMها](https://toonformat.dev/guide/llm-prompts): راهبردهای پرامپت‌نویسی و اعتبارسنجی

### مراجع

- [مرجع API](https://toonformat.dev/reference/api): API کدگذاری/رمزگشایی برای TypeScript/JavaScript
- [برگهٔ تقلب نحو](https://toonformat.dev/reference/syntax-cheatsheet): مرور سریع قالب
- [مشخصات (Specification)](https://github.com/toon-format/spec/blob/main/SPEC.md): قواعد هنجاری برای پیاده‌سازان
- [واژه‌نامه](https://github.com/toon-format/spec/blob/main/CONTEXT.md): یک نام برای هر مفهوم، برای مشارکت‌کنندگان و ابزارها

<a id="media-type--file-extension"></a>

## نوع رسانه و پسوند فایل

فایل‌های TOON از پسوند `.toon` و نوع رسانهٔ موقت `text/toon` استفاده می‌کنند. اسناد همیشه UTF-8 هستند؛ پارامتر `charset=utf-8` را می‌توان ذکر کرد اما در صورت نبودن، فرض می‌شود. برای جزئیات هنجاری [SPEC.md §17](https://github.com/toon-format/spec/blob/main/SPEC.md#17-iana-considerations) را ببینید.

<a id="other-implementations"></a>

## پیاده‌سازی‌های دیگر

TOON پیاده‌سازی‌های رسمی و جامعه‌ساخت در زبان‌های متعددی دارد، از جمله Python، Rust، Go، Java، Swift، .NET و بسیاری دیگر.

فهرست کامل پیاده‌سازی‌ها را در [مستندات](https://toonformat.dev/ecosystem/implementations) ببینید.

## قدردانی

- طراحی لوگو: [鈴木ックス (SZKX)](https://x.com/szkx_art)

## مجوز

مجوز [MIT](./LICENSE) © 2025 تاکنون، [Johann Schopplich](https://github.com/johannschopplich)

</div>
