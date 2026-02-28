const card = {
  msg_type: "interactive",
  card: {
    config: {
      wide_screen_mode: {
        enable: true,
      },
    },
    header: {
      title: {
        content: "✅ 报价已发出",
        tag: "plain_text",
      },
      template: "green",
    },
    elements: [
      {
        tag: "div",
        text: {
          content: "**产品：** Test Product\n**单价：** USD 88",
          tag: "lark_md",
        },
      },
      {
        tag: "action",
        actions: [
          {
            tag: "button",
            text: {
              content: "查看询盘",
              tag: "plain_text",
            },
            type: "primary",
            url: "realsourcing://inquiry/inq-004",
          },
        ],
      },
    ],
  },
};

const webhookUrl = "https://open.feishu.cn/open-apis/bot/v2/hook/b215f9aa-5a2f-4cfd-82a4-917e91edf6c9";

fetch(webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(card),
})
  .then((res) => res.json())
  .then((data) => {
    console.log("Feishu response:", JSON.stringify(data, null, 2));
  })
  .catch((err) => {
    console.error("Error:", err);
  });
