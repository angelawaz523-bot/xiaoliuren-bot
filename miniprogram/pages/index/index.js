const API_BASE = "https://xiaoliuren-sage.vercel.app";
const LIU_REN = ["大安", "留连", "速喜", "赤口", "小吉", "空亡"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Page({
  data: {
    question: "",
    loading: false,
    result: null,
    ai: null,
    lunarMonth: "-",
    lunarDay: "-",
    chineseHour: "-",
    monthStopName: "-",
    dayStopName: "-",
    hourStopName: "-",
    monthBadgeText: "等待中",
    dayBadgeText: "等待中",
    hourBadgeText: "等待中",
    monthBadgeClass: "",
    dayBadgeClass: "",
    hourBadgeClass: "",
    pointerVisible: false,
    pointerLeft: 0,
    pointerTop: 0,
    bubbleVisible: false,
    bubbleLeft: 0,
    bubbleTop: 0,
    bubbleText: "",
    bubbleIsResult: false,
    segments: [
      { name: "大安", left: 150, top: 270, w: 90, h: 110, className: "" },
      { name: "留连", left: 150, top: 400, w: 90, h: 110, className: "" },
      { name: "速喜", left: 258, top: 230, w: 90, h: 130, className: "" },
      { name: "赤口", left: 258, top: 390, w: 90, h: 130, className: "" },
      { name: "小吉", left: 366, top: 210, w: 90, h: 140, className: "" },
      { name: "空亡", left: 366, top: 380, w: 90, h: 140, className: "" }
    ],
    segmentPositions: [
      { x: 170, y: 300, bubbleX: 150, bubbleY: 210 },
      { x: 170, y: 430, bubbleX: 150, bubbleY: 340 },
      { x: 278, y: 280, bubbleX: 260, bubbleY: 190 },
      { x: 278, y: 440, bubbleX: 260, bubbleY: 350 },
      { x: 386, y: 270, bubbleX: 370, bubbleY: 180 },
      { x: 386, y: 440, bubbleX: 370, bubbleY: 350 }
    ]
  },

  onInput(event) {
    this.setData({ question: event.detail.value });
  },

  async onDivine() {
    if (this.data.loading) return;
    const question = this.data.question.trim();
    if (!question) {
      wx.showToast({ title: "请先输入问题", icon: "none" });
      return;
    }
    this.setData({
      loading: true,
      result: null,
      ai: null
    });
    try {
      const response = await this.requestDivine(question);
      const payload = response.data;
      this.setData({
        lunarMonth: payload.lunar_month,
        lunarDay: payload.lunar_day,
        chineseHour: payload.chinese_hour,
        result: payload.result,
        ai: payload.ai_response
      });
      await this.playSteps(payload);
    } catch (error) {
      wx.showToast({ title: "请求失败，请稍后重试", icon: "none" });
    } finally {
      this.setData({ loading: false });
    }
  },

  requestDivine(question) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${API_BASE}/api/divine`,
        method: "POST",
        header: { "Content-Type": "application/json" },
        data: { question },
        success: (res) => {
          if (res.data && res.data.success) {
            resolve(res.data);
          } else {
            reject(new Error("bad response"));
          }
        },
        fail: reject
      });
    });
  },

  async playSteps(payload) {
    this.resetSegments();
    this.resetBubbles();
    this.setData({
      monthBadgeText: "计算中",
      monthBadgeClass: "calculating",
      dayBadgeText: "等待中",
      dayBadgeClass: "",
      hourBadgeText: "等待中",
      hourBadgeClass: "",
      monthStopName: "-",
      dayStopName: "-",
      hourStopName: "-"
    });
    await this.animateCount(payload.lunar_month, 0, "month-stop");
    this.setData({
      monthBadgeText: "完成",
      monthBadgeClass: "done",
      monthStopName: LIU_REN[payload.steps.month_step]
    });
    await sleep(300);
    this.setData({
      dayBadgeText: "计算中",
      dayBadgeClass: "calculating"
    });
    await this.animateCount(payload.lunar_day, payload.steps.month_step, "day-stop");
    this.setData({
      dayBadgeText: "完成",
      dayBadgeClass: "done",
      dayStopName: LIU_REN[payload.steps.day_step]
    });
    await sleep(300);
    this.setData({
      hourBadgeText: "计算中",
      hourBadgeClass: "calculating"
    });
    await this.animateCount(payload.chinese_hour, payload.steps.day_step, "hour-stop", true);
    this.setData({
      hourBadgeText: "完成",
      hourBadgeClass: "done",
      hourStopName: LIU_REN[payload.steps.final_index]
    });
    await sleep(200);
    this.resetBubbles();
  },

  async animateCount(count, startIndex, stopClass, isResult = false) {
    const total = Math.max(1, Number(count));
    let current = startIndex;
    for (let i = 1; i <= total; i += 1) {
      const index = current % LIU_REN.length;
      this.highlightSegment(index);
      this.movePointer(index);
      this.showBubble(index, i, isResult && i === total);
      await sleep(220);
      current = index + 1;
    }
    const stopIndex = (startIndex + total - 1) % LIU_REN.length;
    this.setSegmentClass(stopIndex, stopClass);
  },

  resetSegments() {
    const segments = this.data.segments.map((seg) => ({ ...seg, className: "" }));
    this.setData({ segments });
  },

  setSegmentClass(index, className) {
    const segments = this.data.segments.map((seg, idx) => {
      if (idx === index) {
        return { ...seg, className };
      }
      return seg;
    });
    this.setData({ segments });
  },

  highlightSegment(index) {
    const segments = this.data.segments.map((seg, idx) => {
      if (idx === index) {
        return { ...seg, className: "active" };
      }
      return { ...seg, className: "" };
    });
    this.setData({ segments });
  },

  movePointer(index) {
    const pos = this.data.segmentPositions[index];
    this.setData({
      pointerVisible: true,
      pointerLeft: pos.x,
      pointerTop: pos.y
    });
  },

  showBubble(index, text, isResult) {
    const pos = this.data.segmentPositions[index];
    this.setData({
      bubbleVisible: true,
      bubbleLeft: pos.bubbleX,
      bubbleTop: pos.bubbleY,
      bubbleText: String(text),
      bubbleIsResult: Boolean(isResult)
    });
  },

  resetBubbles() {
    this.setData({
      pointerVisible: false,
      bubbleVisible: false,
      bubbleIsResult: false,
      bubbleText: ""
    });
  }
});
