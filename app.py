import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
import dashscope
from dashscope import Generation

app = Flask(__name__, static_folder='static')
CORS(app)

DASHSCOPE_API_KEY = os.environ.get('DASHSCOPE_API_KEY')

LIU_REN = [
    {
        "name": "大安",
        "index": 0,
        "meaning": "大吉大利，诸事顺遂",
        "detail": "大安事事昌，求财在坤方，失物去不远，宅舍保平安。",
        "result": "能成",
        "color": "#4CAF50"
    },
    {
        "name": "留连",
        "index": 1,
        "meaning": "事情拖延，难以速成",
        "detail": "留连事难成，求谋日未明，官事只宜缓，去者未回程。",
        "result": "拖延",
        "color": "#FF9800"
    },
    {
        "name": "速喜",
        "index": 2,
        "meaning": "快速有喜，好事将近",
        "detail": "速喜喜来临，求财向南行，失物申未午，逢人路上寻。",
        "result": "能成",
        "color": "#2196F3"
    },
    {
        "name": "赤口",
        "index": 3,
        "meaning": "口舌是非，需防小人",
        "detail": "赤口主口舌，官非切要防，失物急去寻，行人有惊慌。",
        "result": "难成",
        "color": "#f44336"
    },
    {
        "name": "小吉",
        "index": 4,
        "meaning": "小有吉利，平稳顺利",
        "detail": "小吉最吉昌，路上好商量，阴人来报喜，失物在坤方。",
        "result": "能成",
        "color": "#8BC34A"
    },
    {
        "name": "空亡",
        "index": 5,
        "meaning": "诸事不宜，徒劳无功",
        "detail": "空亡事不祥，阴人多乖张，求财无利益，行人有灾殃。",
        "result": "难成",
        "color": "#9E9E9E"
    }
]

def get_lunar_date(solar_date):
    lunar_month = solar_date.month
    lunar_day = solar_date.day
    return lunar_month, lunar_day

def get_chinese_hour(hour):
    hour_mapping = [
        (23, 1), (1, 3), (3, 5), (5, 7), (7, 9), (9, 11),
        (11, 13), (13, 15), (15, 17), (17, 19), (19, 21), (21, 23)
    ]
    for i, (start, end) in enumerate(hour_mapping):
        if start <= hour < end or (start == 23 and (hour >= 23 or hour < 1)):
            return i + 1
    return 1

def calculate_xiaoliuren(month, day, hour):
    step1 = (month - 1) % 6
    step2 = (step1 + day - 1) % 6
    step3 = (step2 + hour - 1) % 6
    return step3

def generate_ai_response(question, result, time_info):
    if not DASHSCOPE_API_KEY:
        return {
            "analysis": f"根据小六壬推算，您所问之事得「{result['name']}」之象。{result['meaning']}。",
            "prediction": f"此事{result['result']}，{result['detail']}",
            "advice": "建议：顺其自然，把握时机。"
        }
    
    prompt = f"""你是一位精通小六壬占卜的大师。请根据以下信息，为求签者提供详细、个性化的解答。

【求签者问题】：{question}

【占卜时间】：{time_info}

【小六壬结果】：
- 神煞：{result['name']}
- 含义：{result['meaning']}
- 古诀：{result['detail']}
- 总体判断：{result['result']}

请用温暖、智慧的语言，从以下三个方面给出解答：

1. **卦象解析**：结合求签者的具体问题，解释这个卦象的含义（100-150字）

2. **事情预测**：预测事情的发展走向和可能的结果（100-150字）

3. **建议指引**：给出具体的行动建议和注意事项（80-120字）

请用JSON格式回复，格式如下：
{{
    "analysis": "卦象解析内容",
    "prediction": "事情预测内容", 
    "advice": "建议指引内容"
}}

注意：语言要亲切自然，避免过于玄奥，要结合求签者的具体问题来分析。"""

    try:
        dashscope.api_key = DASHSCOPE_API_KEY
        response = Generation.call(
            model='qwen-turbo',
            prompt=prompt,
            max_tokens=800,
            temperature=0.8
        )
        
        if response.status_code == 200:
            import json
            import re
            text = response.output.text
            json_match = re.search(r'\{[\s\S]*\}', text)
            if json_match:
                return json.loads(json_match.group())
    except Exception as e:
        print(f"AI generation error: {e}")
    
    return {
        "analysis": f"根据小六壬推算，您所问之事得「{result['name']}」之象。{result['meaning']}。",
        "prediction": f"此事{result['result']}，{result['detail']}",
        "advice": "建议：顺其自然，把握时机。"
    }

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/api/divine', methods=['POST'])
def divine():
    data = request.get_json()
    question = data.get('question', '')
    
    now = datetime.now()
    month, day = get_lunar_date(now)
    hour = get_chinese_hour(now.hour)
    
    result_index = calculate_xiaoliuren(month, day, hour)
    result = LIU_REN[result_index]
    
    time_info = f"农历{month}月{day}日第{hour}时辰"
    ai_response = generate_ai_response(question, result, time_info)
    
    response = {
        "success": True,
        "data": {
            "question": question,
            "time": now.strftime("%Y-%m-%d %H:%M:%S"),
            "lunar_month": month,
            "lunar_day": day,
            "chinese_hour": hour,
            "result": result,
            "ai_response": ai_response,
            "steps": {
                "month_step": (month - 1) % 6,
                "day_step": ((month - 1) % 6 + day - 1) % 6,
                "final_index": result_index
            }
        }
    }
    
    return jsonify(response)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
